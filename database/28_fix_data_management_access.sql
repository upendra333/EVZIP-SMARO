-- Migration: Fix Data Management access for MVP local auth
-- Context:
-- - Current frontend auth uses anon key + localStorage session.
-- - Strict RLS policies can cause Data Management pages to appear empty.
-- - This migration restores read/write access in MVP mode by disabling RLS
--   on core operational tables and granting table privileges.

-- ============================================================
-- Disable RLS on Data Management related tables
-- ============================================================
alter table if exists public.customers disable row level security;
alter table if exists public.drivers disable row level security;
alter table if exists public.vehicles disable row level security;
alter table if exists public.hubs disable row level security;
alter table if exists public.subscriptions disable row level security;
alter table if exists public.subscription_rides disable row level security;
alter table if exists public.airport_bookings disable row level security;
alter table if exists public.rental_bookings disable row level security;
alter table if exists public.outstation_bookings disable row level security;
alter table if exists public.manual_rides disable row level security;
alter table if exists public.trips disable row level security;
alter table if exists public.payments disable row level security;
alter table if exists public.audit_log disable row level security;

-- ============================================================
-- Grant broad MVP access to anon/authenticated roles
-- ============================================================
grant select, insert, update, delete on public.customers to anon, authenticated;
grant select, insert, update, delete on public.drivers to anon, authenticated;
grant select, insert, update, delete on public.vehicles to anon, authenticated;
grant select, insert, update, delete on public.hubs to anon, authenticated;
grant select, insert, update, delete on public.subscriptions to anon, authenticated;
grant select, insert, update, delete on public.subscription_rides to anon, authenticated;
grant select, insert, update, delete on public.airport_bookings to anon, authenticated;
grant select, insert, update, delete on public.rental_bookings to anon, authenticated;
grant select, insert, update, delete on public.outstation_bookings to anon, authenticated;
grant select, insert, update, delete on public.manual_rides to anon, authenticated;
grant select, insert, update, delete on public.trips to anon, authenticated;
grant select, insert, update, delete on public.payments to anon, authenticated;
grant select, insert, update, delete on public.audit_log to anon, authenticated;

