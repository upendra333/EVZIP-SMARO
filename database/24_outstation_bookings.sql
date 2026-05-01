-- Migration: Outstation rides (same structure as rental_bookings, separate trip type)
-- Run after prior migrations (includes manual rides on trips CHECK).

CREATE TABLE IF NOT EXISTS outstation_bookings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    package_hours INTEGER NOT NULL,
    package_km INTEGER NOT NULL,
    start_at TIMESTAMP WITH TIME ZONE NOT NULL,
    end_at TIMESTAMP WITH TIME ZONE NOT NULL,
    pickup TEXT,
    drop TEXT,
    est_km DECIMAL(10, 2),
    extra_km_rate INTEGER,
    per_hour_rate INTEGER,
    fare INTEGER,
    status VARCHAR(50) DEFAULT 'created',
    driver_id UUID REFERENCES drivers(id) ON DELETE SET NULL,
    vehicle_id UUID REFERENCES vehicles(id) ON DELETE SET NULL,
    notes TEXT,
    hub_id UUID REFERENCES hubs(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_outstation_bookings_customer ON outstation_bookings(customer_id);
CREATE INDEX IF NOT EXISTS idx_outstation_bookings_start ON outstation_bookings(start_at);
CREATE INDEX IF NOT EXISTS idx_outstation_bookings_status ON outstation_bookings(status);
CREATE INDEX IF NOT EXISTS idx_outstation_bookings_hub ON outstation_bookings(hub_id);

ALTER TABLE trips DROP CONSTRAINT IF EXISTS trips_type_check;

ALTER TABLE trips ADD CONSTRAINT trips_type_check
    CHECK (type IN ('subscription', 'airport', 'rental', 'manual', 'outstation'));

CREATE OR REPLACE FUNCTION auto_create_trip()
RETURNS TRIGGER AS $$
DECLARE
    v_trip_id UUID;
BEGIN
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
    ELSIF TG_TABLE_NAME = 'outstation_bookings' THEN
        INSERT INTO trips (type, ref_id, status, created_at)
        VALUES ('outstation', NEW.id, NEW.status, NOW())
        RETURNING id INTO v_trip_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS auto_create_trip_outstation ON outstation_bookings;
CREATE TRIGGER auto_create_trip_outstation
    AFTER INSERT ON outstation_bookings
    FOR EACH ROW
    EXECUTE FUNCTION auto_create_trip();

CREATE OR REPLACE FUNCTION check_trip_overlap()
RETURNS TRIGGER AS $$
DECLARE
    v_driver_id UUID;
    v_vehicle_id UUID;
    v_start_time TIMESTAMP WITH TIME ZONE;
    v_end_time TIMESTAMP WITH TIME ZONE;
    v_overlap_count INTEGER;
BEGIN
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
    ELSIF NEW.type = 'outstation' THEN
        SELECT os.driver_id, os.vehicle_id, os.start_at, os.end_at
        INTO v_driver_id, v_vehicle_id, v_start_time, v_end_time
        FROM outstation_bookings os WHERE os.id = NEW.ref_id;
    ELSIF NEW.type = 'manual' THEN
        SELECT mr.driver_id, mr.vehicle_id, mr.pickup_at, mr.pickup_at + INTERVAL '2 hours'
        INTO v_driver_id, v_vehicle_id, v_start_time, v_end_time
        FROM manual_rides mr WHERE mr.id = NEW.ref_id;
    END IF;

    IF (v_driver_id IS NOT NULL OR v_vehicle_id IS NOT NULL)
       AND NEW.status IN ('assigned', 'enroute') THEN
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
            (t.type = 'outstation' AND EXISTS (
                SELECT 1 FROM outstation_bookings os2
                WHERE os2.id = t.ref_id
                AND (
                    (v_driver_id IS NOT NULL AND os2.driver_id = v_driver_id) OR
                    (v_vehicle_id IS NOT NULL AND os2.vehicle_id = v_vehicle_id)
                )
                AND (
                    (os2.start_at, os2.end_at)
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

CREATE OR REPLACE FUNCTION sync_trip_status()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE trips
    SET status = NEW.status
    WHERE (
        (type = 'subscription' AND ref_id = NEW.id AND TG_TABLE_NAME = 'subscription_rides') OR
        (type = 'airport' AND ref_id = NEW.id AND TG_TABLE_NAME = 'airport_bookings') OR
        (type = 'rental' AND ref_id = NEW.id AND TG_TABLE_NAME = 'rental_bookings') OR
        (type = 'manual' AND ref_id = NEW.id AND TG_TABLE_NAME = 'manual_rides') OR
        (type = 'outstation' AND ref_id = NEW.id AND TG_TABLE_NAME = 'outstation_bookings')
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS sync_trip_status_outstation ON outstation_bookings;
CREATE TRIGGER sync_trip_status_outstation
    AFTER UPDATE OF status ON outstation_bookings
    FOR EACH ROW
    WHEN (OLD.status IS DISTINCT FROM NEW.status)
    EXECUTE FUNCTION sync_trip_status();

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
                WHEN 'subscription' THEN sr.date::timestamp + INTERVAL '9 hours'
                WHEN 'airport' THEN ab.pickup_at
                WHEN 'rental' THEN rb.start_at
                WHEN 'outstation' THEN os.start_at
                WHEN 'manual' THEN mr.pickup_at
            END as scheduled_time,
            CASE t.type
                WHEN 'subscription' THEN sr.fare
                WHEN 'airport' THEN ab.fare
                WHEN 'rental' THEN rb.fare
                WHEN 'outstation' THEN os.fare
                WHEN 'manual' THEN mr.fare
            END as fare_amount,
            CASE t.type
                WHEN 'subscription' THEN COALESCE(sr.est_km, sr.actual_km, 0)
                WHEN 'airport' THEN COALESCE(ab.est_km, 0)
                WHEN 'rental' THEN COALESCE(rb.est_km, 0)
                WHEN 'outstation' THEN COALESCE(os.est_km, 0)
                WHEN 'manual' THEN COALESCE(mr.est_km, 0)
            END as km_amount
        FROM trips t
        LEFT JOIN subscription_rides sr ON t.type = 'subscription' AND t.ref_id = sr.id AND sr.deleted_at IS NULL
        LEFT JOIN airport_bookings ab ON t.type = 'airport' AND t.ref_id = ab.id AND ab.deleted_at IS NULL
        LEFT JOIN rental_bookings rb ON t.type = 'rental' AND t.ref_id = rb.id AND rb.deleted_at IS NULL
        LEFT JOIN outstation_bookings os ON t.type = 'outstation' AND t.ref_id = os.id AND os.deleted_at IS NULL
        LEFT JOIN manual_rides mr ON t.type = 'manual' AND t.ref_id = mr.id AND mr.deleted_at IS NULL
        WHERE (
            (t.type = 'subscription' AND DATE(sr.date) = p_date) OR
            (t.type = 'airport' AND DATE(ab.pickup_at) = p_date) OR
            (t.type = 'rental' AND DATE(rb.start_at) = p_date) OR
            (t.type = 'outstation' AND DATE(os.start_at) = p_date) OR
            (t.type = 'manual' AND DATE(mr.pickup_at) = p_date)
        )
        AND (
            p_hub_id IS NULL OR
            (t.type = 'subscription' AND EXISTS (SELECT 1 FROM subscriptions s WHERE s.id = sr.subscription_id AND s.hub_id = p_hub_id)) OR
            (t.type = 'airport' AND ab.hub_id = p_hub_id) OR
            (t.type = 'rental' AND rb.hub_id = p_hub_id) OR
            (t.type = 'outstation' AND os.hub_id = p_hub_id) OR
            (t.type = 'manual' AND mr.hub_id = p_hub_id)
        )
        AND (
            (t.type = 'subscription' AND sr.id IS NOT NULL) OR
            (t.type = 'airport' AND ab.id IS NOT NULL) OR
            (t.type = 'rental' AND rb.id IS NOT NULL) OR
            (t.type = 'outstation' AND os.id IS NOT NULL) OR
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
                WHEN 'outstation' THEN os.start_at
                WHEN 'manual' THEN mr.pickup_at
            END as scheduled_time
        FROM trips t
        LEFT JOIN subscription_rides sr ON t.type = 'subscription' AND t.ref_id = sr.id AND sr.deleted_at IS NULL
        LEFT JOIN airport_bookings ab ON t.type = 'airport' AND t.ref_id = ab.id AND ab.deleted_at IS NULL
        LEFT JOIN rental_bookings rb ON t.type = 'rental' AND t.ref_id = rb.id AND rb.deleted_at IS NULL
        LEFT JOIN outstation_bookings os ON t.type = 'outstation' AND t.ref_id = os.id AND os.deleted_at IS NULL
        LEFT JOIN manual_rides mr ON t.type = 'manual' AND t.ref_id = mr.id AND mr.deleted_at IS NULL
        WHERE (
            (t.type = 'subscription' AND DATE(sr.date) = p_date + INTERVAL '1 day') OR
            (t.type = 'airport' AND DATE(ab.pickup_at) = p_date + INTERVAL '1 day') OR
            (t.type = 'rental' AND DATE(rb.start_at) = p_date + INTERVAL '1 day') OR
            (t.type = 'outstation' AND DATE(os.start_at) = p_date + INTERVAL '1 day') OR
            (t.type = 'manual' AND DATE(mr.pickup_at) = p_date + INTERVAL '1 day')
        )
        AND (
            p_hub_id IS NULL OR
            (t.type = 'subscription' AND EXISTS (SELECT 1 FROM subscriptions s WHERE s.id = sr.subscription_id AND s.hub_id = p_hub_id)) OR
            (t.type = 'airport' AND ab.hub_id = p_hub_id) OR
            (t.type = 'rental' AND rb.hub_id = p_hub_id) OR
            (t.type = 'outstation' AND os.hub_id = p_hub_id) OR
            (t.type = 'manual' AND mr.hub_id = p_hub_id)
        )
        AND (
            (t.type = 'subscription' AND sr.id IS NOT NULL) OR
            (t.type = 'airport' AND ab.id IS NOT NULL) OR
            (t.type = 'rental' AND rb.id IS NOT NULL) OR
            (t.type = 'outstation' AND os.id IS NOT NULL) OR
            (t.type = 'manual' AND mr.id IS NOT NULL)
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
    SELECT * INTO v_trip FROM trips WHERE id = p_trip_id;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Trip not found');
    END IF;

    v_old_status := v_trip.status;
    v_ref_id := v_trip.ref_id;
    v_ref_table := v_trip.type;

    IF v_old_status = 'completed' AND p_new_status != 'completed' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Cannot change status of completed trip');
    END IF;

    IF p_new_status = 'enroute' AND (v_old_status != 'assigned') THEN
        RETURN jsonb_build_object('success', false, 'error', 'Can only move to enroute from assigned status');
    END IF;

    IF p_new_status = 'cancelled' AND p_cancel_reason IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Cancel reason required for cancellation');
    END IF;

    IF p_carry_forward AND (v_ref_table != 'subscription' OR p_new_status != 'cancelled') THEN
        RETURN jsonb_build_object('success', false, 'error', 'Carry forward is only available for subscription rides when canceling');
    END IF;

    IF v_ref_table = 'subscription' THEN
        SELECT driver_id, vehicle_id, subscription_id, direction, est_km
        INTO v_driver_id, v_vehicle_id, v_subscription_id, v_direction, v_est_km
        FROM subscription_rides WHERE id = v_ref_id;

        UPDATE subscription_rides
        SET status = p_new_status, updated_at = NOW()
        WHERE id = v_ref_id;

        IF p_carry_forward AND p_new_status = 'cancelled' THEN
            v_available_date := CURRENT_DATE + INTERVAL '1 day';
            v_max_check_date := CURRENT_DATE + INTERVAL '30 days';

            WHILE v_available_date <= v_max_check_date LOOP
                IF NOT EXISTS (
                    SELECT 1 FROM subscription_rides
                    WHERE subscription_id = v_subscription_id
                    AND date = v_available_date
                    AND direction = v_direction
                    AND deleted_at IS NULL
                ) THEN
                    EXIT;
                END IF;
                v_available_date := v_available_date + INTERVAL '1 day';
            END LOOP;

            IF v_available_date > v_max_check_date THEN
                v_available_date := CURRENT_DATE + INTERVAL '60 days';
            END IF;

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
        END IF;

    ELSIF v_ref_table = 'airport' THEN
        SELECT driver_id, vehicle_id INTO v_driver_id, v_vehicle_id
        FROM airport_bookings WHERE id = v_ref_id;
        UPDATE airport_bookings SET status = p_new_status, updated_at = NOW() WHERE id = v_ref_id;

    ELSIF v_ref_table = 'rental' THEN
        SELECT driver_id, vehicle_id INTO v_driver_id, v_vehicle_id
        FROM rental_bookings WHERE id = v_ref_id;
        UPDATE rental_bookings SET status = p_new_status, updated_at = NOW() WHERE id = v_ref_id;

    ELSIF v_ref_table = 'outstation' THEN
        SELECT driver_id, vehicle_id INTO v_driver_id, v_vehicle_id
        FROM outstation_bookings WHERE id = v_ref_id;
        UPDATE outstation_bookings SET status = p_new_status, updated_at = NOW() WHERE id = v_ref_id;

    ELSIF v_ref_table = 'manual' THEN
        SELECT driver_id, vehicle_id INTO v_driver_id, v_vehicle_id
        FROM manual_rides WHERE id = v_ref_id;
        UPDATE manual_rides SET status = p_new_status, updated_at = NOW() WHERE id = v_ref_id;
    END IF;

    IF p_new_status = 'enroute' AND (v_driver_id IS NULL OR v_vehicle_id IS NULL) THEN
        RETURN jsonb_build_object('success', false, 'error', 'Driver and vehicle must be assigned before moving to enroute');
    END IF;

    UPDATE trips
    SET
        status = p_new_status,
        cancel_reason = p_cancel_reason,
        started_at = CASE WHEN p_new_status = 'enroute' AND started_at IS NULL THEN NOW() ELSE started_at END,
        ended_at = CASE WHEN p_new_status IN ('completed', 'no_show', 'cancelled') THEN NOW() ELSE ended_at END
    WHERE id = p_trip_id;

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
    outstation_count BIGINT,
    outstation_revenue BIGINT,
    outstation_km NUMERIC,
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
            CASE 
                WHEN t.type = 'subscription' THEN sr.date
                WHEN t.type = 'airport' THEN DATE(ab.pickup_at)
                WHEN t.type = 'rental' THEN DATE(rb.start_at)
                WHEN t.type = 'outstation' THEN DATE(os.start_at)
                WHEN t.type = 'manual' THEN DATE(mr.pickup_at)
            END as report_date,
            COUNT(*) as total_rides,
            SUM(CASE 
                WHEN t.type = 'subscription' THEN sr.fare
                WHEN t.type = 'airport' THEN ab.fare
                WHEN t.type = 'rental' THEN rb.fare
                WHEN t.type = 'outstation' THEN os.fare
                WHEN t.type = 'manual' THEN mr.fare
                ELSE 0
            END) as total_revenue,
            SUM(CASE 
                WHEN t.type = 'subscription' THEN COALESCE(sr.actual_km, sr.est_km, 0)
                WHEN t.type = 'airport' THEN COALESCE(ab.est_km, 0)
                WHEN t.type = 'rental' THEN COALESCE(rb.est_km, 0)
                WHEN t.type = 'outstation' THEN COALESCE(os.est_km, 0)
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
            COUNT(*) FILTER (WHERE t.type = 'outstation') as outstation_count,
            SUM(CASE WHEN t.type = 'outstation' THEN os.fare ELSE 0 END) as outstation_revenue,
            SUM(CASE WHEN t.type = 'outstation' THEN COALESCE(os.est_km, 0) ELSE 0 END) as outstation_km,
            COUNT(*) FILTER (WHERE t.type = 'manual') as manual_count,
            SUM(CASE WHEN t.type = 'manual' THEN mr.fare ELSE 0 END) as manual_revenue,
            SUM(CASE WHEN t.type = 'manual' THEN COALESCE(mr.est_km, 0) ELSE 0 END) as manual_km,
            SUM(CASE 
                WHEN p.method = 'cash' THEN COALESCE(
                    CASE 
                        WHEN t.type = 'subscription' THEN sr.fare
                        WHEN t.type = 'airport' THEN ab.fare
                        WHEN t.type = 'rental' THEN rb.fare
                        WHEN t.type = 'outstation' THEN os.fare
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
                        WHEN t.type = 'outstation' THEN os.fare
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
                        WHEN t.type = 'outstation' THEN os.fare
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
        LEFT JOIN subscription_rides sr ON t.type = 'subscription' AND t.ref_id = sr.id AND sr.deleted_at IS NULL
        LEFT JOIN airport_bookings ab ON t.type = 'airport' AND t.ref_id = ab.id AND ab.deleted_at IS NULL
        LEFT JOIN rental_bookings rb ON t.type = 'rental' AND t.ref_id = rb.id AND rb.deleted_at IS NULL
        LEFT JOIN outstation_bookings os ON t.type = 'outstation' AND t.ref_id = os.id AND os.deleted_at IS NULL
        LEFT JOIN manual_rides mr ON t.type = 'manual' AND t.ref_id = mr.id AND mr.deleted_at IS NULL
        LEFT JOIN LATERAL (
            SELECT method 
            FROM payments 
            WHERE trip_id = t.id 
            AND status = 'completed'
            ORDER BY received_at DESC NULLS LAST, created_at DESC
            LIMIT 1
        ) p ON true
        WHERE (
            (t.type = 'subscription' AND sr.date BETWEEN p_from_date AND p_to_date) OR
            (t.type = 'airport' AND DATE(ab.pickup_at) BETWEEN p_from_date AND p_to_date) OR
            (t.type = 'rental' AND DATE(rb.start_at) BETWEEN p_from_date AND p_to_date) OR
            (t.type = 'outstation' AND DATE(os.start_at) BETWEEN p_from_date AND p_to_date) OR
            (t.type = 'manual' AND DATE(mr.pickup_at) BETWEEN p_from_date AND p_to_date)
        )
        AND (
            p_hub_id IS NULL OR
            (t.type = 'subscription' AND EXISTS (SELECT 1 FROM subscriptions s WHERE s.id = sr.subscription_id AND s.hub_id = p_hub_id)) OR
            (t.type = 'airport' AND ab.hub_id = p_hub_id) OR
            (t.type = 'rental' AND rb.hub_id = p_hub_id) OR
            (t.type = 'outstation' AND os.hub_id = p_hub_id) OR
            (t.type = 'manual' AND mr.hub_id = p_hub_id)
        )
        GROUP BY CASE 
            WHEN t.type = 'subscription' THEN sr.date
            WHEN t.type = 'airport' THEN DATE(ab.pickup_at)
            WHEN t.type = 'rental' THEN DATE(rb.start_at)
            WHEN t.type = 'outstation' THEN DATE(os.start_at)
            WHEN t.type = 'manual' THEN DATE(mr.pickup_at)
        END
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
        COALESCE(dd.outstation_count, 0)::BIGINT,
        COALESCE(dd.outstation_revenue, 0)::BIGINT,
        COALESCE(dd.outstation_km, 0)::NUMERIC,
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
    outstation_count BIGINT,
    outstation_revenue BIGINT,
    outstation_km NUMERIC,
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
        DATE_TRUNC('week', 
            CASE 
                WHEN t.type = 'subscription' THEN sr.date
                WHEN t.type = 'airport' THEN DATE(ab.pickup_at)
                WHEN t.type = 'rental' THEN DATE(rb.start_at)
                WHEN t.type = 'outstation' THEN DATE(os.start_at)
                WHEN t.type = 'manual' THEN DATE(mr.pickup_at)
            END
        )::DATE as week_start,
        (DATE_TRUNC('week', 
            CASE 
                WHEN t.type = 'subscription' THEN sr.date
                WHEN t.type = 'airport' THEN DATE(ab.pickup_at)
                WHEN t.type = 'rental' THEN DATE(rb.start_at)
                WHEN t.type = 'outstation' THEN DATE(os.start_at)
                WHEN t.type = 'manual' THEN DATE(mr.pickup_at)
            END
        ) + INTERVAL '6 days')::DATE as week_end,
        COUNT(*)::BIGINT as total_rides,
        SUM(CASE 
            WHEN t.type = 'subscription' THEN sr.fare
            WHEN t.type = 'airport' THEN ab.fare
            WHEN t.type = 'rental' THEN rb.fare
            WHEN t.type = 'outstation' THEN os.fare
            WHEN t.type = 'manual' THEN mr.fare
            ELSE 0
        END)::BIGINT as total_revenue,
        SUM(CASE 
            WHEN t.type = 'subscription' THEN COALESCE(sr.actual_km, sr.est_km, 0)
            WHEN t.type = 'airport' THEN COALESCE(ab.est_km, 0)
            WHEN t.type = 'rental' THEN COALESCE(rb.est_km, 0)
            WHEN t.type = 'outstation' THEN COALESCE(os.est_km, 0)
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
        COUNT(*) FILTER (WHERE t.type = 'outstation')::BIGINT as outstation_count,
        SUM(CASE WHEN t.type = 'outstation' THEN os.fare ELSE 0 END)::BIGINT as outstation_revenue,
        SUM(CASE WHEN t.type = 'outstation' THEN COALESCE(os.est_km, 0) ELSE 0 END)::NUMERIC as outstation_km,
        COUNT(*) FILTER (WHERE t.type = 'manual')::BIGINT as manual_count,
        SUM(CASE WHEN t.type = 'manual' THEN mr.fare ELSE 0 END)::BIGINT as manual_revenue,
        SUM(CASE WHEN t.type = 'manual' THEN COALESCE(mr.est_km, 0) ELSE 0 END)::NUMERIC as manual_km,
        SUM(CASE 
            WHEN p.method = 'cash' THEN COALESCE(
                CASE 
                    WHEN t.type = 'subscription' THEN sr.fare
                    WHEN t.type = 'airport' THEN ab.fare
                    WHEN t.type = 'rental' THEN rb.fare
                    WHEN t.type = 'outstation' THEN os.fare
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
                    WHEN t.type = 'outstation' THEN os.fare
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
                    WHEN t.type = 'outstation' THEN os.fare
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
    LEFT JOIN subscription_rides sr ON t.type = 'subscription' AND t.ref_id = sr.id AND sr.deleted_at IS NULL
    LEFT JOIN airport_bookings ab ON t.type = 'airport' AND t.ref_id = ab.id AND ab.deleted_at IS NULL
    LEFT JOIN rental_bookings rb ON t.type = 'rental' AND t.ref_id = rb.id AND rb.deleted_at IS NULL
    LEFT JOIN outstation_bookings os ON t.type = 'outstation' AND t.ref_id = os.id AND os.deleted_at IS NULL
    LEFT JOIN manual_rides mr ON t.type = 'manual' AND t.ref_id = mr.id AND mr.deleted_at IS NULL
    LEFT JOIN LATERAL (
        SELECT method 
        FROM payments 
        WHERE trip_id = t.id 
        AND status = 'completed'
        ORDER BY received_at DESC NULLS LAST, created_at DESC
        LIMIT 1
    ) p ON true
    WHERE (
        (t.type = 'subscription' AND sr.date BETWEEN p_from_date AND p_to_date) OR
        (t.type = 'airport' AND DATE(ab.pickup_at) BETWEEN p_from_date AND p_to_date) OR
        (t.type = 'rental' AND DATE(rb.start_at) BETWEEN p_from_date AND p_to_date) OR
        (t.type = 'outstation' AND DATE(os.start_at) BETWEEN p_from_date AND p_to_date) OR
        (t.type = 'manual' AND DATE(mr.pickup_at) BETWEEN p_from_date AND p_to_date)
    )
    AND (
        p_hub_id IS NULL OR
        (t.type = 'subscription' AND EXISTS (SELECT 1 FROM subscriptions s WHERE s.id = sr.subscription_id AND s.hub_id = p_hub_id)) OR
        (t.type = 'airport' AND ab.hub_id = p_hub_id) OR
        (t.type = 'rental' AND rb.hub_id = p_hub_id) OR
        (t.type = 'outstation' AND os.hub_id = p_hub_id) OR
        (t.type = 'manual' AND mr.hub_id = p_hub_id)
    )
    GROUP BY DATE_TRUNC('week', 
        CASE 
            WHEN t.type = 'subscription' THEN sr.date
            WHEN t.type = 'airport' THEN DATE(ab.pickup_at)
            WHEN t.type = 'rental' THEN DATE(rb.start_at)
            WHEN t.type = 'outstation' THEN DATE(os.start_at)
            WHEN t.type = 'manual' THEN DATE(mr.pickup_at)
        END
    )
    ORDER BY week_start;
END;
$$ LANGUAGE plpgsql;
