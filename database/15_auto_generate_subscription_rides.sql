-- Migration: Auto-generate subscription rides when subscription is created
-- Run this in Supabase SQL Editor

-- ============================================
-- AUTO-GENERATE SUBSCRIPTION RIDES TRIGGER
-- Creates subscription_rides for each day from start_date to end_date
-- ============================================

CREATE OR REPLACE FUNCTION auto_generate_subscription_rides()
RETURNS TRIGGER AS $$
DECLARE
    v_current_date DATE;
    v_end_date DATE;
    v_pickup_time TIME;
    v_direction VARCHAR(50);
BEGIN
    -- Only process if subscription is active and has an end_date
    IF NEW.status = 'active' AND NEW.end_date IS NOT NULL THEN
        -- Use pickup_time from subscription if available, otherwise default to 09:00
        v_pickup_time := COALESCE(NEW.pickup_time, '09:00:00'::TIME);
        
        -- Set end date
        v_end_date := NEW.end_date;
        
        -- Start from start_date
        v_current_date := NEW.start_date;
        
        -- Generate rides for each day from start_date to end_date
        WHILE v_current_date <= v_end_date LOOP
            -- Create a subscription ride for each day
            -- Default direction is 'to_office', but you can modify this logic
            -- For now, creating one ride per day with direction 'to_office'
            -- If you need both directions, you can create two rides per day
            
            INSERT INTO subscription_rides (
                subscription_id,
                date,
                direction,
                status,
                est_km,
                created_at,
                updated_at
            )
            VALUES (
                NEW.id,
                v_current_date,
                'to_office', -- Default direction, can be modified
                'created',
                NEW.distance_km,
                NOW(),
                NOW()
            )
            ON CONFLICT (subscription_id, date, direction) DO NOTHING;
            
            -- Move to next day
            v_current_date := v_current_date + INTERVAL '1 day';
        END LOOP;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-generate rides when subscription is created
CREATE TRIGGER auto_generate_subscription_rides_trigger
    AFTER INSERT ON subscriptions
    FOR EACH ROW
    WHEN (NEW.status = 'active' AND NEW.end_date IS NOT NULL)
    EXECUTE FUNCTION auto_generate_subscription_rides();

-- ============================================
-- UPDATE EXISTING SUBSCRIPTIONS
-- Generate rides for existing active subscriptions that don't have rides yet
-- ============================================

-- This will generate rides for any existing subscriptions
DO $$
DECLARE
    sub_record RECORD;
    v_current_date DATE;
    v_end_date DATE;
    v_pickup_time TIME;
BEGIN
    FOR sub_record IN 
        SELECT id, start_date, end_date, pickup_time, distance_km, status
        FROM subscriptions
        WHERE status = 'active' 
        AND end_date IS NOT NULL
        AND NOT EXISTS (
            SELECT 1 FROM subscription_rides 
            WHERE subscription_id = subscriptions.id
        )
    LOOP
        v_pickup_time := COALESCE(sub_record.pickup_time, '09:00:00'::TIME);
        v_end_date := sub_record.end_date;
        v_current_date := sub_record.start_date;
        
        WHILE v_current_date <= v_end_date LOOP
            INSERT INTO subscription_rides (
                subscription_id,
                date,
                direction,
                status,
                est_km,
                created_at,
                updated_at
            )
            VALUES (
                sub_record.id,
                v_current_date,
                'to_office',
                'created',
                sub_record.distance_km,
                NOW(),
                NOW()
            )
            ON CONFLICT (subscription_id, date, direction) DO NOTHING;
            
            v_current_date := v_current_date + INTERVAL '1 day';
        END LOOP;
    END LOOP;
END $$;

-- ============================================
-- VERIFICATION QUERY
-- ============================================

-- Check subscription rides generated
SELECT 
    s.id AS subscription_id,
    s.client_name,
    s.start_date,
    s.end_date,
    COUNT(sr.id) AS total_rides_generated,
    MIN(sr.date) AS first_ride_date,
    MAX(sr.date) AS last_ride_date
FROM subscriptions s
LEFT JOIN subscription_rides sr ON s.id = sr.subscription_id AND sr.deleted_at IS NULL
WHERE s.status = 'active'
GROUP BY s.id, s.client_name, s.start_date, s.end_date
ORDER BY s.created_at DESC
LIMIT 10;

