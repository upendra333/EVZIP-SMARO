-- Migration: Fix RLS for MVP local auth flow
-- Context:
-- - Current app auth is localStorage + custom users table login, not Supabase Auth JWT sessions.
-- - Frontend uses Supabase anon key, so strict authenticated/JWT-based policies block queries.
-- - This migration keeps RLS enabled but applies permissive policies for anon/authenticated roles.
--
-- WARNING:
-- - This is suitable for MVP/internal environments.
-- - For production, replace with strict JWT/user-based policies after moving to Supabase Auth.

-- ============================================================
-- USERS table: permissive policies
-- ============================================================

alter table public.users enable row level security;

drop policy if exists users_select_policy on public.users;
drop policy if exists users_insert_policy on public.users;
drop policy if exists users_update_policy on public.users;
drop policy if exists users_delete_policy on public.users;
drop policy if exists users_select_mvp_policy on public.users;
drop policy if exists users_insert_mvp_policy on public.users;
drop policy if exists users_update_mvp_policy on public.users;
drop policy if exists users_delete_mvp_policy on public.users;

create policy users_select_mvp_policy
on public.users
for select
to anon, authenticated
using (true);

create policy users_insert_mvp_policy
on public.users
for insert
to anon, authenticated
with check (true);

create policy users_update_mvp_policy
on public.users
for update
to anon, authenticated
using (true)
with check (true);

create policy users_delete_mvp_policy
on public.users
for delete
to anon, authenticated
using (true);

-- ============================================================
-- ROLE_PERMISSIONS table: permissive policies
-- ============================================================

alter table public.role_permissions enable row level security;

drop policy if exists role_permissions_select_policy on public.role_permissions;
drop policy if exists role_permissions_insert_policy on public.role_permissions;
drop policy if exists role_permissions_update_policy on public.role_permissions;
drop policy if exists role_permissions_delete_policy on public.role_permissions;
drop policy if exists role_permissions_select_mvp_policy on public.role_permissions;
drop policy if exists role_permissions_insert_mvp_policy on public.role_permissions;
drop policy if exists role_permissions_update_mvp_policy on public.role_permissions;
drop policy if exists role_permissions_delete_mvp_policy on public.role_permissions;

create policy role_permissions_select_mvp_policy
on public.role_permissions
for select
to anon, authenticated
using (true);

create policy role_permissions_insert_mvp_policy
on public.role_permissions
for insert
to anon, authenticated
with check (true);

create policy role_permissions_update_mvp_policy
on public.role_permissions
for update
to anon, authenticated
using (true)
with check (true);

create policy role_permissions_delete_mvp_policy
on public.role_permissions
for delete
to anon, authenticated
using (true);

-- ============================================================
-- Ensure anon/authenticated can execute role permission RPCs
-- ============================================================

grant execute on function public.get_role_permissions(varchar) to anon, authenticated;
grant execute on function public.get_all_role_permissions() to anon, authenticated;
grant execute on function public.update_role_permissions(varchar, jsonb) to anon, authenticated;

