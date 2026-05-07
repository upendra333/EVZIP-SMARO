-- Migration: Enable RLS policies for users and role_permissions
-- IMPORTANT:
-- 1) This migration is intended for production-style access control.
-- 2) It expects requests to carry a JWT with a role claim (app_role or role),
--    e.g. 'admin', 'manager', 'supervisor', 'read_only'.
-- 3) If your app is still using only anon key + localStorage auth, these policies
--    will block access until real Supabase Auth/JWT flow is in place.

-- ============================================================
-- Helper functions (read role from JWT claims)
-- ============================================================

create or replace function public.current_app_role()
returns text
language sql
stable
as $$
  select coalesce(
    nullif(auth.jwt() ->> 'app_role', ''),
    nullif(auth.jwt() ->> 'role', ''),
    ''
  );
$$;

create or replace function public.is_admin_role()
returns boolean
language sql
stable
as $$
  select public.current_app_role() = 'admin';
$$;

create or replace function public.is_manager_or_admin_role()
returns boolean
language sql
stable
as $$
  select public.current_app_role() in ('manager', 'admin');
$$;

-- ============================================================
-- USERS table policies
-- ============================================================

alter table public.users enable row level security;

drop policy if exists users_select_policy on public.users;
drop policy if exists users_insert_policy on public.users;
drop policy if exists users_update_policy on public.users;
drop policy if exists users_delete_policy on public.users;

-- Allow all logged-in app roles to read users list.
create policy users_select_policy
on public.users
for select
to authenticated
using (
  public.current_app_role() in ('read_only', 'supervisor', 'manager', 'admin')
);

-- Only manager/admin can create users.
create policy users_insert_policy
on public.users
for insert
to authenticated
with check (public.is_manager_or_admin_role());

-- Only manager/admin can update users.
create policy users_update_policy
on public.users
for update
to authenticated
using (public.is_manager_or_admin_role())
with check (public.is_manager_or_admin_role());

-- Only admin can delete users.
create policy users_delete_policy
on public.users
for delete
to authenticated
using (public.is_admin_role());

-- ============================================================
-- ROLE_PERMISSIONS table policies
-- ============================================================

alter table public.role_permissions enable row level security;

drop policy if exists role_permissions_select_policy on public.role_permissions;
drop policy if exists role_permissions_insert_policy on public.role_permissions;
drop policy if exists role_permissions_update_policy on public.role_permissions;
drop policy if exists role_permissions_delete_policy on public.role_permissions;

-- Anyone with authenticated app role can read role permissions.
create policy role_permissions_select_policy
on public.role_permissions
for select
to authenticated
using (
  public.current_app_role() in ('read_only', 'supervisor', 'manager', 'admin')
);

-- Only admin can manage role permissions records directly.
create policy role_permissions_insert_policy
on public.role_permissions
for insert
to authenticated
with check (public.is_admin_role());

create policy role_permissions_update_policy
on public.role_permissions
for update
to authenticated
using (public.is_admin_role())
with check (public.is_admin_role());

create policy role_permissions_delete_policy
on public.role_permissions
for delete
to authenticated
using (public.is_admin_role());

-- ============================================================
-- RPC execute grants for authenticated clients
-- ============================================================

grant execute on function public.get_role_permissions(varchar) to authenticated;
grant execute on function public.get_all_role_permissions() to authenticated;
grant execute on function public.update_role_permissions(varchar, jsonb) to authenticated;

