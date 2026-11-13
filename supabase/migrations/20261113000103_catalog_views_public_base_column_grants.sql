-- Purpose:
--   Supply the explicit base-table column privileges required by the public
--   SECURITY INVOKER catalog views. Supabase branches intentionally omit many
--   default public-schema grants. RLS remains responsible for row visibility,
--   while sensitive columns such as product_variants.estimated_cost stay hidden.
--
-- Rollback:
--   Revoke the exact column grants below from anon, authenticated and
--   service_role only after restoring a safe alternative for the public views.

grant select (
  id, name, slug, franchise_id, supplier_id, funko_number, category_name,
  subcategory_name, main_image_url, status, created_at, product_type
) on table public.products to anon, authenticated, service_role;

grant select (id, name, slug, status)
on table public.franchises to anon, authenticated, service_role;

grant select (id, name, slug, status)
on table public.suppliers to anon, authenticated, service_role;

grant select (id, product_id, image_url, sort_order)
on table public.product_images to anon, authenticated, service_role;

grant select (
  id, product_id, sku, condition, type, special_label, special_tags, source,
  sale_price, market_price, status, created_at
) on table public.product_variants to anon, authenticated, service_role;

-- Read-only validation:
--   1. catalog_product_cards and catalog_category_options must be readable by
--      anon/authenticated/service_role.
--   2. information_schema.role_column_grants must not include estimated_cost.
--   3. Base-table RLS must continue hiding inactive/hidden rows.
