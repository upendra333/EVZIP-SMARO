-- Add view_analytics permission to existing role permissions
-- This migration updates the default permissions for supervisor and manager roles

-- Update supervisor role to include view_analytics
UPDATE role_permissions
SET permissions = permissions || '["view_analytics"]'::jsonb
WHERE role = 'supervisor'
AND NOT (permissions @> '["view_analytics"]'::jsonb);

-- Update manager role to include view_analytics
UPDATE role_permissions
SET permissions = permissions || '["view_analytics"]'::jsonb
WHERE role = 'manager'
AND NOT (permissions @> '["view_analytics"]'::jsonb);

-- Admin already has all permissions, so no update needed
-- read_only should not have view_analytics, so no update needed

