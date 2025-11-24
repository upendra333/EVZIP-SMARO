-- Migration: Assign HQ hub to all existing drivers
-- Run this in Supabase SQL Editor
-- This only affects existing drivers, not future additions

-- ============================================
-- ASSIGN HQ HUB TO ALL EXISTING DRIVERS
-- ============================================

-- First, get the HQ hub ID and update all drivers that don't have a hub assigned
UPDATE drivers
SET hub_id = (
    SELECT id FROM hubs WHERE name = 'HQ' LIMIT 1
)
WHERE hub_id IS NULL;

-- Verify the update
SELECT 
    d.id,
    d.name,
    d.phone,
    d.hub_id,
    h.name as hub_name
FROM drivers d
LEFT JOIN hubs h ON d.hub_id = h.id
ORDER BY d.name;

