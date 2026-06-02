do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'orders'
      and column_name = 'public_token'
      and udt_name = 'uuid'
  ) then
    alter table public.orders
      alter column public_token type text using public_token::text;
  end if;
end $$;

alter table public.orders
  add column if not exists public_token text,
  add column if not exists public_token_created_at timestamptz default now(),
  add column if not exists public_tracking_enabled boolean not null default true;

update public.orders
set public_token = gen_random_uuid()::text
where public_token is null;

update public.orders
set public_token_created_at = now()
where public_token_created_at is null;

alter table public.orders
  alter column public_token set default gen_random_uuid()::text,
  alter column public_token set not null,
  alter column public_token_created_at set default now(),
  alter column public_token_created_at set not null;

create table if not exists public.wishlist_items (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  desired_price numeric(12, 2) check (desired_price is null or desired_price >= 0),
  priority text not null default 'medium' check (priority in ('low', 'medium', 'high')),
  notes text,
  created_at timestamptz not null default now(),
  unique (customer_id, product_id)
);

create table if not exists public.purchase_batches (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  type text not null default 'national' check (type in ('national', 'international')),
  status text not null default 'open' check (
    status in ('open', 'closed', 'ordered', 'in_transit', 'received', 'completed', 'cancelled')
  ),
  closing_date date,
  supplier_name text,
  estimated_total_cost numeric(12, 2) not null default 0 check (estimated_total_cost >= 0),
  final_total_cost numeric(12, 2) not null default 0 check (final_total_cost >= 0),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.purchase_batch_items (
  id uuid primary key default gen_random_uuid(),
  purchase_batch_id uuid not null references public.purchase_batches(id) on delete cascade,
  order_item_id uuid references public.order_items(id) on delete set null,
  product_variant_id uuid not null references public.product_variants(id) on delete restrict,
  quantity integer not null default 1 check (quantity > 0),
  supplier_cost numeric(12, 2) check (supplier_cost is null or supplier_cost >= 0),
  shipping_cost_share numeric(12, 2) check (shipping_cost_share is null or shipping_cost_share >= 0),
  tax_cost_share numeric(12, 2) check (tax_cost_share is null or tax_cost_share >= 0),
  final_landed_cost numeric(12, 2) check (final_landed_cost is null or final_landed_cost >= 0),
  status text not null default 'pending' check (
    status in ('pending', 'ordered', 'shipped', 'received', 'cancelled')
  ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.order_status_history (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  order_item_id uuid references public.order_items(id) on delete cascade,
  previous_status text,
  new_status text not null,
  notes text,
  changed_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

drop trigger if exists set_purchase_batches_updated_at on public.purchase_batches;
create trigger set_purchase_batches_updated_at before update on public.purchase_batches
for each row execute function public.set_updated_at();

drop trigger if exists set_purchase_batch_items_updated_at on public.purchase_batch_items;
create trigger set_purchase_batch_items_updated_at before update on public.purchase_batch_items
for each row execute function public.set_updated_at();

create or replace function public.is_owner()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.current_profile_role() = 'owner', false)
$$;

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  new_profile_id uuid;
  display_name text;
begin
  display_name := coalesce(
    nullif(new.raw_user_meta_data->>'name', ''),
    nullif(new.raw_user_meta_data->>'full_name', ''),
    split_part(new.email, '@', 1),
    'Cliente Smart'
  );

  insert into public.profiles (auth_user_id, name, email, role)
  values (new.id, display_name, coalesce(new.email, ''), 'customer')
  on conflict (auth_user_id) do update
  set
    name = excluded.name,
    email = excluded.email
  returning id into new_profile_id;

  insert into public.customers (profile_id, name, email, phone)
  values (
    new_profile_id,
    display_name,
    new.email,
    nullif(new.raw_user_meta_data->>'phone', '')
  )
  on conflict (profile_id) do update
  set
    name = excluded.name,
    email = excluded.email,
    phone = coalesce(excluded.phone, public.customers.phone);

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_auth_user();

create unique index if not exists orders_public_token_idx on public.orders(public_token);
create index if not exists orders_order_number_idx on public.orders(order_number);
create index if not exists order_items_order_id_idx on public.order_items(order_id);
create index if not exists payments_order_id_idx on public.payments(order_id);
create index if not exists cash_entries_order_id_idx on public.cash_entries(order_id);
create index if not exists inventory_items_product_variant_id_idx on public.inventory_items(product_variant_id);
create index if not exists inventory_items_status_idx on public.inventory_items(status);
create index if not exists wishlist_items_customer_id_idx on public.wishlist_items(customer_id);
create index if not exists wishlist_items_product_id_idx on public.wishlist_items(product_id);
create index if not exists purchase_batches_status_idx on public.purchase_batches(status);
create index if not exists purchase_batch_items_batch_id_idx on public.purchase_batch_items(purchase_batch_id);
create index if not exists purchase_batch_items_order_item_id_idx on public.purchase_batch_items(order_item_id);
create index if not exists order_status_history_order_id_idx on public.order_status_history(order_id);

alter table public.wishlist_items enable row level security;
alter table public.purchase_batches enable row level security;
alter table public.purchase_batch_items enable row level security;
alter table public.order_status_history enable row level security;

drop policy if exists "wishlist_select_own_or_admin" on public.wishlist_items;
create policy "wishlist_select_own_or_admin"
on public.wishlist_items for select
using (
  public.is_admin()
  or exists (
    select 1
    from public.customers
    where customers.id = wishlist_items.customer_id
      and customers.profile_id = public.current_profile_id()
  )
);

drop policy if exists "wishlist_insert_own_or_admin" on public.wishlist_items;
create policy "wishlist_insert_own_or_admin"
on public.wishlist_items for insert
with check (
  public.is_admin()
  or exists (
    select 1
    from public.customers
    where customers.id = wishlist_items.customer_id
      and customers.profile_id = public.current_profile_id()
      and customers.status <> 'blocked'
  )
);

drop policy if exists "wishlist_delete_own_or_admin" on public.wishlist_items;
create policy "wishlist_delete_own_or_admin"
on public.wishlist_items for delete
using (
  public.is_admin()
  or exists (
    select 1
    from public.customers
    where customers.id = wishlist_items.customer_id
      and customers.profile_id = public.current_profile_id()
  )
);

drop policy if exists "admin_all_purchase_batches" on public.purchase_batches;
create policy "admin_all_purchase_batches"
on public.purchase_batches for all
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "admin_all_purchase_batch_items" on public.purchase_batch_items;
create policy "admin_all_purchase_batch_items"
on public.purchase_batch_items for all
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "order_status_history_select_own_or_admin" on public.order_status_history;
create policy "order_status_history_select_own_or_admin"
on public.order_status_history for select
using (
  public.is_admin()
  or exists (
    select 1
    from public.orders
    join public.customers on customers.id = orders.customer_id
    where orders.id = order_status_history.order_id
      and customers.profile_id = public.current_profile_id()
  )
);

drop policy if exists "admin_all_order_status_history" on public.order_status_history;
create policy "admin_all_order_status_history"
on public.order_status_history for all
using (public.is_admin())
with check (public.is_admin());
