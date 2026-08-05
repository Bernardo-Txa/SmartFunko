create table if not exists public.preorder_items (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  slug text not null unique,
  title text not null,
  short_description text,
  description text,
  main_image_url text,
  status text not null default 'draft' check (status in ('draft', 'open', 'paused', 'closed', 'archived')),
  price numeric(12,2) not null check (price >= 0),
  category_name text,
  franchise_name text,
  expected_arrival text,
  order_deadline date,
  max_per_customer integer check (max_per_customer is null or max_per_customer > 0),
  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.preorder_item_images (
  id uuid primary key default gen_random_uuid(),
  preorder_item_id uuid not null references public.preorder_items(id) on delete cascade,
  image_url text not null,
  sort_order integer not null default 1,
  created_at timestamptz not null default now()
);

create table if not exists public.preorder_reservations (
  id uuid primary key default gen_random_uuid(),
  reservation_number text not null unique,
  customer_id uuid not null references public.customers(id) on delete restrict,
  v2_order_id uuid not null references public.v2_orders(id) on delete cascade,
  status text not null default 'awaiting_approval' check (status in ('awaiting_approval', 'approved', 'rejected', 'cancelled')),
  total_amount numeric(12,2) not null default 0,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.preorder_reservation_items (
  id uuid primary key default gen_random_uuid(),
  reservation_id uuid not null references public.preorder_reservations(id) on delete cascade,
  preorder_item_id uuid references public.preorder_items(id) on delete set null,
  item_code text not null,
  item_title text not null,
  quantity integer not null check (quantity > 0),
  unit_price numeric(12,2) not null check (unit_price >= 0),
  total_price numeric(12,2) not null check (total_price >= 0),
  created_at timestamptz not null default now()
);

create index if not exists preorder_items_status_idx on public.preorder_items(status);
create index if not exists preorder_items_created_at_idx on public.preorder_items(created_at desc);
create index if not exists preorder_reservations_customer_idx on public.preorder_reservations(customer_id);
create index if not exists preorder_reservations_v2_order_idx on public.preorder_reservations(v2_order_id);
create index if not exists preorder_reservation_items_item_idx on public.preorder_reservation_items(preorder_item_id);

alter table public.v2_orders drop constraint if exists v2_orders_source_check;

alter table public.v2_orders
  add constraint v2_orders_source_check
  check (source in ('admin_whatsapp', 'admin_manual', 'site', 'preorder'));
