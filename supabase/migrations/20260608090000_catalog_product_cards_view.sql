create or replace view public.catalog_product_cards as
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
  ) as has_special_variant
from public.products
left join public.franchises
  on franchises.id = products.franchise_id
left join public.suppliers
  on suppliers.id = products.supplier_id
  and suppliers.status = 'active'
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
where products.status = 'active';

create index if not exists products_active_created_at_idx
on public.products(created_at desc)
where status = 'active';

create index if not exists product_variants_visible_product_price_idx
on public.product_variants(product_id, sale_price)
where status <> 'hidden';

grant select on public.catalog_product_cards to anon, authenticated;
