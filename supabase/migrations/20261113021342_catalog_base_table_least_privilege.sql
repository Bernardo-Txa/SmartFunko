-- Purpose:
--   Replace legacy table-wide privileges on catalog base tables with the
--   least-privilege column SELECT grants required by the public Next.js
--   catalog and its SECURITY INVOKER views. Direct writes remain server-only.
--
-- Security impact:
--   anon and authenticated lose INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES,
--   TRIGGER and table-wide SELECT. Internal fields such as estimated_cost,
--   audit timestamps, SEO administration fields and Acervo Raro metadata are
--   no longer readable through direct base-table Data API requests.
--
-- Compatibility:
--   The public grants below cover catalog_product_cards,
--   catalog_category_options, product detail, suppliers/brands and filters.
--   Administrative and authenticated Next.js APIs use service_role and are
--   intentionally unaffected. RLS continues to control visible rows.
--
-- Risk:
--   Any undocumented browser client that bypasses the supported views and
--   requests a non-granted base-table column will begin receiving 42501.
--
-- Rollback (security-regressive; use only after incident review):
--   GRANT ALL PRIVILEGES ON TABLE
--     public.products, public.product_variants, public.product_images,
--     public.franchises, public.suppliers, public.rare_collectibles
--   TO anon, authenticated;
--   This restores the legacy exposure, including estimated_cost and DML.

revoke all privileges on table
  public.products,
  public.product_variants,
  public.product_images,
  public.franchises,
  public.suppliers,
  public.rare_collectibles
from anon, authenticated;

-- Public product detail plus both SECURITY INVOKER catalog views.
grant select (
  id,
  name,
  slug,
  franchise_id,
  supplier_id,
  product_type,
  funko_number,
  category_name,
  subcategory_name,
  external_catalog_code,
  description,
  main_image_url,
  status,
  created_at
) on table public.products to anon, authenticated;

-- Public variant presentation and view predicates/order. estimated_cost and
-- updated_at are deliberately omitted.
grant select (
  id,
  product_id,
  sku,
  condition,
  type,
  source,
  sale_price,
  market_price,
  status,
  created_at,
  special_label,
  special_tags
) on table public.product_variants to anon, authenticated;

grant select (
  id,
  product_id,
  image_url,
  sort_order
) on table public.product_images to anon, authenticated;

grant select (
  id,
  name,
  slug,
  status
) on table public.franchises to anon, authenticated;

-- Supplier pages intentionally publish these presentation fields. Audit
-- timestamps remain server-only.
grant select (
  id,
  name,
  slug,
  description,
  logo_url,
  banner_url,
  accent_color,
  website_url,
  status,
  sort_order
) on table public.suppliers to anon, authenticated;

-- No direct anon/authenticated grant is restored on rare_collectibles. The
-- non-exposed private read model exposes only product_id to the public catalog
-- views, while Acervo Raro server routes continue through service_role.

-- Read-only post-apply assertions are maintained in
-- supabase/tests/catalog_base_table_least_privilege.sql.
