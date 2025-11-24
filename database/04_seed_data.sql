-- EVZIP Ops Console - Seed Data
-- Run this in Supabase SQL Editor after schema, functions, and triggers
-- WARNING: This will insert test data. Remove or modify for production.

-- ============================================
-- HUBS
-- ============================================

INSERT INTO hubs (id, name, city, lat, lng) VALUES
    ('00000000-0000-0000-0000-000000000001', 'HQ', NULL, NULL, NULL),
    ('00000000-0000-0000-0000-000000000002', 'East', NULL, NULL, NULL),
    ('00000000-0000-0000-0000-000000000003', 'West', NULL, NULL, NULL),
    ('00000000-0000-0000-0000-000000000004', 'North', NULL, NULL, NULL),
    ('00000000-0000-0000-0000-000000000005', 'South', NULL, NULL, NULL)
ON CONFLICT DO NOTHING;

-- ============================================
-- DRIVERS
-- ============================================

INSERT INTO drivers (id, name, phone, license_no, status, hub_id) VALUES
    ('10000000-0000-0000-0000-000000000001', 'Rajesh Kumar', '9876543210', 'DL1234567890', 'active', '00000000-0000-0000-0000-000000000001'),
    ('10000000-0000-0000-0000-000000000002', 'Suresh Patel', '9876543211', 'MH1234567891', 'active', '00000000-0000-0000-0000-000000000001'),
    ('10000000-0000-0000-0000-000000000003', 'Amit Singh', '9876543212', 'DL1234567892', 'active', '00000000-0000-0000-0000-000000000002'),
    ('10000000-0000-0000-0000-000000000004', 'Vikram Reddy', '9876543213', 'KA1234567893', 'active', '00000000-0000-0000-0000-000000000003')
ON CONFLICT DO NOTHING;

-- ============================================
-- VEHICLES
-- ============================================

INSERT INTO vehicles (id, reg_no, make, model, seats, current_hub_id, status) VALUES
    ('20000000-0000-0000-0000-000000000001', 'MH01AB1234', 'Tata', 'Nexon EV', 4, '00000000-0000-0000-0000-000000000001', 'available'),
    ('20000000-0000-0000-0000-000000000002', 'MH01CD5678', 'Mahindra', 'eVerito', 4, '00000000-0000-0000-0000-000000000001', 'available'),
    ('20000000-0000-0000-0000-000000000003', 'DL01EF9012', 'Tata', 'Nexon EV', 4, '00000000-0000-0000-0000-000000000002', 'available'),
    ('20000000-0000-0000-0000-000000000004', 'KA01GH3456', 'Mahindra', 'eVerito', 4, '00000000-0000-0000-0000-000000000003', 'available')
ON CONFLICT DO NOTHING;

-- ============================================
-- CUSTOMERS
-- ============================================

INSERT INTO customers (id, name, phone, email, notes) VALUES
    ('30000000-0000-0000-0000-000000000001', 'Priya Sharma', '9876543220', 'priya.sharma@example.com', 'Regular commuter'),
    ('30000000-0000-0000-0000-000000000002', 'Rahul Mehta', '9876543221', 'rahul.mehta@example.com', 'Corporate client'),
    ('30000000-0000-0000-0000-000000000003', 'Anita Desai', '9876543222', 'anita.desai@example.com', NULL),
    ('30000000-0000-0000-0000-000000000004', 'Kiran Nair', '9876543223', 'kiran.nair@example.com', 'Airport transfers'),
    ('30000000-0000-0000-0000-000000000005', 'Sandeep Verma', '9876543224', 'sandeep.verma@example.com', 'Rental customer')
ON CONFLICT DO NOTHING;

-- ============================================
-- PLANS
-- ============================================

INSERT INTO plans (id, name, kind, price, days, min_km, per_km, direction) VALUES
    ('40000000-0000-0000-0000-000000000001', 'Monthly Commute', 'monthly', 500000, 30, 50, 1500, 'both'),
    ('40000000-0000-0000-0000-000000000002', 'Quarterly Plan', 'quarterly', 1400000, 90, 50, 1500, 'both'),
    ('40000000-0000-0000-0000-000000000003', 'To Office Only', 'monthly', 300000, 30, 30, 1500, 'to_office')
ON CONFLICT DO NOTHING;

-- ============================================
-- SUBSCRIPTIONS
-- ============================================

INSERT INTO subscriptions (id, customer_id, plan_id, start_date, end_date, pickup, drop, distance_km, schedule_json, status, hub_id) VALUES
    ('50000000-0000-0000-0000-000000000001', 
     '30000000-0000-0000-0000-000000000001', 
     '40000000-0000-0000-0000-000000000001',
     CURRENT_DATE,
     CURRENT_DATE + INTERVAL '30 days',
     'Andheri West, Mumbai',
     'BKC, Mumbai',
     25.5,
     '{"days": [1,2,3,4,5], "to_office": "09:00", "from_office": "18:00"}'::jsonb,
     'active',
     '00000000-0000-0000-0000-000000000001'),
    ('50000000-0000-0000-0000-000000000002',
     '30000000-0000-0000-0000-000000000002',
     '40000000-0000-0000-0000-000000000002',
     CURRENT_DATE,
     CURRENT_DATE + INTERVAL '90 days',
     'Gurgaon Sector 15',
     'Connaught Place, Delhi',
     30.0,
     '{"days": [1,2,3,4,5], "to_office": "08:30", "from_office": "19:00"}'::jsonb,
     'active',
     '00000000-0000-0000-0000-000000000002')
ON CONFLICT DO NOTHING;

-- ============================================
-- SUBSCRIPTION RIDES (for today and tomorrow)
-- ============================================

INSERT INTO subscription_rides (id, subscription_id, date, direction, est_km, fare, status) VALUES
    ('60000000-0000-0000-0000-000000000001', 
     '50000000-0000-0000-0000-000000000001',
     CURRENT_DATE,
     'to_office',
     25.5,
     50000,
     'created'),
    ('60000000-0000-0000-0000-000000000002',
     '50000000-0000-0000-0000-000000000001',
     CURRENT_DATE,
     'from_office',
     25.5,
     50000,
     'created'),
    ('60000000-0000-0000-0000-000000000003',
     '50000000-0000-0000-0000-000000000002',
     CURRENT_DATE,
     'to_office',
     30.0,
     60000,
     'assigned')
ON CONFLICT DO NOTHING;

-- Update assigned ride with driver and vehicle
UPDATE subscription_rides 
SET driver_id = '10000000-0000-0000-0000-000000000003',
    vehicle_id = '20000000-0000-0000-0000-000000000003'
WHERE id = '60000000-0000-0000-0000-000000000003';

-- ============================================
-- AIRPORT BOOKINGS
-- ============================================

INSERT INTO airport_bookings (id, customer_id, flight_no, pickup_at, pickup, drop, est_km, fare, status, hub_id) VALUES
    ('70000000-0000-0000-0000-000000000001',
     '30000000-0000-0000-0000-000000000004',
     'AI202',
     CURRENT_TIMESTAMP + INTERVAL '2 hours',
     'Mumbai Airport Terminal 2',
     'Andheri West, Mumbai',
     12.0,
     80000,
     'created',
     '00000000-0000-0000-0000-000000000001'),
    ('70000000-0000-0000-0000-000000000002',
     '30000000-0000-0000-0000-000000000004',
     '6E456',
     CURRENT_TIMESTAMP + INTERVAL '1 day',
     'Delhi Airport Terminal 3',
     'Gurgaon Sector 15',
     25.0,
     120000,
     'assigned',
     '00000000-0000-0000-0000-000000000002')
ON CONFLICT DO NOTHING;

-- Update assigned booking with driver and vehicle
UPDATE airport_bookings 
SET driver_id = '10000000-0000-0000-0000-000000000003',
    vehicle_id = '20000000-0000-0000-0000-000000000003'
WHERE id = '70000000-0000-0000-0000-000000000002';

-- ============================================
-- RENTAL BOOKINGS
-- ============================================

INSERT INTO rental_bookings (id, customer_id, package_hours, package_km, start_at, end_at, est_km, extra_km_rate, per_hour_rate, fare, status, hub_id) VALUES
    ('80000000-0000-0000-0000-000000000001',
     '30000000-0000-0000-0000-000000000005',
     4,
     100,
     CURRENT_TIMESTAMP + INTERVAL '3 hours',
     CURRENT_TIMESTAMP + INTERVAL '7 hours',
     80.0,
     2000,
     50000,
     200000,
     'created',
     '00000000-0000-0000-0000-000000000001'),
    ('80000000-0000-0000-0000-000000000002',
     '30000000-0000-0000-0000-000000000005',
     8,
     200,
     CURRENT_TIMESTAMP + INTERVAL '1 day',
     CURRENT_TIMESTAMP + INTERVAL '1 day' + INTERVAL '8 hours',
     150.0,
     2000,
     50000,
     400000,
     'assigned',
     '00000000-0000-0000-0000-000000000002')
ON CONFLICT DO NOTHING;

-- Update assigned booking with driver and vehicle
UPDATE rental_bookings 
SET driver_id = '10000000-0000-0000-0000-000000000003',
    vehicle_id = '20000000-0000-0000-0000-000000000003'
WHERE id = '80000000-0000-0000-0000-000000000002';

-- ============================================
-- USERS (for testing)
-- ============================================

INSERT INTO users (id, name, email, phone, role, hub_id, status) VALUES
    ('90000000-0000-0000-0000-000000000001', 'Supervisor Test', 'supervisor@evzip.com', '9876543301', 'supervisor', '00000000-0000-0000-0000-000000000001', 'active'),
    ('90000000-0000-0000-0000-000000000002', 'Manager Test', 'manager@evzip.com', '9876543302', 'manager', '00000000-0000-0000-0000-000000000001', 'active')
ON CONFLICT DO NOTHING;

-- ============================================
-- SET MANAGER PIN (default: manager123)
-- Change this in production!
-- ============================================

INSERT INTO app_config (key, value) VALUES ('manager_pin_hash', 'manager123')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

-- Note: The trips table will be automatically populated by triggers
-- when subscription_rides, airport_bookings, or rental_bookings are inserted

