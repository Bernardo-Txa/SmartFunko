alter table public.products
  add column if not exists category_name text,
  add column if not exists subcategory_name text,
  add column if not exists external_catalog_code text;

alter table public.product_variants
  add column if not exists special_label text,
  add column if not exists special_tags text[] not null default '{}';

create index if not exists products_category_name_idx on public.products(category_name);
create index if not exists products_subcategory_name_idx on public.products(subcategory_name);
create index if not exists products_external_catalog_code_idx on public.products(external_catalog_code);
create index if not exists product_variants_special_tags_idx
on public.product_variants using gin(special_tags);

create unique index if not exists product_images_product_id_image_url_idx
on public.product_images(product_id, image_url);
