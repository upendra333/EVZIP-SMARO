-- Fixed SQL to insert hubs
-- Run this in Supabase SQL Editor

-- Option 1: If hubs don't exist yet, use this (simpler)
INSERT INTO hubs (id, name, city, lat, lng) VALUES
    ('00000000-0000-0000-0000-000000000001', 'HQ', NULL, NULL, NULL),
    ('00000000-0000-0000-0000-000000000002', 'East', NULL, NULL, NULL),
    ('00000000-0000-0000-0000-000000000003', 'West', NULL, NULL, NULL),
    ('00000000-0000-0000-0000-000000000004', 'North', NULL, NULL, NULL),
    ('00000000-0000-0000-0000-000000000005', 'South', NULL, NULL, NULL)
ON CONFLICT (id) DO NOTHING;

-- Option 2: If you want to ensure clean state first (delete existing and insert)
-- DELETE FROM hubs;
-- INSERT INTO hubs (id, name, city, lat, lng) VALUES
--     ('00000000-0000-0000-0000-000000000001', 'HQ', NULL, NULL, NULL),
--     ('00000000-0000-0000-0000-000000000002', 'East', NULL, NULL, NULL),
--     ('00000000-0000-0000-0000-000000000003', 'West', NULL, NULL, NULL),
--     ('00000000-0000-0000-0000-000000000004', 'North', NULL, NULL, NULL),
--     ('00000000-0000-0000-0000-000000000005', 'South', NULL, NULL, NULL);

