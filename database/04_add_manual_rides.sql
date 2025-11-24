-- Migration: Add Manual Rides Support
-- Run this in Supabase SQL Editor after running 01_schema.sql, 02_functions.sql, and 03_triggers.sql

-- ============================================
-- CREATE MANUAL_RIDES TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS manual_rides (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    pickup_at TIMESTAMP WITH TIME ZONE NOT NULL,
    pickup TEXT NOT NULL,
    drop TEXT NOT NULL,
    est_km DECIMAL(10, 2),
    fare INTEGER, -- in paise
    status VARCHAR(50) DEFAULT 'created', -- created, assigned, enroute, completed, no_show, cancelled
    driver_id UUID REFERENCES drivers(id) ON DELETE SET NULL,
    vehicle_id UUID REFERENCES vehicles(id) ON DELETE SET NULL,
    notes TEXT,
    hub_id UUID REFERENCES hubs(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE -- soft delete
);

-- ============================================
-- UPDATE TRIPS TABLE CHECK CONSTRAINT
-- ============================================

-- Drop the old constraint
ALTER TABLE trips DROP CONSTRAINT IF EXISTS trips_type_check;

-- Add new constraint with 'manual' included
ALTER TABLE trips ADD CONSTRAINT trips_type_check CHECK (type IN ('subscription', 'airport', 'rental', 'manual'));

-- ============================================
-- UPDATE AUTO-CREATE TRIPS FUNCTION
-- ============================================

CREATE OR REPLACE FUNCTION auto_create_trip()
RETURNS TRIGGER AS $$
DECLARE
    v_trip_id UUID;
BEGIN
    -- Determine trip type based on table
    IF TG_TABLE_NAME = 'subscription_rides' THEN
        INSERT INTO trips (type, ref_id, status, created_at)
        VALUES ('subscription', NEW.id, NEW.status, NOW())
        RETURNING id INTO v_trip_id;
        
    ELSIF TG_TABLE_NAME = 'airport_bookings' THEN
        INSERT INTO trips (type, ref_id, status, created_at)
        VALUES ('airport', NEW.id, NEW.status, NOW())
        RETURNING id INTO v_trip_id;
        
    ELSIF TG_TABLE_NAME = 'rental_bookings' THEN
        INSERT INTO trips (type, ref_id, status, created_at)
        VALUES ('rental', NEW.id, NEW.status, NOW())
        RETURNING id INTO v_trip_id;
        
    ELSIF TG_TABLE_NAME = 'manual_rides' THEN
        INSERT INTO trips (type, ref_id, status, created_at)
        VALUES ('manual', NEW.id, NEW.status, NOW())
        RETURNING id INTO v_trip_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for manual_rides
CREATE TRIGGER auto_create_trip_manual
    AFTER INSERT ON manual_rides
    FOR EACH ROW
    EXECUTE FUNCTION auto_create_trip();

-- ============================================
-- UPDATE CHECK TRIP OVERLAP FUNCTION
-- ============================================

CREATE OR REPLACE FUNCTION check_trip_overlap()
RETURNS TRIGGER AS $$
DECLARE
    v_driver_id UUID;
    v_vehicle_id UUID;
    v_start_time TIMESTAMP WITH TIME ZONE;
    v_end_time TIMESTAMP WITH TIME ZONE;
    v_overlap_count INTEGER;
BEGIN
    -- Get driver, vehicle, and time range based on trip type
    IF NEW.type = 'subscription' THEN
        SELECT sr.driver_id, sr.vehicle_id, sr.date::timestamp + INTERVAL '9 hours', sr.date::timestamp + INTERVAL '10 hours'
        INTO v_driver_id, v_vehicle_id, v_start_time, v_end_time
        FROM subscription_rides sr WHERE sr.id = NEW.ref_id;
        
    ELSIF NEW.type = 'airport' THEN
        SELECT ab.driver_id, ab.vehicle_id, ab.pickup_at, ab.pickup_at + INTERVAL '2 hours'
        INTO v_driver_id, v_vehicle_id, v_start_time, v_end_time
        FROM airport_bookings ab WHERE ab.id = NEW.ref_id;
        
    ELSIF NEW.type = 'rental' THEN
        SELECT rb.driver_id, rb.vehicle_id, rb.start_at, rb.end_at
        INTO v_driver_id, v_vehicle_id, v_start_time, v_end_time
        FROM rental_bookings rb WHERE rb.id = NEW.ref_id;
        
    ELSIF NEW.type = 'manual' THEN
        SELECT mr.driver_id, mr.vehicle_id, mr.pickup_at, mr.pickup_at + INTERVAL '2 hours'
        INTO v_driver_id, v_vehicle_id, v_start_time, v_end_time
        FROM manual_rides mr WHERE mr.id = NEW.ref_id;
    END IF;
    
    -- Only check if driver or vehicle is assigned and status is active
    IF (v_driver_id IS NOT NULL OR v_vehicle_id IS NOT NULL) 
       AND NEW.status IN ('assigned', 'enroute') THEN
        
        -- Check for overlapping trips
        SELECT COUNT(*) INTO v_overlap_count
        FROM trips t
        WHERE t.id != NEW.id
        AND t.status IN ('assigned', 'enroute')
        AND (
            (t.type = 'subscription' AND EXISTS (
                SELECT 1 FROM subscription_rides sr2 
                WHERE sr2.id = t.ref_id 
                AND (
                    (v_driver_id IS NOT NULL AND sr2.driver_id = v_driver_id) OR
                    (v_vehicle_id IS NOT NULL AND sr2.vehicle_id = v_vehicle_id)
                )
                AND (
                    (sr2.date::timestamp + INTERVAL '9 hours', sr2.date::timestamp + INTERVAL '10 hours') 
                    OVERLAPS (v_start_time, v_end_time)
                )
            ))
            OR
            (t.type = 'airport' AND EXISTS (
                SELECT 1 FROM airport_bookings ab2 
                WHERE ab2.id = t.ref_id 
                AND (
                    (v_driver_id IS NOT NULL AND ab2.driver_id = v_driver_id) OR
                    (v_vehicle_id IS NOT NULL AND ab2.vehicle_id = v_vehicle_id)
                )
                AND (
                    (ab2.pickup_at, ab2.pickup_at + INTERVAL '2 hours') 
                    OVERLAPS (v_start_time, v_end_time)
                )
            ))
            OR
            (t.type = 'rental' AND EXISTS (
                SELECT 1 FROM rental_bookings rb2 
                WHERE rb2.id = t.ref_id 
                AND (
                    (v_driver_id IS NOT NULL AND rb2.driver_id = v_driver_id) OR
                    (v_vehicle_id IS NOT NULL AND rb2.vehicle_id = v_vehicle_id)
                )
                AND (
                    (rb2.start_at, rb2.end_at) 
                    OVERLAPS (v_start_time, v_end_time)
                )
            ))
            OR
            (t.type = 'manual' AND EXISTS (
                SELECT 1 FROM manual_rides mr2 
                WHERE mr2.id = t.ref_id 
                AND (
                    (v_driver_id IS NOT NULL AND mr2.driver_id = v_driver_id) OR
                    (v_vehicle_id IS NOT NULL AND mr2.vehicle_id = v_vehicle_id)
                )
                AND (
                    (mr2.pickup_at, mr2.pickup_at + INTERVAL '2 hours') 
                    OVERLAPS (v_start_time, v_end_time)
                )
            ))
        );
        
        IF v_overlap_count > 0 THEN
            RAISE EXCEPTION 'Overlapping trip detected: Driver or vehicle already assigned to another active trip in this time range';
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- UPDATE SYNC TRIP STATUS FUNCTION
-- ============================================

CREATE OR REPLACE FUNCTION sync_trip_status()
RETURNS TRIGGER AS $$
BEGIN
    -- Update corresponding trip status
    UPDATE trips
    SET status = NEW.status
    WHERE (
        (type = 'subscription' AND ref_id = NEW.id AND TG_TABLE_NAME = 'subscription_rides') OR
        (type = 'airport' AND ref_id = NEW.id AND TG_TABLE_NAME = 'airport_bookings') OR
        (type = 'rental' AND ref_id = NEW.id AND TG_TABLE_NAME = 'rental_bookings') OR
        (type = 'manual' AND ref_id = NEW.id AND TG_TABLE_NAME = 'manual_rides')
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for manual_rides status sync
CREATE TRIGGER sync_trip_status_manual
    AFTER UPDATE OF status ON manual_rides
    FOR EACH ROW
    WHEN (OLD.status IS DISTINCT FROM NEW.status)
    EXECUTE FUNCTION sync_trip_status();

-- ============================================
-- UPDATE ADVANCE TRIP STATUS FUNCTION
-- ============================================

CREATE OR REPLACE FUNCTION advance_trip_status(
    p_trip_id UUID,
    p_new_status VARCHAR(50),
    p_actor_id UUID DEFAULT NULL,
    p_actor_name VARCHAR(255) DEFAULT NULL,
    p_cancel_reason TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_trip trips%ROWTYPE;
    v_old_status VARCHAR(50);
    v_ref_table VARCHAR(50);
    v_ref_id UUID;
    v_driver_id UUID;
    v_vehicle_id UUID;
    v_result JSONB;
BEGIN
    -- Get trip details
    SELECT * INTO v_trip FROM trips WHERE id = p_trip_id;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Trip not found');
    END IF;
    
    v_old_status := v_trip.status;
    v_ref_id := v_trip.ref_id;
    v_ref_table := v_trip.type;
    
    -- Validate status transition
    IF v_old_status = 'completed' AND p_new_status != 'completed' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Cannot change status of completed trip');
    END IF;
    
    IF p_new_status = 'enroute' AND (v_old_status != 'assigned') THEN
        RETURN jsonb_build_object('success', false, 'error', 'Can only move to enroute from assigned status');
    END IF;
    
    IF p_new_status = 'cancelled' AND p_cancel_reason IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Cancel reason required for cancellation');
    END IF;
    
    -- Get driver and vehicle from ref table
    IF v_ref_table = 'subscription' THEN
        SELECT driver_id, vehicle_id INTO v_driver_id, v_vehicle_id
        FROM subscription_rides WHERE id = v_ref_id;
        
        -- Update subscription_rides status
        UPDATE subscription_rides 
        SET status = p_new_status, updated_at = NOW()
        WHERE id = v_ref_id;
        
    ELSIF v_ref_table = 'airport' THEN
        SELECT driver_id, vehicle_id INTO v_driver_id, v_vehicle_id
        FROM airport_bookings WHERE id = v_ref_id;
        
        -- Update airport_bookings status
        UPDATE airport_bookings 
        SET status = p_new_status, updated_at = NOW()
        WHERE id = v_ref_id;
        
    ELSIF v_ref_table = 'rental' THEN
        SELECT driver_id, vehicle_id INTO v_driver_id, v_vehicle_id
        FROM rental_bookings WHERE id = v_ref_id;
        
        -- Update rental_bookings status
        UPDATE rental_bookings 
        SET status = p_new_status, updated_at = NOW()
        WHERE id = v_ref_id;
        
    ELSIF v_ref_table = 'manual' THEN
        SELECT driver_id, vehicle_id INTO v_driver_id, v_vehicle_id
        FROM manual_rides WHERE id = v_ref_id;
        
        -- Update manual_rides status
        UPDATE manual_rides 
        SET status = p_new_status, updated_at = NOW()
        WHERE id = v_ref_id;
    END IF;
    
    -- Check if enroute requires driver and vehicle
    IF p_new_status = 'enroute' AND (v_driver_id IS NULL OR v_vehicle_id IS NULL) THEN
        RETURN jsonb_build_object('success', false, 'error', 'Driver and vehicle must be assigned before moving to enroute');
    END IF;
    
    -- Update trips table
    UPDATE trips 
    SET 
        status = p_new_status,
        cancel_reason = p_cancel_reason,
        started_at = CASE WHEN p_new_status = 'enroute' AND started_at IS NULL THEN NOW() ELSE started_at END,
        ended_at = CASE WHEN p_new_status IN ('completed', 'no_show', 'cancelled') THEN NOW() ELSE ended_at END
    WHERE id = p_trip_id;
    
    -- Create audit log entry
    INSERT INTO audit_log (actor_user_id, actor_name, object, object_id, action, diff_json)
    VALUES (
        p_actor_id,
        p_actor_name,
        'trips',
        p_trip_id,
        'status_change',
        jsonb_build_object(
            'old_status', v_old_status,
            'new_status', p_new_status,
            'cancel_reason', p_cancel_reason
        )
    );
    
    RETURN jsonb_build_object('success', true, 'trip_id', p_trip_id, 'old_status', v_old_status, 'new_status', p_new_status);
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- CREATE INDEXES FOR MANUAL_RIDES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_manual_rides_pickup_at ON manual_rides(pickup_at);
CREATE INDEX IF NOT EXISTS idx_manual_rides_status ON manual_rides(status);
CREATE INDEX IF NOT EXISTS idx_manual_rides_driver ON manual_rides(driver_id);
CREATE INDEX IF NOT EXISTS idx_manual_rides_vehicle ON manual_rides(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_manual_rides_customer ON manual_rides(customer_id);
CREATE INDEX IF NOT EXISTS idx_manual_rides_hub ON manual_rides(hub_id);

-- ============================================
-- UPDATE DAILY SUMMARY FUNCTION
-- ============================================

-- Drop the existing function first
DROP FUNCTION IF EXISTS daily_summary(DATE, DATE, UUID);

CREATE OR REPLACE FUNCTION daily_summary(
    p_from_date DATE,
    p_to_date DATE,
    p_hub_id UUID DEFAULT NULL
)
RETURNS TABLE (
    report_date DATE,
    total_rides BIGINT,
    total_revenue BIGINT,
    subscription_count BIGINT,
    subscription_revenue BIGINT,
    airport_count BIGINT,
    airport_revenue BIGINT,
    rental_count BIGINT,
    rental_revenue BIGINT,
    manual_count BIGINT,
    manual_revenue BIGINT
) AS $$
BEGIN
    RETURN QUERY
    WITH date_series AS (
        SELECT generate_series(p_from_date, p_to_date, '1 day'::interval)::DATE as report_date
    ),
    daily_data AS (
        SELECT 
            DATE(t.created_at) as report_date,
            COUNT(*) as total_rides,
            SUM(CASE 
                WHEN t.type = 'subscription' THEN sr.fare
                WHEN t.type = 'airport' THEN ab.fare
                WHEN t.type = 'rental' THEN rb.fare
                WHEN t.type = 'manual' THEN mr.fare
                ELSE 0
            END) as total_revenue,
            COUNT(*) FILTER (WHERE t.type = 'subscription') as sub_count,
            SUM(CASE WHEN t.type = 'subscription' THEN sr.fare ELSE 0 END) as sub_revenue,
            COUNT(*) FILTER (WHERE t.type = 'airport') as airport_count,
            SUM(CASE WHEN t.type = 'airport' THEN ab.fare ELSE 0 END) as airport_revenue,
            COUNT(*) FILTER (WHERE t.type = 'rental') as rental_count,
            SUM(CASE WHEN t.type = 'rental' THEN rb.fare ELSE 0 END) as rental_revenue,
            COUNT(*) FILTER (WHERE t.type = 'manual') as manual_count,
            SUM(CASE WHEN t.type = 'manual' THEN mr.fare ELSE 0 END) as manual_revenue
        FROM trips t
        LEFT JOIN subscription_rides sr ON t.type = 'subscription' AND t.ref_id = sr.id
        LEFT JOIN airport_bookings ab ON t.type = 'airport' AND t.ref_id = ab.id
        LEFT JOIN rental_bookings rb ON t.type = 'rental' AND t.ref_id = rb.id
        LEFT JOIN manual_rides mr ON t.type = 'manual' AND t.ref_id = mr.id
        WHERE DATE(t.created_at) BETWEEN p_from_date AND p_to_date
        AND (
            p_hub_id IS NULL OR
            (t.type = 'subscription' AND EXISTS (SELECT 1 FROM subscriptions s WHERE s.id = sr.subscription_id AND s.hub_id = p_hub_id)) OR
            (t.type = 'airport' AND ab.hub_id = p_hub_id) OR
            (t.type = 'rental' AND rb.hub_id = p_hub_id) OR
            (t.type = 'manual' AND mr.hub_id = p_hub_id)
        )
        GROUP BY DATE(t.created_at)
    )
    SELECT 
        ds.report_date,
        COALESCE(dd.total_rides, 0)::BIGINT,
        COALESCE(dd.total_revenue, 0)::BIGINT,
        COALESCE(dd.sub_count, 0)::BIGINT,
        COALESCE(dd.sub_revenue, 0)::BIGINT,
        COALESCE(dd.airport_count, 0)::BIGINT,
        COALESCE(dd.airport_revenue, 0)::BIGINT,
        COALESCE(dd.rental_count, 0)::BIGINT,
        COALESCE(dd.rental_revenue, 0)::BIGINT,
        COALESCE(dd.manual_count, 0)::BIGINT,
        COALESCE(dd.manual_revenue, 0)::BIGINT
    FROM date_series ds
    LEFT JOIN daily_data dd ON ds.report_date = dd.report_date
    ORDER BY ds.report_date;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- UPDATE WEEKLY SUMMARY FUNCTION
-- ============================================

-- Drop the existing function first
DROP FUNCTION IF EXISTS weekly_summary(DATE, DATE, UUID);

CREATE OR REPLACE FUNCTION weekly_summary(
    p_from_date DATE,
    p_to_date DATE,
    p_hub_id UUID DEFAULT NULL
)
RETURNS TABLE (
    week_start DATE,
    week_end DATE,
    total_rides BIGINT,
    total_revenue BIGINT,
    subscription_count BIGINT,
    subscription_revenue BIGINT,
    airport_count BIGINT,
    airport_revenue BIGINT,
    rental_count BIGINT,
    rental_revenue BIGINT,
    manual_count BIGINT,
    manual_revenue BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        DATE_TRUNC('week', DATE(t.created_at))::DATE as week_start,
        (DATE_TRUNC('week', DATE(t.created_at)) + INTERVAL '6 days')::DATE as week_end,
        COUNT(*)::BIGINT as total_rides,
        SUM(CASE 
            WHEN t.type = 'subscription' THEN sr.fare
            WHEN t.type = 'airport' THEN ab.fare
            WHEN t.type = 'rental' THEN rb.fare
            WHEN t.type = 'manual' THEN mr.fare
            ELSE 0
        END)::BIGINT as total_revenue,
        COUNT(*) FILTER (WHERE t.type = 'subscription')::BIGINT as subscription_count,
        SUM(CASE WHEN t.type = 'subscription' THEN sr.fare ELSE 0 END)::BIGINT as subscription_revenue,
        COUNT(*) FILTER (WHERE t.type = 'airport')::BIGINT as airport_count,
        SUM(CASE WHEN t.type = 'airport' THEN ab.fare ELSE 0 END)::BIGINT as airport_revenue,
        COUNT(*) FILTER (WHERE t.type = 'rental')::BIGINT as rental_count,
        SUM(CASE WHEN t.type = 'rental' THEN rb.fare ELSE 0 END)::BIGINT as rental_revenue,
        COUNT(*) FILTER (WHERE t.type = 'manual')::BIGINT as manual_count,
        SUM(CASE WHEN t.type = 'manual' THEN mr.fare ELSE 0 END)::BIGINT as manual_revenue
    FROM trips t
    LEFT JOIN subscription_rides sr ON t.type = 'subscription' AND t.ref_id = sr.id
    LEFT JOIN airport_bookings ab ON t.type = 'airport' AND t.ref_id = ab.id
    LEFT JOIN rental_bookings rb ON t.type = 'rental' AND t.ref_id = rb.id
    LEFT JOIN manual_rides mr ON t.type = 'manual' AND t.ref_id = mr.id
    WHERE DATE(t.created_at) BETWEEN p_from_date AND p_to_date
    AND (
        p_hub_id IS NULL OR
        (t.type = 'subscription' AND EXISTS (SELECT 1 FROM subscriptions s WHERE s.id = sr.subscription_id AND s.hub_id = p_hub_id)) OR
        (t.type = 'airport' AND ab.hub_id = p_hub_id) OR
        (t.type = 'rental' AND rb.hub_id = p_hub_id) OR
        (t.type = 'manual' AND mr.hub_id = p_hub_id)
    )
    GROUP BY DATE_TRUNC('week', DATE(t.created_at))
    ORDER BY week_start;
END;
$$ LANGUAGE plpgsql;

