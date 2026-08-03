create table if not exists public.rare_collectibles (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null unique references public.products(id) on delete cascade,
  variant_id uuid references public.product_variants(id) on delete set null,
  status text not null default 'draft',
  public_visibility text not null default 'visible',
  category text not null default 'Cultura Pop',
  tags text[] not null default '{}',
  short_title text,
  story text,
  signer_name text,
  signer_role text,
  autograph_date date,
  autograph_location text,
  serial_number text,
  certifier_name text,
  certificate_type text,
  authentication_code text,
  verification_url text,
  authenticity_notes text,
  included_items text[] not null default '{}',
  condition_notes text,
  collectible_year text,
  edition text,
  quantity_available integer not null default 1,
  installments_max integer not null default 10,
  purchase_mode text not null default 'whatsapp',
  checkout_url text,
  whatsapp_url text,
  allow_reservation boolean not null default false,
  reservation_days integer,
  availability_message text,
  is_public boolean not null default true,
  is_featured boolean not null default false,
  display_order integer not null default 0,
  badge_label text not null default 'Autenticidade certificada',
  sold_visibility text not null default 'visible',
  cover_image_url text,
  serial_image_url text,
  certificate_image_url text,
  authentication_image_url text,
  packaging_image_url text,
  seo_title text,
  seo_description text,
  share_image_url text,
  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint rare_collectibles_status_check
    check (status in ('draft', 'available', 'reserved', 'sold', 'archived')),
  constraint rare_collectibles_public_visibility_check
    check (public_visibility in ('visible', 'hidden', 'archive')),
  constraint rare_collectibles_sold_visibility_check
    check (sold_visibility in ('visible', 'hidden', 'archive')),
  constraint rare_collectibles_purchase_mode_check
    check (purchase_mode in ('checkout', 'whatsapp', 'manual')),
  constraint rare_collectibles_quantity_check
    check (quantity_available >= 0),
  constraint rare_collectibles_installments_check
    check (installments_max between 1 and 24),
  constraint rare_collectibles_reservation_days_check
    check (reservation_days is null or reservation_days between 1 and 30)
);

create unique index if not exists rare_collectibles_serial_number_unique
on public.rare_collectibles(lower(serial_number))
where serial_number is not null and btrim(serial_number) <> '';

create unique index if not exists rare_collectibles_authentication_code_unique
on public.rare_collectibles(lower(authentication_code))
where authentication_code is not null and btrim(authentication_code) <> '';

create index if not exists rare_collectibles_status_idx
on public.rare_collectibles(status);

create index if not exists rare_collectibles_public_idx
on public.rare_collectibles(is_public, status, is_featured, display_order);

create index if not exists rare_collectibles_category_idx
on public.rare_collectibles(category);

create index if not exists rare_collectibles_tags_idx
on public.rare_collectibles using gin(tags);

create table if not exists public.rare_collectible_status_history (
  id uuid primary key default gen_random_uuid(),
  rare_collectible_id uuid not null references public.rare_collectibles(id) on delete cascade,
  old_status text,
  new_status text not null,
  changed_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.rare_collectible_price_history (
  id uuid primary key default gen_random_uuid(),
  rare_collectible_id uuid not null references public.rare_collectibles(id) on delete cascade,
  old_price numeric(12, 2),
  new_price numeric(12, 2) not null,
  changed_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists rare_collectible_status_history_collectible_idx
on public.rare_collectible_status_history(rare_collectible_id, created_at desc);

create index if not exists rare_collectible_price_history_collectible_idx
on public.rare_collectible_price_history(rare_collectible_id, created_at desc);

drop trigger if exists set_rare_collectibles_updated_at on public.rare_collectibles;
create trigger set_rare_collectibles_updated_at
before update on public.rare_collectibles
for each row execute function public.set_updated_at();

alter table public.rare_collectibles enable row level security;
alter table public.rare_collectible_status_history enable row level security;
alter table public.rare_collectible_price_history enable row level security;

drop policy if exists "public_rare_collectibles_select_visible" on public.rare_collectibles;
create policy "public_rare_collectibles_select_visible"
on public.rare_collectibles for select
using (
  public.is_admin()
  or (
    is_public = true
    and status in ('available', 'reserved', 'sold')
    and public_visibility <> 'hidden'
    and not (status = 'sold' and sold_visibility = 'hidden')
  )
);

drop policy if exists "admin_all_rare_collectibles" on public.rare_collectibles;
create policy "admin_all_rare_collectibles"
on public.rare_collectibles for all
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "admin_all_rare_collectible_status_history" on public.rare_collectible_status_history;
create policy "admin_all_rare_collectible_status_history"
on public.rare_collectible_status_history for all
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "admin_all_rare_collectible_price_history" on public.rare_collectible_price_history;
create policy "admin_all_rare_collectible_price_history"
on public.rare_collectible_price_history for all
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "public_rare_collectible_status_history_select_none" on public.rare_collectible_status_history;
create policy "public_rare_collectible_status_history_select_none"
on public.rare_collectible_status_history for select
using (false);

drop policy if exists "public_rare_collectible_price_history_select_none" on public.rare_collectible_price_history;
create policy "public_rare_collectible_price_history_select_none"
on public.rare_collectible_price_history for select
using (false);

insert into public.rare_collectibles (
  product_id,
  variant_id,
  status,
  public_visibility,
  category,
  tags,
  short_title,
  signer_name,
  serial_number,
  certifier_name,
  certificate_type,
  authentication_code,
  authenticity_notes,
  included_items,
  edition,
  quantity_available,
  installments_max,
  purchase_mode,
  is_public,
  is_featured,
  badge_label,
  sold_visibility,
  cover_image_url,
  seo_title,
  seo_description,
  created_at,
  updated_at
)
select
  products.id,
  primary_variant.id,
  case
    when primary_variant.status = 'sold_out' then 'sold'
    when primary_variant.status = 'hidden' then 'archived'
    else 'available'
  end,
  'visible',
  coalesce(nullif(products.category_name, ''), 'Cultura Pop'),
  array_remove(array_cat(coalesce(primary_variant.special_tags, '{}'), array[coalesce(primary_variant.special_label, '')]), ''),
  products.name,
  legacy_meta.signer_name,
  legacy_meta.serial_number,
  legacy_meta.certifier_name,
  legacy_meta.certificate_type,
  legacy_meta.authentication_code,
  legacy_meta.authenticity_notes,
  coalesce(legacy_meta.included_items, '{}'),
  products.subcategory_name,
  case when primary_variant.status = 'sold_out' then 0 else 1 end,
  10,
  'whatsapp',
  true,
  false,
  coalesce(primary_variant.special_label, 'Autenticidade certificada'),
  'visible',
  products.main_image_url,
  products.seo_title,
  products.seo_description,
  products.created_at,
  products.updated_at
from public.products
join lateral (
  select product_variants.*
  from public.product_variants
  where product_variants.product_id = products.id
    and (
      product_variants.type <> 'common'
      or product_variants.special_label is not null
      or cardinality(coalesce(product_variants.special_tags, '{}')) > 0
    )
  order by
    case when product_variants.status = 'available' then 0 else 1 end,
    product_variants.created_at asc
  limit 1
) primary_variant on true
left join lateral (
  select
    max(nullif(btrim(substring(tag from '^Autografado por[[:space:]]+(.+)$')), '')) as signer_name,
    max(nullif(btrim(substring(tag from '^Numero de serie:[[:space:]]*(.+)$')), '')) as serial_number,
    max(nullif(btrim(substring(tag from '^Certificadora:[[:space:]]*(.+)$')), '')) as certifier_name,
    max(nullif(btrim(substring(tag from '^Certificado:[[:space:]]*(.+)$')), '')) as certificate_type,
    max(nullif(btrim(substring(tag from '^Codigo de autenticacao:[[:space:]]*(.+)$')), '')) as authentication_code,
    max(nullif(btrim(substring(tag from '^Procedencia:[[:space:]]*(.+)$')), '')) as authenticity_notes,
    array_remove(
      array_agg(nullif(btrim(substring(tag from '^Inclui:[[:space:]]*(.+)$')), ''))
        filter (where tag ilike 'Inclui:%'),
      null
    ) as included_items
  from unnest(coalesce(primary_variant.special_tags, '{}')) as tag
) legacy_meta on true
where not exists (
  select 1
  from public.rare_collectibles existing
  where existing.product_id = products.id
);

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
  ) as has_special_variant,
  products.product_type
from public.products
left join public.franchises
  on franchises.id = products.franchise_id
left join public.suppliers
  on suppliers.id = products.supplier_id
  and suppliers.status = 'active'
left join public.rare_collectibles
  on rare_collectibles.product_id = products.id
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
  and rare_collectibles.id is null;

grant select on public.catalog_product_cards to anon, authenticated;
