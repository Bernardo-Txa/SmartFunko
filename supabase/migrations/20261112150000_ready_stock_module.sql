create table public.ready_stock_items (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  slug text not null unique,
  title text not null,
  description text,
  main_image_url text,
  status text not null default 'draft' check (status in ('draft', 'open', 'paused', 'archived')),
  price numeric(12,2) not null check (price > 0),
  category_name text,
  franchise_name text,
  quantity integer not null default 0 check (quantity >= 0),
  reserved_quantity integer not null default 0 check (reserved_quantity >= 0 and reserved_quantity <= quantity),
  max_per_customer integer check (max_per_customer is null or max_per_customer > 0),
  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.ready_stock_orders (
  id uuid primary key default gen_random_uuid(),
  order_number text not null unique,
  checkout_number text not null unique,
  customer_id uuid not null references public.customers(id) on delete restrict,
  v2_order_id uuid references public.v2_orders(id) on delete set null,
  status text not null default 'pending_payment' check (status in ('pending_payment','paid','failed','expired','cancelled','manual_review')),
  payment_status text not null default 'pending' check (payment_status in ('pending','checkout_generated','paid','failed','expired','cancelled','manual_review')),
  total_amount numeric(12,2) not null check (total_amount > 0),
  notes text,
  payment_link_url text,
  provider_reference text,
  invoice_slug text,
  transaction_nsu text,
  receipt_url text,
  paid_amount numeric(12,2),
  provider_fee_amount numeric(12,2),
  paid_installments integer,
  request_payload jsonb,
  provider_payload jsonb,
  expires_at timestamptz not null default (now() + interval '30 minutes'),
  paid_at timestamptz,
  stock_released_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.ready_stock_order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.ready_stock_orders(id) on delete cascade,
  ready_stock_item_id uuid references public.ready_stock_items(id) on delete set null,
  item_code text not null,
  item_title text not null,
  quantity integer not null check (quantity > 0),
  unit_price numeric(12,2) not null check (unit_price > 0),
  total_price numeric(12,2) not null check (total_price > 0),
  created_at timestamptz not null default now()
);

create index ready_stock_items_status_idx on public.ready_stock_items(status);
create index ready_stock_orders_customer_idx on public.ready_stock_orders(customer_id);
create index ready_stock_orders_expires_idx on public.ready_stock_orders(expires_at) where status = 'pending_payment';
create index ready_stock_order_items_item_idx on public.ready_stock_order_items(ready_stock_item_id);

alter table public.ready_stock_items enable row level security;
alter table public.ready_stock_orders enable row level security;
alter table public.ready_stock_order_items enable row level security;

create or replace function public.reserve_ready_stock_order(
  p_order_id uuid,
  p_items jsonb
) returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  requested jsonb;
  stock_item public.ready_stock_items%rowtype;
  requested_quantity integer;
begin
  for requested in select value from jsonb_array_elements(p_items)
  loop
    requested_quantity := (requested->>'quantity')::integer;

    select * into stock_item
    from public.ready_stock_items
    where id = (requested->>'itemId')::uuid
    for update;

    if stock_item.id is null or stock_item.status <> 'open' then
      raise exception 'Produto indisponivel';
    end if;

    if requested_quantity <= 0 or requested_quantity > (stock_item.quantity - stock_item.reserved_quantity) then
      raise exception 'Estoque insuficiente para %', stock_item.title;
    end if;

    if stock_item.max_per_customer is not null and requested_quantity > stock_item.max_per_customer then
      raise exception 'Limite por cliente excedido para %', stock_item.title;
    end if;

    update public.ready_stock_items
    set reserved_quantity = reserved_quantity + requested_quantity, updated_at = now()
    where id = stock_item.id;

    insert into public.ready_stock_order_items (
      order_id, ready_stock_item_id, item_code, item_title, quantity, unit_price, total_price
    ) values (
      p_order_id, stock_item.id, stock_item.code, stock_item.title, requested_quantity,
      stock_item.price, round(stock_item.price * requested_quantity, 2)
    );
  end loop;
end;
$$;

create or replace function public.release_ready_stock_order(p_order_id uuid)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  update public.ready_stock_items item
  set reserved_quantity = greatest(0, item.reserved_quantity - order_item.quantity), updated_at = now()
  from public.ready_stock_order_items order_item
  where order_item.order_id = p_order_id and order_item.ready_stock_item_id = item.id;

  update public.ready_stock_orders
  set stock_released_at = coalesce(stock_released_at, now()), updated_at = now()
  where id = p_order_id;
end;
$$;

create or replace function public.finalize_ready_stock_order(p_order_id uuid)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  update public.ready_stock_items item
  set quantity = greatest(0, item.quantity - order_item.quantity),
      reserved_quantity = greatest(0, item.reserved_quantity - order_item.quantity),
      updated_at = now()
  from public.ready_stock_order_items order_item
  where order_item.order_id = p_order_id and order_item.ready_stock_item_id = item.id;
end;
$$;

revoke all on function public.reserve_ready_stock_order(uuid, jsonb) from public, anon, authenticated;
revoke all on function public.release_ready_stock_order(uuid) from public, anon, authenticated;
revoke all on function public.finalize_ready_stock_order(uuid) from public, anon, authenticated;
grant execute on function public.reserve_ready_stock_order(uuid, jsonb) to service_role;
grant execute on function public.release_ready_stock_order(uuid) to service_role;
grant execute on function public.finalize_ready_stock_order(uuid) to service_role;

grant select, insert, update, delete on public.ready_stock_items to service_role;
grant select, insert, update, delete on public.ready_stock_orders to service_role;
grant select, insert, update, delete on public.ready_stock_order_items to service_role;
