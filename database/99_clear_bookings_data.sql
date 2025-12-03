-- Clear Bookings, Customers, Rides, and Audit Logs
-- This script deletes all data related to bookings, customers, rides, and audit logs
-- while preserving drivers and vehicles data
-- Run this in Supabase SQL Editor

-- ============================================
-- WARNING: This will permanently delete data!
-- ============================================
-- This script will delete:
--   - All payments
--   - All trips
--   - All subscription rides
--   - All airport bookings
--   - All rental bookings
--   - All manual rides
--   - All subscriptions
--   - All customers
--   - All audit logs
--
-- This will NOT delete:
--   - Drivers
--   - Vehicles
--   - Hubs
--   - Plans
--   - Users
--   - Roles
--   - Rosters
--   - Settlements
-- ============================================

BEGIN;

-- Delete in order to respect foreign key constraints

-- 1. Delete payments (references trips and customers)
DELETE FROM payments;

-- 2. Delete trips (references bookings via ref_id)
DELETE FROM trips;

-- 3. Delete subscription rides (references subscriptions)
DELETE FROM subscription_rides;

-- 4. Delete airport bookings (references customers)
DELETE FROM airport_bookings;

-- 5. Delete rental bookings (references customers)
DELETE FROM rental_bookings;

-- 6. Delete manual rides (references customers)
DELETE FROM manual_rides;

-- 7. Delete subscriptions (references customers)
DELETE FROM subscriptions;

-- 8. Delete customers
DELETE FROM customers;

-- 9. Delete audit logs
DELETE FROM audit_log;

COMMIT;

-- Verify deletions
SELECT 
    'payments' as table_name, COUNT(*) as remaining_count FROM payments
UNION ALL
SELECT 'trips', COUNT(*) FROM trips
UNION ALL
SELECT 'subscription_rides', COUNT(*) FROM subscription_rides
UNION ALL
SELECT 'airport_bookings', COUNT(*) FROM airport_bookings
UNION ALL
SELECT 'rental_bookings', COUNT(*) FROM rental_bookings
UNION ALL
SELECT 'manual_rides', COUNT(*) FROM manual_rides
UNION ALL
SELECT 'subscriptions', COUNT(*) FROM subscriptions
UNION ALL
SELECT 'customers', COUNT(*) FROM customers
UNION ALL
SELECT 'audit_log', COUNT(*) FROM audit_log
ORDER BY table_name;

