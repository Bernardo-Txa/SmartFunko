create or replace function public.is_owner()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.current_profile_role() = 'owner', false)
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

comment on function public.is_owner() is
  'Acesso interno principal da SmartFunko. Apenas socios/donos devem usar a role owner.';

comment on function public.is_admin() is
  'Alias legado para acesso interno. A role principal e owner; admin permanece reservado por compatibilidade.';

alter table public.orders
  add column if not exists public_tracking_enabled boolean not null default true,
  add column if not exists public_token_created_at timestamptz default now();

alter table public.orders
  alter column public_token_created_at set default now();

update public.orders
set public_token_created_at = now()
where public_token_created_at is null;

alter table public.orders
  alter column public_token_created_at set not null;

create table if not exists public.order_status_history (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  order_item_id uuid references public.order_items(id) on delete set null,
  previous_status text,
  new_status text not null,
  notes text,
  changed_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

do $$
declare
  constraint_name text;
begin
  select con.conname
    into constraint_name
  from pg_constraint con
  join pg_attribute att
    on att.attrelid = con.conrelid
   and att.attnum = any(con.conkey)
  where con.conrelid = 'public.order_status_history'::regclass
    and con.contype = 'f'
    and att.attname = 'order_item_id'
  limit 1;

  if constraint_name is not null then
    execute format('alter table public.order_status_history drop constraint %I', constraint_name);
  end if;

  alter table public.order_status_history
    add constraint order_status_history_order_item_id_fkey
    foreign key (order_item_id)
    references public.order_items(id)
    on delete set null;
end $$;

create index if not exists order_status_history_order_id_idx
on public.order_status_history(order_id);

create index if not exists orders_order_number_idx
on public.orders(order_number);

create index if not exists orders_public_token_idx
on public.orders(public_token);

alter table public.products
  add column if not exists category_name text,
  add column if not exists subcategory_name text,
  add column if not exists external_catalog_code text;

create index if not exists products_category_name_idx
on public.products(category_name);

create index if not exists products_subcategory_name_idx
on public.products(subcategory_name);

create index if not exists products_external_catalog_code_idx
on public.products(external_catalog_code);

alter table public.product_variants
  add column if not exists special_label text,
  add column if not exists special_tags text[] not null default '{}';

update public.product_variants
set special_tags = '{}'
where special_tags is null;

alter table public.product_variants
  alter column special_tags set default '{}',
  alter column special_tags set not null;

create index if not exists product_variants_special_tags_idx
on public.product_variants using gin(special_tags);

create table if not exists public.wishlist_items (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  desired_price numeric,
  priority text not null default 'medium' check (priority in ('low', 'medium', 'high')),
  notes text,
  created_at timestamptz not null default now(),
  unique(customer_id, product_id)
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete cascade,
  title text not null,
  message text not null,
  type text not null default 'general',
  read_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.notifications
  add column if not exists customer_id uuid references public.customers(id) on delete cascade,
  add column if not exists title text,
  add column if not exists message text,
  add column if not exists type text,
  add column if not exists read_at timestamptz,
  add column if not exists created_at timestamptz default now();

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'notifications'
      and column_name = 'body'
  ) then
    update public.notifications
    set message = coalesce(nullif(message, ''), nullif(body, ''), nullif(title, ''), 'Atualizacao SmartFunko')
    where message is null or message = '';
  else
    update public.notifications
    set message = coalesce(nullif(message, ''), nullif(title, ''), 'Atualizacao SmartFunko')
    where message is null or message = '';
  end if;
end $$;

update public.notifications
set title = coalesce(nullif(title, ''), 'Notificacao SmartFunko')
where title is null or title = '';

update public.notifications
set type = coalesce(nullif(type, ''), 'general')
where type is null or type = '';

update public.notifications
set created_at = now()
where created_at is null;

alter table public.notifications
  alter column title set not null,
  alter column message set not null,
  alter column type set default 'general',
  alter column type set not null,
  alter column created_at set default now(),
  alter column created_at set not null;

do $$
begin
  if not exists (select 1 from public.notifications where customer_id is null) then
    alter table public.notifications alter column customer_id set not null;
  end if;
end $$;

create table if not exists public.purchase_batches (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  type text not null check (type in ('national', 'international')),
  status text not null default 'open' check (status in ('open', 'closed', 'ordered', 'in_transit', 'received', 'completed', 'cancelled')),
  closing_date date,
  supplier_name text,
  estimated_total_cost numeric not null default 0,
  final_total_cost numeric not null default 0,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.purchase_batch_items (
  id uuid primary key default gen_random_uuid(),
  purchase_batch_id uuid not null references public.purchase_batches(id) on delete cascade,
  order_item_id uuid references public.order_items(id) on delete set null,
  product_variant_id uuid not null references public.product_variants(id) on delete cascade,
  quantity integer not null default 1,
  supplier_cost numeric,
  shipping_cost_share numeric,
  tax_cost_share numeric,
  final_landed_cost numeric,
  status text not null default 'pending' check (status in ('pending', 'ordered', 'shipped', 'received', 'cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

do $$
declare
  constraint_name text;
begin
  select con.conname
    into constraint_name
  from pg_constraint con
  join pg_attribute att
    on att.attrelid = con.conrelid
   and att.attnum = any(con.conkey)
  where con.conrelid = 'public.purchase_batch_items'::regclass
    and con.contype = 'f'
    and att.attname = 'product_variant_id'
  limit 1;

  if constraint_name is not null then
    execute format('alter table public.purchase_batch_items drop constraint %I', constraint_name);
  end if;

  alter table public.purchase_batch_items
    add constraint purchase_batch_items_product_variant_id_fkey
    foreign key (product_variant_id)
    references public.product_variants(id)
    on delete cascade;
end $$;

create index if not exists wishlist_items_customer_id_idx
on public.wishlist_items(customer_id);

create index if not exists wishlist_items_product_id_idx
on public.wishlist_items(product_id);

create index if not exists notifications_customer_id_idx
on public.notifications(customer_id);

create index if not exists notifications_read_at_idx
on public.notifications(read_at);

create index if not exists purchase_batches_status_idx
on public.purchase_batches(status);

create index if not exists purchase_batch_items_batch_id_idx
on public.purchase_batch_items(purchase_batch_id);

create index if not exists purchase_batch_items_order_item_id_idx
on public.purchase_batch_items(order_item_id);

alter table public.wishlist_items enable row level security;
alter table public.notifications enable row level security;
alter table public.order_status_history enable row level security;
alter table public.purchase_batches enable row level security;
alter table public.purchase_batch_items enable row level security;

drop policy if exists "wishlist_select_own_or_admin" on public.wishlist_items;
drop policy if exists "wishlist_insert_own_or_admin" on public.wishlist_items;
drop policy if exists "wishlist_update_own_or_admin" on public.wishlist_items;
drop policy if exists "wishlist_delete_own_or_admin" on public.wishlist_items;

create policy "wishlist_select_own_or_owner"
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

create policy "wishlist_insert_own_or_owner"
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

create policy "wishlist_update_own_or_owner"
on public.wishlist_items for update
using (
  public.is_admin()
  or exists (
    select 1
    from public.customers
    where customers.id = wishlist_items.customer_id
      and customers.profile_id = public.current_profile_id()
  )
)
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

create policy "wishlist_delete_own_or_owner"
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

drop policy if exists "notifications_select_own_or_admin" on public.notifications;
drop policy if exists "notifications_update_own_or_admin" on public.notifications;
drop policy if exists "admin_all_notifications" on public.notifications;
drop policy if exists "notifications_select_own_or_owner" on public.notifications;
drop policy if exists "notifications_update_own_or_owner" on public.notifications;
drop policy if exists "owner_all_notifications" on public.notifications;

create policy "notifications_select_own_or_owner"
on public.notifications for select
using (
  public.is_admin()
  or exists (
    select 1
    from public.customers
    where customers.id = notifications.customer_id
      and customers.profile_id = public.current_profile_id()
  )
);

create policy "notifications_update_own_or_owner"
on public.notifications for update
using (
  public.is_admin()
  or exists (
    select 1
    from public.customers
    where customers.id = notifications.customer_id
      and customers.profile_id = public.current_profile_id()
  )
)
with check (
  public.is_admin()
  or exists (
    select 1
    from public.customers
    where customers.id = notifications.customer_id
      and customers.profile_id = public.current_profile_id()
  )
);

create policy "owner_all_notifications"
on public.notifications for all
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "order_status_history_select_own_or_admin" on public.order_status_history;
drop policy if exists "admin_all_order_status_history" on public.order_status_history;
drop policy if exists "owner_all_order_status_history" on public.order_status_history;

create policy "owner_all_order_status_history"
on public.order_status_history for all
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "admin_all_purchase_batches" on public.purchase_batches;
drop policy if exists "owner_all_purchase_batches" on public.purchase_batches;

create policy "owner_all_purchase_batches"
on public.purchase_batches for all
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "admin_all_purchase_batch_items" on public.purchase_batch_items;
drop policy if exists "owner_all_purchase_batch_items" on public.purchase_batch_items;

create policy "owner_all_purchase_batch_items"
on public.purchase_batch_items for all
using (public.is_admin())
with check (public.is_admin());

create or replace view public.catalog_category_options as
select
  category_name,
  subcategory_name,
  count(*) as product_count
from public.products
where status = 'active'
  and category_name is not null
group by category_name, subcategory_name
order by category_name, subcategory_name;

grant select on public.catalog_category_options to anon, authenticated;
