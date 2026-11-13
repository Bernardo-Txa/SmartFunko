-- Purpose:
--   Reduce the RPC attack surface of privileged functions without breaking the
--   helper functions used by existing RLS policies and triggers.
--   Mutable raffle/signup functions become service_role-only. The V2 total
--   recalculation helper becomes SECURITY INVOKER so direct calls must satisfy
--   the caller's normal table grants and RLS policies.
--
-- Rollback (manual):
--   1. Restore the four identity helper bodies from the captured pre-migration
--      definitions only if an investigated compatibility issue requires it.
--   2. Restore v2_recalculate_order_totals(uuid) as SECURITY DEFINER only if a
--      verified caller cannot operate through the trigger under normal RLS.
--   3. Regrant EXECUTE on mutable functions only to the exact role proven to
--      need it; never restore an implicit PUBLIC grant.
-- The dependency checks and reverse-order procedure are documented in
-- docs/MOBILE_RELEASE_2026-12-15.md.

-- Identity helpers remain SECURITY DEFINER because many existing RLS policies
-- need to inspect profiles without recursively depending on profiles RLS. Their
-- empty search_path and fully qualified relations prevent object-shadowing.
create or replace function public.current_profile_role()
returns public.profile_role
language sql
stable
security definer
set search_path = ''
as $$
  select profiles.role
  from public.profiles as profiles
  where profiles.auth_user_id = (select auth.uid())
$$;

create or replace function public.current_profile_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select profiles.id
  from public.profiles as profiles
  where profiles.auth_user_id = (select auth.uid())
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(public.current_profile_role() = 'owner'::public.profile_role, false)
$$;

create or replace function public.is_owner()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(public.current_profile_role() = 'owner'::public.profile_role, false)
$$;

revoke all on function public.current_profile_role() from public, anon, authenticated, service_role;
revoke all on function public.current_profile_id() from public, anon, authenticated, service_role;
revoke all on function public.is_admin() from public, anon, authenticated, service_role;
revoke all on function public.is_owner() from public, anon, authenticated, service_role;

-- Anonymous catalog policies currently evaluate is_admin/is_owner as the false
-- branch, so anon execution is intentionally retained. These helpers expose only
-- the current caller's profile identity/role and perform no mutation.
grant execute on function public.current_profile_role() to anon, authenticated, service_role;
grant execute on function public.current_profile_id() to anon, authenticated, service_role;
grant execute on function public.is_admin() to anon, authenticated, service_role;
grant execute on function public.is_owner() to anon, authenticated, service_role;

-- Raffle reservation and expiry are invoked exclusively by RaffleService using
-- the server-only service_role client. Signup handlers are trigger functions and
-- must not be exposed as callable RPCs.
revoke all on function public.expire_raffle_reservations() from public, anon, authenticated, service_role;
revoke all on function public.reserve_raffle_numbers(uuid, uuid, integer[]) from public, anon, authenticated, service_role;
revoke all on function public.handle_new_auth_user() from public, anon, authenticated, service_role;
revoke all on function public.handle_new_user() from public, anon, authenticated, service_role;

grant execute on function public.expire_raffle_reservations() to service_role;
grant execute on function public.reserve_raffle_numbers(uuid, uuid, integer[]) to service_role;
grant execute on function public.handle_new_auth_user() to service_role;
grant execute on function public.handle_new_user() to service_role;

-- This helper is called by the recalculate_v2_order_items_total trigger. As an
-- invoker function, an authenticated caller can update totals only when its
-- ordinary v2_orders grants and RLS policies already permit that update.
create or replace function public.v2_recalculate_order_totals(p_order_id uuid)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_subtotal numeric(12, 2);
begin
  select coalesce(sum(v2_order_items.total_price), 0)
    into v_subtotal
  from public.v2_order_items
  where v2_order_items.order_id = p_order_id;

  update public.v2_orders
     set subtotal = v_subtotal,
         updated_at = now()
   where v2_orders.id = p_order_id;
end;
$$;

revoke all on function public.v2_recalculate_order_totals(uuid)
  from public, anon, authenticated, service_role;
grant execute on function public.v2_recalculate_order_totals(uuid)
  to authenticated, service_role;

-- record_manual_payment and refund_manual_payment were already confirmed as
-- service_role-only and are deliberately left unchanged in this migration.
-- Read-only post-apply privilege/dependency checks are documented in
-- docs/MOBILE_RELEASE_2026-12-15.md.
