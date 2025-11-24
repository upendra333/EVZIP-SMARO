-- Migration: Assign HQ hub to all existing vehicles
-- Run this in Supabase SQL Editor
-- This only affects existing vehicles, not future additions

-- ============================================
-- ASSIGN HQ HUB TO ALL EXISTING VEHICLES
-- ============================================

-- First, get the HQ hub ID and update all vehicles that don't have a hub assigned
UPDATE vehicles
SET current_hub_id = (
    SELECT id FROM hubs WHERE name = 'HQ' LIMIT 1
)
WHERE current_hub_id IS NULL;

-- Verify the update
SELECT 
    v.id,
    v.reg_no,
    v.make,
    v.model,
    v.current_hub_id,
    h.name as hub_name,
    v.status
FROM vehicles v
LEFT JOIN hubs h ON v.current_hub_id = h.id
ORDER BY v.reg_no;

