-- Migration: Set default status for drivers and vehicles with NULL or empty status
-- Run this in Supabase SQL Editor
-- This updates existing records that don't have a status set

-- ============================================
-- SET DEFAULT STATUS FOR DRIVERS AND VEHICLES
-- ============================================

-- Update drivers with NULL or empty status to 'active'
UPDATE drivers
SET status = 'active'
WHERE status IS NULL OR status = '';

-- Update vehicles with NULL or empty status to 'available'
UPDATE vehicles
SET status = 'available'
WHERE status IS NULL OR status = '';

-- Verify the updates
SELECT 
    'Drivers' as table_name,
    status,
    COUNT(*) as count
FROM drivers
GROUP BY status
UNION ALL
SELECT 
    'Vehicles' as table_name,
    status,
    COUNT(*) as count
FROM vehicles
GROUP BY status
ORDER BY table_name, status;

