-- EVZIP Ops Console - Database Functions (RPCs)
-- Run this in Supabase SQL Editor after schema

-- ============================================
-- TODAY METRICS FUNCTION
-- ============================================

CREATE OR REPLACE FUNCTION today_metrics(
    p_hub_id UUID DEFAULT NULL,
    p_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE (
    active_trips BIGINT,
    due_next_60min BIGINT,
    due_today BIGINT,
    due_tomorrow BIGINT,
    delayed_trips BIGINT,
    on_time_percentage NUMERIC,
    cancelled_no_show BIGINT,
    total_rides_today BIGINT,
    total_km_today NUMERIC,
    total_revenue_today BIGINT
) AS $$
DECLARE
    v_now TIMESTAMP WITH TIME ZONE := NOW();
    v_next_hour TIMESTAMP WITH TIME ZONE := v_now + INTERVAL '60 minutes';
    v_today_start TIMESTAMP WITH TIME ZONE := p_date::timestamp;
    v_today_end TIMESTAMP WITH TIME ZONE := (p_date + INTERVAL '1 day')::timestamp;
    v_tomorrow_start TIMESTAMP WITH TIME ZONE := (p_date + INTERVAL '1 day')::timestamp;
    v_tomorrow_end TIMESTAMP WITH TIME ZONE := (p_date + INTERVAL '2 days')::timestamp;
BEGIN
    RETURN QUERY
    WITH today_trips AS (
        SELECT 
            t.id,
            t.status,
            t.type,
            t.ref_id,
            CASE t.type
                WHEN 'subscription' THEN sr.date::timestamp + INTERVAL '9 hours' -- example pickup time
                WHEN 'airport' THEN ab.pickup_at
                WHEN 'rental' THEN rb.start_at
            END as scheduled_time,
            CASE t.type
                WHEN 'subscription' THEN sr.fare
                WHEN 'airport' THEN ab.fare
                WHEN 'rental' THEN rb.fare
            END as fare_amount,
            CASE t.type
                WHEN 'subscription' THEN COALESCE(sr.est_km, sr.actual_km, 0)
                WHEN 'airport' THEN COALESCE(ab.est_km, 0)
                WHEN 'rental' THEN COALESCE(rb.est_km, 0)
            END as km_amount
        FROM trips t
        LEFT JOIN subscription_rides sr ON t.type = 'subscription' AND t.ref_id = sr.id
        LEFT JOIN airport_bookings ab ON t.type = 'airport' AND t.ref_id = ab.id
        LEFT JOIN rental_bookings rb ON t.type = 'rental' AND t.ref_id = rb.id
        WHERE (
            -- Filter by scheduled date (when ride actually happens), not booking date
            (t.type = 'subscription' AND DATE(sr.date) = p_date) OR
            (t.type = 'airport' AND DATE(ab.pickup_at) = p_date) OR
            (t.type = 'rental' AND DATE(rb.start_at) = p_date)
        )
        AND (
            p_hub_id IS NULL OR
            (t.type = 'subscription' AND EXISTS (SELECT 1 FROM subscriptions s WHERE s.id = sr.subscription_id AND s.hub_id = p_hub_id)) OR
            (t.type = 'airport' AND ab.hub_id = p_hub_id) OR
            (t.type = 'rental' AND rb.hub_id = p_hub_id)
        )
    ),
    tomorrow_trips AS (
        SELECT 
            t.id,
            t.status,
            CASE t.type
                WHEN 'subscription' THEN sr.date::timestamp + INTERVAL '9 hours'
                WHEN 'airport' THEN ab.pickup_at
                WHEN 'rental' THEN rb.start_at
            END as scheduled_time
        FROM trips t
        LEFT JOIN subscription_rides sr ON t.type = 'subscription' AND t.ref_id = sr.id
        LEFT JOIN airport_bookings ab ON t.type = 'airport' AND t.ref_id = ab.id
        LEFT JOIN rental_bookings rb ON t.type = 'rental' AND t.ref_id = rb.id
        WHERE (
            (t.type = 'subscription' AND DATE(sr.date) = p_date + INTERVAL '1 day') OR
            (t.type = 'airport' AND DATE(ab.pickup_at) = p_date + INTERVAL '1 day') OR
            (t.type = 'rental' AND DATE(rb.start_at) = p_date + INTERVAL '1 day')
        )
        AND (
            p_hub_id IS NULL OR
            (t.type = 'subscription' AND EXISTS (SELECT 1 FROM subscriptions s WHERE s.id = sr.subscription_id AND s.hub_id = p_hub_id)) OR
            (t.type = 'airport' AND ab.hub_id = p_hub_id) OR
            (t.type = 'rental' AND rb.hub_id = p_hub_id)
        )
    ),
    metrics AS (
        SELECT
            COUNT(*) FILTER (WHERE status = 'enroute') as active,
            COUNT(*) FILTER (WHERE scheduled_time BETWEEN v_now AND v_next_hour AND status IN ('created', 'assigned')) as due_soon,
            COUNT(*) FILTER (WHERE scheduled_time BETWEEN v_next_hour AND v_today_end AND status IN ('created', 'assigned')) as due_today,
            COUNT(*) FILTER (WHERE status IN ('cancelled', 'no_show')) as cancelled_noshow,
            COUNT(*) FILTER (WHERE scheduled_time < v_now AND status IN ('created', 'assigned', 'enroute')) as delayed,
            COUNT(*) as total,
            COALESCE(SUM(fare_amount), 0) as revenue,
            COALESCE(SUM(km_amount), 0) as total_km
        FROM today_trips
    ),
    tomorrow_metrics AS (
        SELECT
            COUNT(*) FILTER (WHERE scheduled_time BETWEEN v_tomorrow_start AND v_tomorrow_end AND status IN ('created', 'assigned')) as due_tomorrow
        FROM tomorrow_trips
    )
    SELECT
        m.active::BIGINT as active_trips,
        m.due_soon::BIGINT as due_next_60min,
        m.due_today::BIGINT as due_today,
        COALESCE(tm.due_tomorrow, 0)::BIGINT as due_tomorrow,
        m.delayed::BIGINT as delayed_trips,
        CASE 
            WHEN m.total > 0 THEN 
                ROUND((COUNT(*) FILTER (WHERE scheduled_time >= v_now OR status = 'completed')::NUMERIC / m.total::NUMERIC) * 100, 2)
            ELSE 0
        END as on_time_percentage,
        m.cancelled_noshow::BIGINT as cancelled_no_show,
        m.total::BIGINT as total_rides_today,
        ROUND(m.total_km::NUMERIC, 2) as total_km_today,
        m.revenue::BIGINT as total_revenue_today
    FROM today_trips, metrics m, tomorrow_metrics tm
    GROUP BY m.active, m.due_soon, m.due_today, tm.due_tomorrow, m.delayed, m.cancelled_noshow, m.total, m.total_km, m.revenue;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- ADVANCE TRIP STATUS FUNCTION
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
-- DAILY SUMMARY FUNCTION
-- ============================================

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
    rental_revenue BIGINT
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
                ELSE 0
            END) as total_revenue,
            COUNT(*) FILTER (WHERE t.type = 'subscription') as sub_count,
            SUM(CASE WHEN t.type = 'subscription' THEN sr.fare ELSE 0 END) as sub_revenue,
            COUNT(*) FILTER (WHERE t.type = 'airport') as airport_count,
            SUM(CASE WHEN t.type = 'airport' THEN ab.fare ELSE 0 END) as airport_revenue,
            COUNT(*) FILTER (WHERE t.type = 'rental') as rental_count,
            SUM(CASE WHEN t.type = 'rental' THEN rb.fare ELSE 0 END) as rental_revenue
        FROM trips t
        LEFT JOIN subscription_rides sr ON t.type = 'subscription' AND t.ref_id = sr.id
        LEFT JOIN airport_bookings ab ON t.type = 'airport' AND t.ref_id = ab.id
        LEFT JOIN rental_bookings rb ON t.type = 'rental' AND t.ref_id = rb.id
        WHERE DATE(t.created_at) BETWEEN p_from_date AND p_to_date
        AND (
            p_hub_id IS NULL OR
            (t.type = 'subscription' AND EXISTS (SELECT 1 FROM subscriptions s WHERE s.id = sr.subscription_id AND s.hub_id = p_hub_id)) OR
            (t.type = 'airport' AND ab.hub_id = p_hub_id) OR
            (t.type = 'rental' AND rb.hub_id = p_hub_id)
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
        COALESCE(dd.rental_revenue, 0)::BIGINT
    FROM date_series ds
    LEFT JOIN daily_data dd ON ds.report_date = dd.report_date
    ORDER BY ds.report_date;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- WEEKLY SUMMARY FUNCTION
-- ============================================

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
    rental_revenue BIGINT
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
            ELSE 0
        END)::BIGINT as total_revenue,
        COUNT(*) FILTER (WHERE t.type = 'subscription')::BIGINT as subscription_count,
        SUM(CASE WHEN t.type = 'subscription' THEN sr.fare ELSE 0 END)::BIGINT as subscription_revenue,
        COUNT(*) FILTER (WHERE t.type = 'airport')::BIGINT as airport_count,
        SUM(CASE WHEN t.type = 'airport' THEN ab.fare ELSE 0 END)::BIGINT as airport_revenue,
        COUNT(*) FILTER (WHERE t.type = 'rental')::BIGINT as rental_count,
        SUM(CASE WHEN t.type = 'rental' THEN rb.fare ELSE 0 END)::BIGINT as rental_revenue
    FROM trips t
    LEFT JOIN subscription_rides sr ON t.type = 'subscription' AND t.ref_id = sr.id
    LEFT JOIN airport_bookings ab ON t.type = 'airport' AND t.ref_id = ab.id
    LEFT JOIN rental_bookings rb ON t.type = 'rental' AND t.ref_id = rb.id
    WHERE DATE(t.created_at) BETWEEN p_from_date AND p_to_date
    AND (
        p_hub_id IS NULL OR
        (t.type = 'subscription' AND EXISTS (SELECT 1 FROM subscriptions s WHERE s.id = sr.subscription_id AND s.hub_id = p_hub_id)) OR
        (t.type = 'airport' AND ab.hub_id = p_hub_id) OR
        (t.type = 'rental' AND rb.hub_id = p_hub_id)
    )
    GROUP BY DATE_TRUNC('week', DATE(t.created_at))
    ORDER BY week_start;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- VALIDATE MANAGER PIN FUNCTION
-- ============================================

-- Store manager PIN hash in a config table (create separately or use Supabase secrets)
-- For MVP, using a simple approach with a config table

CREATE TABLE IF NOT EXISTS app_config (
    key VARCHAR(100) PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION validate_manager_pin(p_pin VARCHAR(255))
RETURNS BOOLEAN AS $$
DECLARE
    v_stored_hash TEXT;
BEGIN
    -- Get stored hash (in production, use proper hashing like bcrypt)
    -- For MVP, using simple comparison (NOT SECURE - replace with proper hashing)
    SELECT value INTO v_stored_hash 
    FROM app_config 
    WHERE key = 'manager_pin_hash';
    
    IF v_stored_hash IS NULL THEN
        -- Set default PIN hash (change this!)
        -- Default PIN: "manager123" (CHANGE IN PRODUCTION!)
        INSERT INTO app_config (key, value) 
        VALUES ('manager_pin_hash', 'manager123')
        ON CONFLICT (key) DO NOTHING;
        
        SELECT value INTO v_stored_hash 
        FROM app_config 
        WHERE key = 'manager_pin_hash';
    END IF;
    
    -- Simple comparison (REPLACE WITH PROPER HASHING IN PRODUCTION!)
    RETURN v_stored_hash = p_pin;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

