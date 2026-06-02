create extension if not exists pgcrypto;

create type public.profile_role as enum ('customer', 'admin', 'owner');
create type public.customer_status as enum ('active', 'vip', 'blocked');
create type public.entity_status as enum ('active', 'inactive', 'archived');
create type public.variant_condition as enum ('new', 'used', 'damaged_box');
create type public.variant_type as enum ('common', 'exclusive', 'chase', 'glow', 'special');
create type public.variant_source as enum ('own_stock', 'national', 'international', 'preorder');
create type public.variant_status as enum ('available', 'order_only', 'preorder', 'sold_out', 'hidden');
create type public.inventory_status as enum ('available', 'reserved', 'sold', 'in_transit', 'damaged', 'unavailable');
create type public.order_channel as enum ('whatsapp', 'website', 'admin', 'preorder');
create type public.order_status as enum (
  'draft',
  'pending_payment',
  'partially_paid',
  'paid',
  'processing',
  'ready_to_ship',
  'shipped',
  'delivered',
  'cancelled',
  'refunded'
);
create type public.order_item_source as enum ('stock', 'national_order', 'international_order', 'preorder');
create type public.order_item_status as enum (
  'requested',
  'reserved',
  'waiting_payment',
  'paid',
  'waiting_purchase',
  'purchased',
  'in_transit',
  'received',
  'ready_to_ship',
  'shipped',
  'delivered',
  'cancelled'
);
create type public.payment_method as enum ('pix', 'credit_card', 'debit_card', 'cash', 'manual');
create type public.payment_status as enum ('pending', 'paid', 'failed', 'cancelled', 'refunded');
create type public.cash_entry_type as enum ('income', 'expense', 'adjustment');
create type public.cash_entry_category as enum (
  'sale',
  'supplier_purchase',
  'shipping',
  'payment_fee',
  'refund',
  'manual_adjustment'
);

create table public.profiles (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid not null unique references auth.users(id) on delete cascade,
  name text not null,
  email text not null,
  role public.profile_role not null default 'customer',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.customers (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid unique references public.profiles(id) on delete set null,
  name text not null,
  email text,
  phone text,
  cpf text,
  instagram text,
  status public.customer_status not null default 'active',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.franchises (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  image_url text,
  status public.entity_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  franchise_id uuid references public.franchises(id) on delete set null,
  funko_number text,
  description text,
  main_image_url text,
  status public.entity_status not null default 'active',
  seo_title text,
  seo_description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  sku text not null unique,
  condition public.variant_condition not null default 'new',
  type public.variant_type not null default 'common',
  source public.variant_source not null default 'own_stock',
  sale_price numeric(12, 2) not null check (sale_price >= 0),
  market_price numeric(12, 2) check (market_price is null or market_price >= 0),
  estimated_cost numeric(12, 2) check (estimated_cost is null or estimated_cost >= 0),
  status public.variant_status not null default 'available',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  image_url text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table public.inventory_items (
  id uuid primary key default gen_random_uuid(),
  product_variant_id uuid not null references public.product_variants(id) on delete restrict,
  sku text not null unique,
  status public.inventory_status not null default 'available',
  location text,
  purchase_cost numeric(12, 2) check (purchase_cost is null or purchase_cost >= 0),
  landed_cost numeric(12, 2) check (landed_cost is null or landed_cost >= 0),
  reserved_for_order_item_id uuid,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number text not null unique,
  customer_id uuid not null references public.customers(id) on delete restrict,
  channel public.order_channel not null default 'whatsapp',
  status public.order_status not null default 'draft',
  subtotal numeric(12, 2) not null default 0 check (subtotal >= 0),
  discount numeric(12, 2) not null default 0 check (discount >= 0),
  shipping_amount numeric(12, 2) not null default 0 check (shipping_amount >= 0),
  total numeric(12, 2) not null default 0 check (total >= 0),
  public_token uuid not null default gen_random_uuid(),
  notes text,
  internal_notes text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_variant_id uuid not null references public.product_variants(id) on delete restrict,
  inventory_item_id uuid unique references public.inventory_items(id) on delete set null,
  quantity integer not null default 1 check (quantity > 0),
  unit_price numeric(12, 2) not null check (unit_price >= 0),
  total_price numeric(12, 2) not null check (total_price >= 0),
  cost_estimate numeric(12, 2) check (cost_estimate is null or cost_estimate >= 0),
  final_cost numeric(12, 2) check (final_cost is null or final_cost >= 0),
  source public.order_item_source not null default 'stock',
  status public.order_item_status not null default 'requested',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.inventory_items
  add constraint inventory_items_reserved_for_order_item_id_fkey
  foreign key (reserved_for_order_item_id)
  references public.order_items(id)
  on delete set null;

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete restrict,
  customer_id uuid not null references public.customers(id) on delete restrict,
  method public.payment_method not null,
  amount numeric(12, 2) not null check (amount > 0),
  fee_amount numeric(12, 2) not null default 0 check (fee_amount >= 0),
  net_amount numeric(12, 2) not null check (net_amount >= 0),
  status public.payment_status not null default 'pending',
  paid_at timestamptz,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.cash_entries (
  id uuid primary key default gen_random_uuid(),
  type public.cash_entry_type not null,
  category public.cash_entry_category not null,
  order_id uuid references public.orders(id) on delete set null,
  payment_id uuid references public.payments(id) on delete set null,
  amount numeric(12, 2) not null,
  description text,
  occurred_at timestamptz not null default now(),
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.admin_action_logs (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid references public.profiles(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  old_value jsonb,
  new_value jsonb,
  created_at timestamptz not null default now()
);

create index customers_profile_id_idx on public.customers(profile_id);
create index customers_email_idx on public.customers(email);
create index customers_phone_idx on public.customers(phone);
create index products_franchise_id_idx on public.products(franchise_id);
create index product_variants_product_id_idx on public.product_variants(product_id);
create index inventory_items_product_variant_id_idx on public.inventory_items(product_variant_id);
create index inventory_items_status_idx on public.inventory_items(status);
create index orders_customer_id_idx on public.orders(customer_id);
create index order_items_order_id_idx on public.order_items(order_id);
create index payments_order_id_idx on public.payments(order_id);
create index cash_entries_order_id_idx on public.cash_entries(order_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger set_profiles_updated_at before update on public.profiles
for each row execute function public.set_updated_at();
create trigger set_customers_updated_at before update on public.customers
for each row execute function public.set_updated_at();
create trigger set_franchises_updated_at before update on public.franchises
for each row execute function public.set_updated_at();
create trigger set_products_updated_at before update on public.products
for each row execute function public.set_updated_at();
create trigger set_product_variants_updated_at before update on public.product_variants
for each row execute function public.set_updated_at();
create trigger set_inventory_items_updated_at before update on public.inventory_items
for each row execute function public.set_updated_at();
create trigger set_orders_updated_at before update on public.orders
for each row execute function public.set_updated_at();
create trigger set_order_items_updated_at before update on public.order_items
for each row execute function public.set_updated_at();

create or replace function public.current_profile_role()
returns public.profile_role
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where auth_user_id = auth.uid()
$$;

create or replace function public.current_profile_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select id from public.profiles where auth_user_id = auth.uid()
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.current_profile_role() in ('admin', 'owner'), false)
$$;

alter table public.profiles enable row level security;
alter table public.customers enable row level security;
alter table public.franchises enable row level security;
alter table public.products enable row level security;
alter table public.product_variants enable row level security;
alter table public.product_images enable row level security;
alter table public.inventory_items enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.payments enable row level security;
alter table public.cash_entries enable row level security;
alter table public.admin_action_logs enable row level security;

create policy "profiles_select_own_or_admin"
on public.profiles for select
using (auth_user_id = auth.uid() or public.is_admin());

create policy "profiles_update_own"
on public.profiles for update
using (auth_user_id = auth.uid())
with check (auth_user_id = auth.uid());

create policy "customers_select_own_or_admin"
on public.customers for select
using (
  profile_id = public.current_profile_id()
  or public.is_admin()
);

create policy "public_franchises_select_active"
on public.franchises for select
using (status = 'active' or public.is_admin());

create policy "public_products_select_active"
on public.products for select
using (status = 'active' or public.is_admin());

create policy "public_product_variants_select_visible"
on public.product_variants for select
using (status <> 'hidden' or public.is_admin());

create policy "public_product_images_select"
on public.product_images for select
using (
  exists (
    select 1 from public.products
    where products.id = product_images.product_id
      and (products.status = 'active' or public.is_admin())
  )
);

create policy "orders_select_own_or_admin"
on public.orders for select
using (
  public.is_admin()
  or exists (
    select 1
    from public.customers
    where customers.id = orders.customer_id
      and customers.profile_id = public.current_profile_id()
  )
);

create policy "order_items_select_own_or_admin"
on public.order_items for select
using (
  public.is_admin()
  or exists (
    select 1
    from public.orders
    join public.customers on customers.id = orders.customer_id
    where orders.id = order_items.order_id
      and customers.profile_id = public.current_profile_id()
  )
);

create policy "payments_select_own_or_admin"
on public.payments for select
using (
  public.is_admin()
  or exists (
    select 1
    from public.customers
    where customers.id = payments.customer_id
      and customers.profile_id = public.current_profile_id()
  )
);

create policy "admin_all_customers" on public.customers
for all using (public.is_admin()) with check (public.is_admin());
create policy "admin_all_franchises" on public.franchises
for all using (public.is_admin()) with check (public.is_admin());
create policy "admin_all_products" on public.products
for all using (public.is_admin()) with check (public.is_admin());
create policy "admin_all_product_variants" on public.product_variants
for all using (public.is_admin()) with check (public.is_admin());
create policy "admin_all_product_images" on public.product_images
for all using (public.is_admin()) with check (public.is_admin());
create policy "admin_all_inventory_items" on public.inventory_items
for all using (public.is_admin()) with check (public.is_admin());
create policy "admin_all_orders" on public.orders
for all using (public.is_admin()) with check (public.is_admin());
create policy "admin_all_order_items" on public.order_items
for all using (public.is_admin()) with check (public.is_admin());
create policy "admin_all_payments" on public.payments
for all using (public.is_admin()) with check (public.is_admin());
create policy "admin_all_cash_entries" on public.cash_entries
for all using (public.is_admin()) with check (public.is_admin());
create policy "admin_all_action_logs" on public.admin_action_logs
for all using (public.is_admin()) with check (public.is_admin());
