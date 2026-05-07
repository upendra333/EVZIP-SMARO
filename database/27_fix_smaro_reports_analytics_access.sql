-- Migration: Fix SMARO Reports/Analytics data access for MVP local auth
-- Context:
-- - App uses anon key + localStorage auth flow.
-- - Strict RLS / missing RPC grants can make Reports/Analytics appear empty.
-- - This migration restores read access for MVP usage.

-- ============================================================
-- 1) Disable RLS on core reporting tables (MVP mode)
-- ============================================================
alter table if exists public.trips disable row level security;
alter table if exists public.subscription_rides disable row level security;
alter table if exists public.airport_bookings disable row level security;
alter table if exists public.rental_bookings disable row level security;
alter table if exists public.outstation_bookings disable row level security;
alter table if exists public.manual_rides disable row level security;
alter table if exists public.payments disable row level security;
alter table if exists public.customers disable row level security;
alter table if exists public.drivers disable row level security;
alter table if exists public.vehicles disable row level security;
alter table if exists public.hubs disable row level security;
alter table if exists public.subscriptions disable row level security;

-- ============================================================
-- 2) Ensure anon/authenticated can read core tables
-- ============================================================
grant select on public.trips to anon, authenticated;
grant select on public.subscription_rides to anon, authenticated;
grant select on public.airport_bookings to anon, authenticated;
grant select on public.rental_bookings to anon, authenticated;
grant select on public.outstation_bookings to anon, authenticated;
grant select on public.manual_rides to anon, authenticated;
grant select on public.payments to anon, authenticated;
grant select on public.customers to anon, authenticated;
grant select on public.drivers to anon, authenticated;
grant select on public.vehicles to anon, authenticated;
grant select on public.hubs to anon, authenticated;
grant select on public.subscriptions to anon, authenticated;

-- ============================================================
-- 3) Ensure RPCs used by SMARO Reports/Analytics are executable
-- ============================================================
grant execute on function public.daily_summary(date, date, uuid) to anon, authenticated;
grant execute on function public.weekly_summary(date, date, uuid) to anon, authenticated;
grant execute on function public.today_metrics(uuid, date) to anon, authenticated;

