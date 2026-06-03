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
  if to_regclass('public.order_status_history') is null then
    return;
  end if;

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

create unique index if not exists orders_public_token_idx
on public.orders(public_token);

alter table public.products
  add column if not exists external_catalog_code text;

create index if not exists products_external_catalog_code_idx
on public.products(external_catalog_code);

alter type public.profile_role add value if not exists 'staff' after 'customer';

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references public.profiles(id) on delete cascade,
  customer_id uuid references public.customers(id) on delete cascade,
  order_id uuid references public.orders(id) on delete cascade,
  type text not null,
  title text not null,
  body text,
  data jsonb not null default '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists notifications_profile_id_idx
on public.notifications(profile_id);

create index if not exists notifications_customer_id_idx
on public.notifications(customer_id);

create index if not exists notifications_order_id_idx
on public.notifications(order_id);

create index if not exists notifications_read_at_idx
on public.notifications(read_at);

alter table public.notifications enable row level security;

drop policy if exists "notifications_select_own_or_admin" on public.notifications;
create policy "notifications_select_own_or_admin"
on public.notifications for select
using (
  public.is_admin()
  or profile_id = public.current_profile_id()
  or exists (
    select 1
    from public.customers
    where customers.id = notifications.customer_id
      and customers.profile_id = public.current_profile_id()
  )
);

drop policy if exists "notifications_update_own_or_admin" on public.notifications;
create policy "notifications_update_own_or_admin"
on public.notifications for update
using (
  public.is_admin()
  or profile_id = public.current_profile_id()
  or exists (
    select 1
    from public.customers
    where customers.id = notifications.customer_id
      and customers.profile_id = public.current_profile_id()
  )
)
with check (
  public.is_admin()
  or profile_id = public.current_profile_id()
  or exists (
    select 1
    from public.customers
    where customers.id = notifications.customer_id
      and customers.profile_id = public.current_profile_id()
  )
);

drop policy if exists "admin_all_notifications" on public.notifications;
create policy "admin_all_notifications"
on public.notifications for all
using (public.is_admin())
with check (public.is_admin());
