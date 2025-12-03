-- Migration: Add payment mode breakdown and KM details to daily_summary and weekly_summary functions
-- This adds columns for:
--   - Payment modes: Cash, UPI, and Others (revenue and count)
--   - KM details: Total KM and KM breakdown by trip type (subscription, airport, rental, manual)

-- ============================================
-- UPDATE DAILY SUMMARY FUNCTION
-- ============================================

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
    total_km NUMERIC,
    subscription_count BIGINT,
    subscription_revenue BIGINT,
    subscription_km NUMERIC,
    airport_count BIGINT,
    airport_revenue BIGINT,
    airport_km NUMERIC,
    rental_count BIGINT,
    rental_revenue BIGINT,
    rental_km NUMERIC,
    manual_count BIGINT,
    manual_revenue BIGINT,
    manual_km NUMERIC,
    cash_revenue BIGINT,
    upi_revenue BIGINT,
    others_revenue BIGINT,
    cash_count BIGINT,
    upi_count BIGINT,
    others_count BIGINT
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
            SUM(CASE 
                WHEN t.type = 'subscription' THEN COALESCE(sr.actual_km, sr.est_km, 0)
                WHEN t.type = 'airport' THEN COALESCE(ab.est_km, 0)
                WHEN t.type = 'rental' THEN COALESCE(rb.est_km, 0)
                WHEN t.type = 'manual' THEN COALESCE(mr.est_km, 0)
                ELSE 0
            END) as total_km,
            COUNT(*) FILTER (WHERE t.type = 'subscription') as sub_count,
            SUM(CASE WHEN t.type = 'subscription' THEN sr.fare ELSE 0 END) as sub_revenue,
            SUM(CASE WHEN t.type = 'subscription' THEN COALESCE(sr.actual_km, sr.est_km, 0) ELSE 0 END) as sub_km,
            COUNT(*) FILTER (WHERE t.type = 'airport') as airport_count,
            SUM(CASE WHEN t.type = 'airport' THEN ab.fare ELSE 0 END) as airport_revenue,
            SUM(CASE WHEN t.type = 'airport' THEN COALESCE(ab.est_km, 0) ELSE 0 END) as airport_km,
            COUNT(*) FILTER (WHERE t.type = 'rental') as rental_count,
            SUM(CASE WHEN t.type = 'rental' THEN rb.fare ELSE 0 END) as rental_revenue,
            SUM(CASE WHEN t.type = 'rental' THEN COALESCE(rb.est_km, 0) ELSE 0 END) as rental_km,
            COUNT(*) FILTER (WHERE t.type = 'manual') as manual_count,
            SUM(CASE WHEN t.type = 'manual' THEN mr.fare ELSE 0 END) as manual_revenue,
            SUM(CASE WHEN t.type = 'manual' THEN COALESCE(mr.est_km, 0) ELSE 0 END) as manual_km,
            -- Payment mode breakdown
            SUM(CASE 
                WHEN p.method = 'cash' THEN COALESCE(
                    CASE 
                        WHEN t.type = 'subscription' THEN sr.fare
                        WHEN t.type = 'airport' THEN ab.fare
                        WHEN t.type = 'rental' THEN rb.fare
                        WHEN t.type = 'manual' THEN mr.fare
                        ELSE 0
                    END, 0
                )
                ELSE 0
            END) as cash_revenue,
            SUM(CASE 
                WHEN p.method = 'upi' THEN COALESCE(
                    CASE 
                        WHEN t.type = 'subscription' THEN sr.fare
                        WHEN t.type = 'airport' THEN ab.fare
                        WHEN t.type = 'rental' THEN rb.fare
                        WHEN t.type = 'manual' THEN mr.fare
                        ELSE 0
                    END, 0
                )
                ELSE 0
            END) as upi_revenue,
            SUM(CASE 
                WHEN p.method NOT IN ('cash', 'upi') AND p.method IS NOT NULL THEN COALESCE(
                    CASE 
                        WHEN t.type = 'subscription' THEN sr.fare
                        WHEN t.type = 'airport' THEN ab.fare
                        WHEN t.type = 'rental' THEN rb.fare
                        WHEN t.type = 'manual' THEN mr.fare
                        ELSE 0
                    END, 0
                )
                ELSE 0
            END) as others_revenue,
            COUNT(*) FILTER (WHERE p.method = 'cash') as cash_count,
            COUNT(*) FILTER (WHERE p.method = 'upi') as upi_count,
            COUNT(*) FILTER (WHERE p.method NOT IN ('cash', 'upi') AND p.method IS NOT NULL) as others_count
        FROM trips t
        LEFT JOIN subscription_rides sr ON t.type = 'subscription' AND t.ref_id = sr.id
        LEFT JOIN airport_bookings ab ON t.type = 'airport' AND t.ref_id = ab.id
        LEFT JOIN rental_bookings rb ON t.type = 'rental' AND t.ref_id = rb.id
        LEFT JOIN manual_rides mr ON t.type = 'manual' AND t.ref_id = mr.id
        LEFT JOIN LATERAL (
            SELECT method 
            FROM payments 
            WHERE trip_id = t.id 
            AND status = 'completed'
            ORDER BY received_at DESC NULLS LAST, created_at DESC
            LIMIT 1
        ) p ON true
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
        COALESCE(dd.total_km, 0)::NUMERIC,
        COALESCE(dd.sub_count, 0)::BIGINT,
        COALESCE(dd.sub_revenue, 0)::BIGINT,
        COALESCE(dd.sub_km, 0)::NUMERIC,
        COALESCE(dd.airport_count, 0)::BIGINT,
        COALESCE(dd.airport_revenue, 0)::BIGINT,
        COALESCE(dd.airport_km, 0)::NUMERIC,
        COALESCE(dd.rental_count, 0)::BIGINT,
        COALESCE(dd.rental_revenue, 0)::BIGINT,
        COALESCE(dd.rental_km, 0)::NUMERIC,
        COALESCE(dd.manual_count, 0)::BIGINT,
        COALESCE(dd.manual_revenue, 0)::BIGINT,
        COALESCE(dd.manual_km, 0)::NUMERIC,
        COALESCE(dd.cash_revenue, 0)::BIGINT,
        COALESCE(dd.upi_revenue, 0)::BIGINT,
        COALESCE(dd.others_revenue, 0)::BIGINT,
        COALESCE(dd.cash_count, 0)::BIGINT,
        COALESCE(dd.upi_count, 0)::BIGINT,
        COALESCE(dd.others_count, 0)::BIGINT
    FROM date_series ds
    LEFT JOIN daily_data dd ON ds.report_date = dd.report_date
    ORDER BY ds.report_date;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- UPDATE WEEKLY SUMMARY FUNCTION
-- ============================================

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
    total_km NUMERIC,
    subscription_count BIGINT,
    subscription_revenue BIGINT,
    subscription_km NUMERIC,
    airport_count BIGINT,
    airport_revenue BIGINT,
    airport_km NUMERIC,
    rental_count BIGINT,
    rental_revenue BIGINT,
    rental_km NUMERIC,
    manual_count BIGINT,
    manual_revenue BIGINT,
    manual_km NUMERIC,
    cash_revenue BIGINT,
    upi_revenue BIGINT,
    others_revenue BIGINT,
    cash_count BIGINT,
    upi_count BIGINT,
    others_count BIGINT
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
        SUM(CASE 
            WHEN t.type = 'subscription' THEN COALESCE(sr.actual_km, sr.est_km, 0)
            WHEN t.type = 'airport' THEN COALESCE(ab.est_km, 0)
            WHEN t.type = 'rental' THEN COALESCE(rb.est_km, 0)
            WHEN t.type = 'manual' THEN COALESCE(mr.est_km, 0)
            ELSE 0
        END)::NUMERIC as total_km,
        COUNT(*) FILTER (WHERE t.type = 'subscription')::BIGINT as subscription_count,
        SUM(CASE WHEN t.type = 'subscription' THEN sr.fare ELSE 0 END)::BIGINT as subscription_revenue,
        SUM(CASE WHEN t.type = 'subscription' THEN COALESCE(sr.actual_km, sr.est_km, 0) ELSE 0 END)::NUMERIC as subscription_km,
        COUNT(*) FILTER (WHERE t.type = 'airport')::BIGINT as airport_count,
        SUM(CASE WHEN t.type = 'airport' THEN ab.fare ELSE 0 END)::BIGINT as airport_revenue,
        SUM(CASE WHEN t.type = 'airport' THEN COALESCE(ab.est_km, 0) ELSE 0 END)::NUMERIC as airport_km,
        COUNT(*) FILTER (WHERE t.type = 'rental')::BIGINT as rental_count,
        SUM(CASE WHEN t.type = 'rental' THEN rb.fare ELSE 0 END)::BIGINT as rental_revenue,
        SUM(CASE WHEN t.type = 'rental' THEN COALESCE(rb.est_km, 0) ELSE 0 END)::NUMERIC as rental_km,
        COUNT(*) FILTER (WHERE t.type = 'manual')::BIGINT as manual_count,
        SUM(CASE WHEN t.type = 'manual' THEN mr.fare ELSE 0 END)::BIGINT as manual_revenue,
        SUM(CASE WHEN t.type = 'manual' THEN COALESCE(mr.est_km, 0) ELSE 0 END)::NUMERIC as manual_km,
        -- Payment mode breakdown
        SUM(CASE 
            WHEN p.method = 'cash' THEN COALESCE(
                CASE 
                    WHEN t.type = 'subscription' THEN sr.fare
                    WHEN t.type = 'airport' THEN ab.fare
                    WHEN t.type = 'rental' THEN rb.fare
                    WHEN t.type = 'manual' THEN mr.fare
                    ELSE 0
                END, 0
            )
            ELSE 0
        END)::BIGINT as cash_revenue,
        SUM(CASE 
            WHEN p.method = 'upi' THEN COALESCE(
                CASE 
                    WHEN t.type = 'subscription' THEN sr.fare
                    WHEN t.type = 'airport' THEN ab.fare
                    WHEN t.type = 'rental' THEN rb.fare
                    WHEN t.type = 'manual' THEN mr.fare
                    ELSE 0
                END, 0
            )
            ELSE 0
        END)::BIGINT as upi_revenue,
        SUM(CASE 
            WHEN p.method NOT IN ('cash', 'upi') AND p.method IS NOT NULL THEN COALESCE(
                CASE 
                    WHEN t.type = 'subscription' THEN sr.fare
                    WHEN t.type = 'airport' THEN ab.fare
                    WHEN t.type = 'rental' THEN rb.fare
                    WHEN t.type = 'manual' THEN mr.fare
                    ELSE 0
                END, 0
            )
            ELSE 0
        END)::BIGINT as others_revenue,
        COUNT(*) FILTER (WHERE p.method = 'cash')::BIGINT as cash_count,
        COUNT(*) FILTER (WHERE p.method = 'upi')::BIGINT as upi_count,
        COUNT(*) FILTER (WHERE p.method NOT IN ('cash', 'upi') AND p.method IS NOT NULL)::BIGINT as others_count
    FROM trips t
    LEFT JOIN subscription_rides sr ON t.type = 'subscription' AND t.ref_id = sr.id
    LEFT JOIN airport_bookings ab ON t.type = 'airport' AND t.ref_id = ab.id
    LEFT JOIN rental_bookings rb ON t.type = 'rental' AND t.ref_id = rb.id
    LEFT JOIN manual_rides mr ON t.type = 'manual' AND t.ref_id = mr.id
    LEFT JOIN LATERAL (
        SELECT method 
        FROM payments 
        WHERE trip_id = t.id 
        AND status = 'completed'
        ORDER BY received_at DESC NULLS LAST, created_at DESC
        LIMIT 1
    ) p ON true
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

