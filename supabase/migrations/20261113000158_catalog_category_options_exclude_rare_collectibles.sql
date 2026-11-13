-- Purpose:
--   Keep public category counts consistent with catalog_product_cards by
--   excluding every product represented in Acervo Raro, regardless of rare
--   collectible visibility or lifecycle status.
--
-- Rollback:
--   Restore the prior SECURITY INVOKER definition without the private join.
--   That rollback intentionally restores the old inconsistent rare counts.

create or replace view public.catalog_category_options
with (security_invoker = true)
as
select
  products.category_name,
  products.subcategory_name,
  count(*) as product_count
from public.products
left join private.rare_collectible_product_ids rare_product
  on rare_product.product_id = products.id
where products.status = 'active'
  and products.category_name is not null
  and rare_product.product_id is null
group by products.category_name, products.subcategory_name
order by products.category_name, products.subcategory_name;

revoke all on table public.catalog_category_options
from anon, authenticated, service_role;
grant select on table public.catalog_category_options
to anon, authenticated, service_role;
