-- Migration: Add preferred days option to subscriptions
-- Run this in Supabase SQL Editor

-- ============================================
-- ADD PREFERRED DAYS FIELD
-- ============================================

ALTER TABLE subscriptions 
ADD COLUMN IF NOT EXISTS preferred_days VARCHAR(20) DEFAULT 'Mon-Sun' 
CHECK (preferred_days IN ('Mon-Fri', 'Mon-Sat', 'Mon-Sun'));

-- Update existing subscriptions to include all days by default
UPDATE subscriptions 
SET preferred_days = 'Mon-Sun' 
WHERE preferred_days IS NULL;

-- ============================================
-- UPDATE AUTO-GENERATE FUNCTION
-- Generate rides based on preferred_days selection
-- ============================================

CREATE OR REPLACE FUNCTION auto_generate_subscription_rides()
RETURNS TRIGGER AS $$
DECLARE
    v_current_date DATE;
    v_end_date DATE;
    v_pickup_time TIME;
    v_direction VARCHAR(50);
    v_day_of_week INTEGER;
    v_preferred_days VARCHAR(20);
BEGIN
    -- Only process if subscription is active and has an end_date
    IF NEW.status = 'active' AND NEW.end_date IS NOT NULL THEN
        -- Use pickup_time from subscription if available, otherwise default to 09:00
        v_pickup_time := COALESCE(NEW.pickup_time, '09:00:00'::TIME);
        
        -- Set end date
        v_end_date := NEW.end_date;
        
        -- Start from start_date
        v_current_date := NEW.start_date;
        
        -- Get preferred days (default to Mon-Sun if not set)
        v_preferred_days := COALESCE(NEW.preferred_days, 'Mon-Sun');
        
        -- Generate rides for each day from start_date to end_date
        WHILE v_current_date <= v_end_date LOOP
            -- Get day of week (0 = Sunday, 1 = Monday, ..., 6 = Saturday)
            v_day_of_week := EXTRACT(DOW FROM v_current_date);
            
            -- Skip days based on preferred_days selection
            -- 0 = Sunday, 6 = Saturday, 1-5 = Monday-Friday
            IF v_preferred_days = 'Mon-Fri' THEN
                -- Skip weekends (Sunday = 0, Saturday = 6)
                IF v_day_of_week = 0 OR v_day_of_week = 6 THEN
                    v_current_date := v_current_date + INTERVAL '1 day';
                    CONTINUE;
                END IF;
            ELSIF v_preferred_days = 'Mon-Sat' THEN
                -- Skip only Sunday (0)
                IF v_day_of_week = 0 THEN
                    v_current_date := v_current_date + INTERVAL '1 day';
                    CONTINUE;
                END IF;
            END IF;
            -- If 'Mon-Sun', include all days (no skipping)
            
            -- Create a subscription ride for this day
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
                'to_office', -- Default direction
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

-- ============================================
-- VERIFICATION QUERY
-- ============================================

-- Check subscriptions with their preferred days
SELECT 
    id,
    client_name,
    start_date,
    end_date,
    preferred_days,
    status
FROM subscriptions
ORDER BY created_at DESC
LIMIT 10;

