-- EVZIP Ops Console - Database Triggers
-- Run this in Supabase SQL Editor after schema and functions

-- ============================================
-- OVERLAP CHECK TRIGGER
-- Prevents overlapping active trips for same vehicle/driver
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
        );
        
        IF v_overlap_count > 0 THEN
            RAISE EXCEPTION 'Overlapping trip detected: Driver or vehicle already assigned to another active trip in this time range';
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER check_trip_overlap_trigger
    BEFORE INSERT OR UPDATE ON trips
    FOR EACH ROW
    EXECUTE FUNCTION check_trip_overlap();

-- ============================================
-- AUTO-CREATE TRIPS TRIGGER
-- Automatically create trip record when booking is created
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
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER auto_create_trip_subscription
    AFTER INSERT ON subscription_rides
    FOR EACH ROW
    EXECUTE FUNCTION auto_create_trip();

CREATE TRIGGER auto_create_trip_airport
    AFTER INSERT ON airport_bookings
    FOR EACH ROW
    EXECUTE FUNCTION auto_create_trip();

CREATE TRIGGER auto_create_trip_rental
    AFTER INSERT ON rental_bookings
    FOR EACH ROW
    EXECUTE FUNCTION auto_create_trip();

-- ============================================
-- SYNC STATUS TO TRIPS TRIGGER
-- Keep trips.status in sync with booking status
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
        (type = 'rental' AND ref_id = NEW.id AND TG_TABLE_NAME = 'rental_bookings')
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER sync_trip_status_subscription
    AFTER UPDATE OF status ON subscription_rides
    FOR EACH ROW
    WHEN (OLD.status IS DISTINCT FROM NEW.status)
    EXECUTE FUNCTION sync_trip_status();

CREATE TRIGGER sync_trip_status_airport
    AFTER UPDATE OF status ON airport_bookings
    FOR EACH ROW
    WHEN (OLD.status IS DISTINCT FROM NEW.status)
    EXECUTE FUNCTION sync_trip_status();

CREATE TRIGGER sync_trip_status_rental
    AFTER UPDATE OF status ON rental_bookings
    FOR EACH ROW
    WHEN (OLD.status IS DISTINCT FROM NEW.status)
    EXECUTE FUNCTION sync_trip_status();

-- ============================================
-- AUDIT LOG TRIGGER (for booking updates)
-- ============================================

CREATE OR REPLACE FUNCTION create_audit_log()
RETURNS TRIGGER AS $$
DECLARE
    v_diff JSONB;
    v_action VARCHAR(50);
    v_table_name VARCHAR(100);
BEGIN
    v_table_name := TG_TABLE_NAME;
    
    IF TG_OP = 'INSERT' THEN
        v_action := 'create';
        v_diff := jsonb_build_object('new', row_to_json(NEW));
        
    ELSIF TG_OP = 'UPDATE' THEN
        v_action := 'update';
        v_diff := jsonb_build_object(
            'old', row_to_json(OLD),
            'new', row_to_json(NEW)
        );
        
    ELSIF TG_OP = 'DELETE' THEN
        v_action := 'delete';
        v_diff := jsonb_build_object('old', row_to_json(OLD));
    END IF;
    
    -- Note: actor_user_id will be NULL for trigger-based logs
    -- Frontend should call advance_trip_status for status changes with actor info
    INSERT INTO audit_log (object, object_id, action, diff_json, at)
    VALUES (v_table_name, NEW.id, v_action, v_diff, NOW())
    ON CONFLICT DO NOTHING;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply audit triggers to booking tables (optional - can be handled by application)
-- Uncomment if you want automatic audit logging for all changes
/*
CREATE TRIGGER audit_subscription_rides
    AFTER INSERT OR UPDATE OR DELETE ON subscription_rides
    FOR EACH ROW
    EXECUTE FUNCTION create_audit_log();

CREATE TRIGGER audit_airport_bookings
    AFTER INSERT OR UPDATE OR DELETE ON airport_bookings
    FOR EACH ROW
    EXECUTE FUNCTION create_audit_log();

CREATE TRIGGER audit_rental_bookings
    AFTER INSERT OR UPDATE OR DELETE ON rental_bookings
    FOR EACH ROW
    EXECUTE FUNCTION create_audit_log();
*/

