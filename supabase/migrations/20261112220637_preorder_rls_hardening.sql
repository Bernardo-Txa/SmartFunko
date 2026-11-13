-- Purpose:
--   Protect the native preorder tables exposed through the Data API.
--   Public users may read only open preorder items and their images.
--   Authenticated customers may read only reservations owned by their profile.
--   Administrative writes continue through the server-only service_role client;
--   admin policies preserve row authorization if direct grants are added later.
--
-- Rollback (manual, only after evaluating the exposure risk):
--   1. Drop exactly the eight policies created below by name.
--   2. Revoke the column/table grants introduced below. Restore the former
--      broad grants only if the rollback explicitly accepts that exposure.
--   3. DROP INDEX public.preorder_item_images_preorder_item_idx and
--      public.preorder_reservation_items_reservation_idx.
--   4. ALTER TABLE ... DISABLE ROW LEVEL SECURITY on each of the four tables.
-- The complete reverse-order statements and preconditions are documented in
-- docs/MOBILE_RELEASE_2026-12-15.md.
-- Disabling RLS restores the original insecure behavior and is not recommended.

alter table public.preorder_items enable row level security;
alter table public.preorder_item_images enable row level security;
alter table public.preorder_reservations enable row level security;
alter table public.preorder_reservation_items enable row level security;

-- These indexes cover the foreign-key lookups used by the image and reservation
-- item policies. Existing customer_id and preorder_item_id indexes are retained.
create index if not exists preorder_item_images_preorder_item_idx
  on public.preorder_item_images (preorder_item_id);

create index if not exists preorder_reservation_items_reservation_idx
  on public.preorder_reservation_items (reservation_id);

-- Replace the broad default grants with column-level reads for public/customer
-- data and the DML used by the server backend. Internal actor IDs and provider
-- payloads are intentionally not exposed to anon/authenticated roles.
revoke all on table public.preorder_items from anon, authenticated, service_role;
revoke all on table public.preorder_item_images from anon, authenticated, service_role;
revoke all on table public.preorder_reservations from anon, authenticated, service_role;
revoke all on table public.preorder_reservation_items from anon, authenticated, service_role;

grant select (
  id, code, slug, title, short_description, description, main_image_url,
  status, price, category_name, franchise_name, expected_arrival,
  order_deadline, max_per_customer, created_at, updated_at
) on table public.preorder_items to anon, authenticated;

grant select (
  id, preorder_item_id, image_url, sort_order, created_at
) on table public.preorder_item_images to anon, authenticated;

grant select (
  id, reservation_number, checkout_number, customer_id, v2_order_id, status,
  total_amount, notes, payment_status, payment_link_url, paid_amount, paid_at,
  created_at, updated_at
) on table public.preorder_reservations to authenticated;

grant select (
  id, reservation_id, preorder_item_id, item_code, item_title, quantity,
  unit_price, total_price, created_at
) on table public.preorder_reservation_items to authenticated;

grant select, insert, update, delete on table public.preorder_items to service_role;
grant select, insert, update, delete on table public.preorder_item_images to service_role;
grant select, insert, update, delete on table public.preorder_reservations to service_role;
grant select, insert, update, delete on table public.preorder_reservation_items to service_role;

drop policy if exists "public_select_open_preorder_items" on public.preorder_items;
create policy "public_select_open_preorder_items"
on public.preorder_items
for select
to anon, authenticated
using (
  status = 'open'
  and (
    order_deadline is null
    or order_deadline >= (now() at time zone 'America/Sao_Paulo')::date
  )
);

drop policy if exists "public_select_open_preorder_item_images" on public.preorder_item_images;
create policy "public_select_open_preorder_item_images"
on public.preorder_item_images
for select
to anon, authenticated
using (
  exists (
    select 1
    from public.preorder_items
    where preorder_items.id = preorder_item_images.preorder_item_id
      and preorder_items.status = 'open'
      and (
        preorder_items.order_deadline is null
        or preorder_items.order_deadline >= (now() at time zone 'America/Sao_Paulo')::date
      )
  )
);

drop policy if exists "customers_select_own_preorder_reservations" on public.preorder_reservations;
create policy "customers_select_own_preorder_reservations"
on public.preorder_reservations
for select
to authenticated
using (
  exists (
    select 1
    from public.customers
    where customers.id = preorder_reservations.customer_id
      and customers.profile_id = (select public.current_profile_id())
  )
);

drop policy if exists "customers_select_own_preorder_reservation_items" on public.preorder_reservation_items;
create policy "customers_select_own_preorder_reservation_items"
on public.preorder_reservation_items
for select
to authenticated
using (
  exists (
    select 1
    from public.preorder_reservations
    join public.customers
      on customers.id = preorder_reservations.customer_id
    where preorder_reservations.id = preorder_reservation_items.reservation_id
      and customers.profile_id = (select public.current_profile_id())
  )
);

drop policy if exists "admins_manage_preorder_items" on public.preorder_items;
create policy "admins_manage_preorder_items"
on public.preorder_items
for all
to authenticated
using ((select public.is_admin()))
with check ((select public.is_admin()));

drop policy if exists "admins_manage_preorder_item_images" on public.preorder_item_images;
create policy "admins_manage_preorder_item_images"
on public.preorder_item_images
for all
to authenticated
using ((select public.is_admin()))
with check ((select public.is_admin()));

drop policy if exists "admins_manage_preorder_reservations" on public.preorder_reservations;
create policy "admins_manage_preorder_reservations"
on public.preorder_reservations
for all
to authenticated
using ((select public.is_admin()))
with check ((select public.is_admin()));

drop policy if exists "admins_manage_preorder_reservation_items" on public.preorder_reservation_items;
create policy "admins_manage_preorder_reservation_items"
on public.preorder_reservation_items
for all
to authenticated
using ((select public.is_admin()))
with check ((select public.is_admin()));

-- Read-only post-apply validation examples are documented in
-- docs/MOBILE_RELEASE_2026-12-15.md. This migration intentionally performs no
-- data mutation beyond catalog metadata (policies, grants and indexes).
