-- Migration: Fix today_metrics to exclude soft-deleted rides
-- Run this in Supabase SQL Editor

-- ============================================
-- UPDATE TODAY METRICS FUNCTION TO EXCLUDE SOFT-DELETED RIDES
-- ============================================

-- Drop the existing function first to avoid return type conflicts
DROP FUNCTION IF EXISTS today_metrics(UUID, DATE);

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
                WHEN 'manual' THEN mr.pickup_at
            END as scheduled_time,
            CASE t.type
                WHEN 'subscription' THEN sr.fare
                WHEN 'airport' THEN ab.fare
                WHEN 'rental' THEN rb.fare
                WHEN 'manual' THEN mr.fare
            END as fare_amount,
            CASE t.type
                WHEN 'subscription' THEN COALESCE(sr.est_km, sr.actual_km, 0)
                WHEN 'airport' THEN COALESCE(ab.est_km, 0)
                WHEN 'rental' THEN COALESCE(rb.est_km, 0)
                WHEN 'manual' THEN COALESCE(mr.est_km, 0)
            END as km_amount
        FROM trips t
        LEFT JOIN subscription_rides sr ON t.type = 'subscription' AND t.ref_id = sr.id AND sr.deleted_at IS NULL
        LEFT JOIN airport_bookings ab ON t.type = 'airport' AND t.ref_id = ab.id AND ab.deleted_at IS NULL
        LEFT JOIN rental_bookings rb ON t.type = 'rental' AND t.ref_id = rb.id AND rb.deleted_at IS NULL
        LEFT JOIN manual_rides mr ON t.type = 'manual' AND t.ref_id = mr.id AND mr.deleted_at IS NULL
        WHERE (
            -- Filter by scheduled date (when ride actually happens), not booking date
            (t.type = 'subscription' AND DATE(sr.date) = p_date) OR
            (t.type = 'airport' AND DATE(ab.pickup_at) = p_date) OR
            (t.type = 'rental' AND DATE(rb.start_at) = p_date) OR
            (t.type = 'manual' AND DATE(mr.pickup_at) = p_date)
        )
        AND (
            p_hub_id IS NULL OR
            (t.type = 'subscription' AND EXISTS (SELECT 1 FROM subscriptions s WHERE s.id = sr.subscription_id AND s.hub_id = p_hub_id)) OR
            (t.type = 'airport' AND ab.hub_id = p_hub_id) OR
            (t.type = 'rental' AND rb.hub_id = p_hub_id) OR
            (t.type = 'manual' AND mr.hub_id = p_hub_id)
        )
        -- Exclude trips where the referenced ride is soft-deleted
        AND (
            (t.type = 'subscription' AND sr.id IS NOT NULL) OR
            (t.type = 'airport' AND ab.id IS NOT NULL) OR
            (t.type = 'rental' AND rb.id IS NOT NULL) OR
            (t.type = 'manual' AND mr.id IS NOT NULL)
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
                WHEN 'manual' THEN mr.pickup_at
            END as scheduled_time
        FROM trips t
        LEFT JOIN subscription_rides sr ON t.type = 'subscription' AND t.ref_id = sr.id AND sr.deleted_at IS NULL
        LEFT JOIN airport_bookings ab ON t.type = 'airport' AND t.ref_id = ab.id AND ab.deleted_at IS NULL
        LEFT JOIN rental_bookings rb ON t.type = 'rental' AND t.ref_id = rb.id AND rb.deleted_at IS NULL
        LEFT JOIN manual_rides mr ON t.type = 'manual' AND t.ref_id = mr.id AND mr.deleted_at IS NULL
        WHERE (
            (t.type = 'subscription' AND DATE(sr.date) = p_date + INTERVAL '1 day') OR
            (t.type = 'airport' AND DATE(ab.pickup_at) = p_date + INTERVAL '1 day') OR
            (t.type = 'rental' AND DATE(rb.start_at) = p_date + INTERVAL '1 day') OR
            (t.type = 'manual' AND DATE(mr.pickup_at) = p_date + INTERVAL '1 day')
        )
        AND (
            p_hub_id IS NULL OR
            (t.type = 'subscription' AND EXISTS (SELECT 1 FROM subscriptions s WHERE s.id = sr.subscription_id AND s.hub_id = p_hub_id)) OR
            (t.type = 'airport' AND ab.hub_id = p_hub_id) OR
            (t.type = 'rental' AND rb.hub_id = p_hub_id) OR
            (t.type = 'manual' AND mr.hub_id = p_hub_id)
        )
        -- Exclude trips where the referenced ride is soft-deleted
        AND (
            (t.type = 'subscription' AND sr.id IS NOT NULL) OR
            (t.type = 'airport' AND ab.id IS NOT NULL) OR
            (t.type = 'rental' AND rb.id IS NOT NULL) OR
            (t.type = 'manual' AND mr.id IS NOT NULL)
        )
    ),
    metrics AS (
        SELECT
            -- CHANGED: Only count 'enroute' status as active (not 'assigned')
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

