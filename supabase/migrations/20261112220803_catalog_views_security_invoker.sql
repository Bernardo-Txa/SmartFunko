-- Purpose:
--   Make the public catalog views execute with the caller's permissions so the
--   RLS policies of their base tables are respected. A private, non-exposed
--   read model keeps every Acervo Raro product out of the standard catalog
--   without exposing rare_collectibles or a callable SECURITY DEFINER RPC.
--
-- Rollback (manual):
--   1. Recreate both views without WITH (security_invoker = true) using the
--      definitions that preceded this migration.
--   2. Restore only the view grants that are intentionally required.
--   3. Drop private.rare_collectible_product_ids; drop schema private only if it
--      contains no other objects.
-- Returning to definer-rights views restores the advisor finding and can bypass
-- RLS, so rollback should be reserved for an investigated compatibility issue.

create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to anon, authenticated, service_role;

-- This definer-rights view is deliberately kept outside exposed schemas. It
-- reveals only product IDs to the invoker catalog view and has no callable RPC.
-- security_barrier prevents caller predicates from being pushed below the view.
create or replace view private.rare_collectible_product_ids
with (security_barrier = true, security_invoker = false)
as
select rare_collectibles.product_id
from public.rare_collectibles;

revoke all on table private.rare_collectible_product_ids
  from public, anon, authenticated, service_role;
grant select on table private.rare_collectible_product_ids
  to anon, authenticated, service_role;

create or replace view public.catalog_category_options
with (security_invoker = true)
as
select
  products.category_name,
  products.subcategory_name,
  count(*) as product_count
from public.products
where products.status = 'active'
  and products.category_name is not null
group by products.category_name, products.subcategory_name
order by products.category_name, products.subcategory_name;

create or replace view public.catalog_product_cards
with (security_invoker = true)
as
select
  products.id,
  products.name,
  products.slug,
  products.franchise_id,
  products.supplier_id,
  products.funko_number,
  products.category_name,
  products.subcategory_name,
  products.main_image_url,
  products.status,
  products.created_at,
  franchises.name as franchise_name,
  franchises.slug as franchise_slug,
  suppliers.name as supplier_name,
  suppliers.slug as supplier_slug,
  first_image.image_url as gallery_image_url,
  primary_variant.id as variant_id,
  primary_variant.sku,
  primary_variant.condition,
  primary_variant.type,
  primary_variant.special_label,
  primary_variant.special_tags,
  primary_variant.source,
  primary_variant.sale_price,
  primary_variant.market_price,
  primary_variant.status as variant_status,
  exists (
    select 1
    from public.product_variants visible_variant
    where visible_variant.product_id = products.id
      and visible_variant.status <> 'hidden'
  ) as has_visible_variant,
  exists (
    select 1
    from public.product_variants ready_variant
    where ready_variant.product_id = products.id
      and ready_variant.status <> 'hidden'
      and (
        ready_variant.source = 'own_stock'
        or ready_variant.status = 'available'
      )
  ) as has_ready_variant,
  exists (
    select 1
    from public.product_variants order_variant
    where order_variant.product_id = products.id
      and order_variant.status <> 'hidden'
      and (
        order_variant.source in ('national', 'international')
        or order_variant.status = 'order_only'
      )
  ) as has_order_variant,
  exists (
    select 1
    from public.product_variants preorder_variant
    where preorder_variant.product_id = products.id
      and preorder_variant.status <> 'hidden'
      and (
        preorder_variant.source = 'preorder'
        or preorder_variant.status = 'preorder'
      )
  ) as has_preorder_variant,
  exists (
    select 1
    from public.product_variants special_variant
    where special_variant.product_id = products.id
      and special_variant.status <> 'hidden'
      and (
        special_variant.type <> 'common'
        or special_variant.special_label is not null
        or cardinality(coalesce(special_variant.special_tags, '{}')) > 0
      )
  ) as has_special_variant,
  products.product_type
from public.products
left join public.franchises
  on franchises.id = products.franchise_id
left join public.suppliers
  on suppliers.id = products.supplier_id
  and suppliers.status = 'active'
left join private.rare_collectible_product_ids rare_product
  on rare_product.product_id = products.id
left join lateral (
  select product_images.image_url
  from public.product_images
  where product_images.product_id = products.id
  order by product_images.sort_order asc, product_images.id asc
  limit 1
) first_image on true
left join lateral (
  select
    product_variants.id,
    product_variants.sku,
    product_variants.condition,
    product_variants.type,
    product_variants.special_label,
    product_variants.special_tags,
    product_variants.source,
    product_variants.sale_price,
    product_variants.market_price,
    product_variants.status
  from public.product_variants
  where product_variants.product_id = products.id
    and product_variants.status <> 'hidden'
  order by
    case
      when product_variants.source = 'own_stock' then 0
      else 1
    end,
    case
      when product_variants.status = 'available' then 0
      when product_variants.status = 'sold_out' then 2
      else 1
    end,
    case
      when product_variants.type <> 'common'
        or product_variants.special_label is not null
        or cardinality(coalesce(product_variants.special_tags, '{}')) > 0
      then 0
      else 1
    end,
    product_variants.sale_price asc,
    product_variants.created_at asc
  limit 1
) primary_variant on true
where products.status = 'active'
  and rare_product.product_id is null;

-- Views are read models. Remove default DML-like grants and grant only SELECT.
revoke all on table public.catalog_category_options from anon, authenticated, service_role;
revoke all on table public.catalog_product_cards from anon, authenticated, service_role;

grant select on table public.catalog_category_options to anon, authenticated, service_role;
grant select on table public.catalog_product_cards to anon, authenticated, service_role;

-- Read-only post-apply validation examples, including the Acervo Raro exclusion
-- check, are documented in docs/MOBILE_RELEASE_2026-12-15.md.
