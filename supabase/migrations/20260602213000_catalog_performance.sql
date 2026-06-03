create extension if not exists pg_trgm;

create index if not exists products_active_category_subcategory_idx
on public.products(category_name, subcategory_name)
where status = 'active';

create index if not exists products_active_name_idx
on public.products(name)
where status = 'active';

create index if not exists products_active_category_name_idx
on public.products(category_name, name)
where status = 'active';

create index if not exists products_active_category_subcategory_name_idx
on public.products(category_name, subcategory_name, name)
where status = 'active';

create index if not exists products_active_name_trgm_idx
on public.products using gin (name gin_trgm_ops)
where status = 'active';

create index if not exists products_active_slug_trgm_idx
on public.products using gin (slug gin_trgm_ops)
where status = 'active';

create index if not exists products_active_funko_number_trgm_idx
on public.products using gin (funko_number gin_trgm_ops)
where status = 'active' and funko_number is not null;

create index if not exists products_active_category_name_trgm_idx
on public.products using gin (category_name gin_trgm_ops)
where status = 'active' and category_name is not null;

create index if not exists products_active_subcategory_name_trgm_idx
on public.products using gin (subcategory_name gin_trgm_ops)
where status = 'active' and subcategory_name is not null;

create index if not exists products_active_external_catalog_code_trgm_idx
on public.products using gin (external_catalog_code gin_trgm_ops)
where status = 'active' and external_catalog_code is not null;

create index if not exists product_variants_visible_product_id_idx
on public.product_variants(product_id)
where status <> 'hidden';

create index if not exists product_variants_source_status_idx
on public.product_variants(source, status);

create index if not exists product_variants_type_status_idx
on public.product_variants(type, status);

create index if not exists product_variants_sku_trgm_idx
on public.product_variants using gin (sku gin_trgm_ops);

create index if not exists product_images_product_id_sort_order_idx
on public.product_images(product_id, sort_order);

create or replace view public.catalog_category_options as
select distinct
  products.category_name,
  products.subcategory_name
from public.products
where products.status = 'active'
  and products.category_name is not null;

grant select on public.catalog_category_options to anon, authenticated;
