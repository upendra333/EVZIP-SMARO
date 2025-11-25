-- Migration: Add carry forward functionality for subscription rides
-- Run this in Supabase SQL Editor
--
-- This allows customers to cancel a subscription ride but still use it later
-- Useful for subscriptions charged by total trips instead of time

-- ============================================
-- ADD CARRY FORWARD FIELDS
-- ============================================

ALTER TABLE subscription_rides 
ADD COLUMN IF NOT EXISTS carried_forward BOOLEAN DEFAULT FALSE;

ALTER TABLE subscription_rides 
ADD COLUMN IF NOT EXISTS carried_forward_from_ride_id UUID REFERENCES subscription_rides(id) ON DELETE SET NULL;

-- Add index for faster queries on carried forward rides
CREATE INDEX IF NOT EXISTS idx_subscription_rides_carried_forward 
ON subscription_rides(carried_forward, subscription_id) 
WHERE carried_forward = TRUE;

-- ============================================
-- UPDATE ADVANCE_TRIP_STATUS FUNCTION
-- Add support for carry forward option
-- ============================================

CREATE OR REPLACE FUNCTION advance_trip_status(
    p_trip_id UUID,
    p_new_status VARCHAR(50),
    p_actor_id UUID DEFAULT NULL,
    p_actor_name VARCHAR(255) DEFAULT NULL,
    p_cancel_reason TEXT DEFAULT NULL,
    p_carry_forward BOOLEAN DEFAULT FALSE
)
RETURNS JSONB AS $$
DECLARE
    v_trip trips%ROWTYPE;
    v_old_status VARCHAR(50);
    v_ref_table VARCHAR(50);
    v_ref_id UUID;
    v_driver_id UUID;
    v_vehicle_id UUID;
    v_subscription_id UUID;
    v_direction VARCHAR(50);
    v_est_km DECIMAL(10, 2);
    v_carried_forward_ride_id UUID;
    v_result JSONB;
    v_available_date DATE;
    v_max_check_date DATE;
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
    
    -- Carry forward only allowed for subscription rides when canceling
    IF p_carry_forward AND (v_ref_table != 'subscription' OR p_new_status != 'cancelled') THEN
        RETURN jsonb_build_object('success', false, 'error', 'Carry forward is only available for subscription rides when canceling');
    END IF;
    
    -- Get driver and vehicle from ref table
    IF v_ref_table = 'subscription' THEN
        SELECT driver_id, vehicle_id, subscription_id, direction, est_km 
        INTO v_driver_id, v_vehicle_id, v_subscription_id, v_direction, v_est_km
        FROM subscription_rides WHERE id = v_ref_id;
        
        -- Update subscription_rides status
        UPDATE subscription_rides 
        SET status = p_new_status, updated_at = NOW()
        WHERE id = v_ref_id;
        
        -- If carry forward is requested, create a new carried forward ride
        IF p_carry_forward AND p_new_status = 'cancelled' THEN
            -- Find an available date for the carried forward ride
            -- Start from tomorrow and find the first date that doesn't have a ride for this subscription/direction
            v_available_date := CURRENT_DATE + INTERVAL '1 day';
            v_max_check_date := CURRENT_DATE + INTERVAL '30 days'; -- Check up to 30 days ahead
            
            -- Find first available date that doesn't conflict
            WHILE v_available_date <= v_max_check_date LOOP
                -- Check if a ride already exists for this subscription, date, and direction
                IF NOT EXISTS (
                    SELECT 1 FROM subscription_rides 
                    WHERE subscription_id = v_subscription_id 
                    AND date = v_available_date 
                    AND direction = v_direction
                    AND deleted_at IS NULL
                ) THEN
                    EXIT; -- Found available date
                END IF;
                v_available_date := v_available_date + INTERVAL '1 day';
            END LOOP;
            
            -- If no date found in 30 days, use a date far in the future (user can change it)
            IF v_available_date > v_max_check_date THEN
                v_available_date := CURRENT_DATE + INTERVAL '60 days';
            END IF;
            
            -- Create a new subscription ride with carried_forward flag
            INSERT INTO subscription_rides (
                subscription_id,
                date,
                direction,
                status,
                est_km,
                carried_forward,
                carried_forward_from_ride_id,
                notes,
                created_at,
                updated_at
            )
            VALUES (
                v_subscription_id,
                v_available_date,
                v_direction,
                'created',
                v_est_km,
                TRUE,
                v_ref_id,
                COALESCE('Carried forward from cancelled ride. ' || p_cancel_reason, 'Carried forward from cancelled ride'),
                NOW(),
                NOW()
            )
            RETURNING id INTO v_carried_forward_ride_id;
            
            -- Note: Trip will be automatically created by the auto_create_trip_subscription trigger
            -- No need to manually create it here
        END IF;
        
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
            'cancel_reason', p_cancel_reason,
            'carry_forward', p_carry_forward,
            'carried_forward_ride_id', v_carried_forward_ride_id
        )
    );
    
    RETURN jsonb_build_object(
        'success', true, 
        'trip_id', p_trip_id, 
        'old_status', v_old_status, 
        'new_status', p_new_status,
        'carried_forward_ride_id', v_carried_forward_ride_id
    );
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- VERIFICATION QUERY
-- ============================================

-- Check subscription rides with carry forward status
SELECT 
    sr.id,
    sr.date,
    sr.direction,
    sr.status,
    sr.carried_forward,
    sr.carried_forward_from_ride_id,
    customers.name as customer_name
FROM subscription_rides sr
JOIN subscriptions s ON sr.subscription_id = s.id
LEFT JOIN customers ON s.customer_id = customers.id
WHERE sr.carried_forward = TRUE
ORDER BY sr.created_at DESC
LIMIT 10;
