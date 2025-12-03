-- Create a sample past incomplete booking for testing
-- This script creates a subscription ride from yesterday with 'enroute' status

DO $$
DECLARE
    v_customer_id UUID;
    v_subscription_id UUID;
    v_subscription_ride_id UUID;
    v_trip_id UUID;
    v_driver_id UUID;
    v_vehicle_id UUID;
    v_hub_id UUID;
    v_yesterday DATE;
BEGIN
    -- Set yesterday's date
    v_yesterday := CURRENT_DATE - INTERVAL '1 day';
    
    -- Get or create a test customer
    SELECT id INTO v_customer_id FROM customers WHERE phone = '9999999999' LIMIT 1;
    
    IF v_customer_id IS NULL THEN
        INSERT INTO customers (name, phone)
        VALUES ('Test Customer (Past Incomplete)', '9999999999')
        RETURNING id INTO v_customer_id;
    END IF;
    
    -- Get a hub (use first available hub)
    SELECT id INTO v_hub_id FROM hubs LIMIT 1;
    
    -- Get a driver that doesn't have overlapping active trips at yesterday's time
    -- Check for drivers without active trips (assigned/enroute) at the test time
    SELECT d.id INTO v_driver_id 
    FROM drivers d
    WHERE d.status = 'active'
    AND NOT EXISTS (
        SELECT 1 
        FROM trips t
        JOIN subscription_rides sr ON t.type = 'subscription' AND t.ref_id = sr.id
        WHERE sr.driver_id = d.id
        AND t.status IN ('assigned', 'enroute')
        AND (sr.date::timestamp + INTERVAL '9 hours', sr.date::timestamp + INTERVAL '10 hours')
            OVERLAPS ((v_yesterday::timestamp + INTERVAL '9 hours'), (v_yesterday::timestamp + INTERVAL '10 hours'))
    )
    LIMIT 1;
    
    -- Get a vehicle that doesn't have overlapping active trips at yesterday's time
    SELECT v.id INTO v_vehicle_id 
    FROM vehicles v
    WHERE v.status = 'available'
    AND NOT EXISTS (
        SELECT 1 
        FROM trips t
        JOIN subscription_rides sr ON t.type = 'subscription' AND t.ref_id = sr.id
        WHERE sr.vehicle_id = v.id
        AND t.status IN ('assigned', 'enroute')
        AND (sr.date::timestamp + INTERVAL '9 hours', sr.date::timestamp + INTERVAL '10 hours')
            OVERLAPS ((v_yesterday::timestamp + INTERVAL '9 hours'), (v_yesterday::timestamp + INTERVAL '10 hours'))
    )
    LIMIT 1;
    
    -- If no driver/vehicle found without overlaps, use first available (might still work if no trips exist)
    IF v_driver_id IS NULL THEN
        SELECT id INTO v_driver_id FROM drivers WHERE status = 'active' LIMIT 1;
    END IF;
    
    IF v_vehicle_id IS NULL THEN
        SELECT id INTO v_vehicle_id FROM vehicles WHERE status = 'available' LIMIT 1;
    END IF;
    
    -- Create a subscription if needed
    SELECT id INTO v_subscription_id 
    FROM subscriptions 
    WHERE customer_id = v_customer_id 
    AND hub_id = COALESCE(v_hub_id, (SELECT id FROM hubs LIMIT 1))
    LIMIT 1;
    
    IF v_subscription_id IS NULL THEN
        INSERT INTO subscriptions (
            customer_id,
            hub_id,
            start_date,
            pickup,
            drop,
            distance_km,
            status
        )
        VALUES (
            v_customer_id,
            COALESCE(v_hub_id, (SELECT id FROM hubs LIMIT 1)),
            v_yesterday - INTERVAL '30 days',
            'Test Pickup Location',
            'Test Drop Location',
            25.5,
            'active'
        )
        RETURNING id INTO v_subscription_id;
    END IF;
    
    -- Create a subscription ride for yesterday with 'assigned' status (incomplete)
    -- Using 'assigned' instead of 'enroute' to avoid overlap check issues
    -- The trip will be created automatically by trigger, so we don't need to insert it manually
    INSERT INTO subscription_rides (
        subscription_id,
        date,
        direction,
        driver_id,
        vehicle_id,
        est_km,
        fare,
        status,
        notes
    )
    VALUES (
        v_subscription_id,
        v_yesterday,
        'to_office',
        v_driver_id,
        v_vehicle_id,
        25.5,
        50000, -- 500 rupees in paise
        'assigned', -- Incomplete status (will be created by trigger)
        'Test past incomplete booking - created for testing purposes'
    )
    RETURNING id INTO v_subscription_ride_id;
    
    -- Get the trip ID that was created by the trigger
    SELECT id INTO v_trip_id 
    FROM trips 
    WHERE type = 'subscription' 
    AND ref_id = v_subscription_ride_id;
    
    -- If trip wasn't created by trigger (shouldn't happen), create it manually
    IF v_trip_id IS NULL THEN
        INSERT INTO trips (
            type,
            ref_id,
            status,
            created_at
        )
        VALUES (
            'subscription',
            v_subscription_ride_id,
            'assigned', -- Incomplete status
            (v_yesterday || ' 08:00:00')::timestamp
        )
        RETURNING id INTO v_trip_id;
    END IF;
    
    RAISE NOTICE 'Created past incomplete booking:';
    RAISE NOTICE '  Customer ID: %', v_customer_id;
    RAISE NOTICE '  Subscription ID: %', v_subscription_id;
    RAISE NOTICE '  Subscription Ride ID: %', v_subscription_ride_id;
    RAISE NOTICE '  Trip ID: %', v_trip_id;
    RAISE NOTICE '  Date: %', v_yesterday;
    RAISE NOTICE '  Status: assigned (incomplete)';
    RAISE NOTICE '';
    RAISE NOTICE 'This booking should appear when managers/admins enable "Show incomplete past trips"';
    
END $$;

