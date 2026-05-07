-- Migration: Add dedicated ride hailing reports permission
-- Adds new permission key: view_ride_hailing_reports
-- so Role & Permissions can control Ride Hailing Reports tab independently.

update role_permissions
set permissions = (
  select jsonb_agg(distinct value)
  from jsonb_array_elements(
    coalesce(role_permissions.permissions, '[]'::jsonb) || '["view_ride_hailing_reports"]'::jsonb
  )
)
where role in ('supervisor', 'manager', 'admin');

