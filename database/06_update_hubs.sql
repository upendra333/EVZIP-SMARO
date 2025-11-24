-- Migration: Update Hubs to HQ, East, West, North, South
-- Run this in Supabase SQL Editor

-- ============================================
-- UPDATE HUBS
-- ============================================

-- First, delete all existing hubs (this will set hub_id to NULL in related tables)
-- Note: This ensures a clean slate with only the new hubs
DELETE FROM hubs;

-- Insert new hubs
INSERT INTO hubs (id, name, city, lat, lng) VALUES
    ('00000000-0000-0000-0000-000000000001', 'HQ', NULL, NULL, NULL),
    ('00000000-0000-0000-0000-000000000002', 'East', NULL, NULL, NULL),
    ('00000000-0000-0000-0000-000000000003', 'West', NULL, NULL, NULL),
    ('00000000-0000-0000-0000-000000000004', 'North', NULL, NULL, NULL),
    ('00000000-0000-0000-0000-000000000005', 'South', NULL, NULL, NULL);

