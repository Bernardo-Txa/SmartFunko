alter type public.cash_entry_category add value if not exists 'raffle';

create table if not exists public.raffle_campaigns (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  slug text not null unique,
  title text not null,
  description text,
  prize_title text not null,
  prize_description text,
  prize_image_url text,
  product_id uuid references public.products(id) on delete set null,
  product_variant_id uuid references public.product_variants(id) on delete set null,
  status text not null default 'draft' check (
    status in (
      'draft',
      'pending_authorization',
      'published',
      'open',
      'paused',
      'sold_out',
      'closed',
      'drawn',
      'cancelled'
    )
  ),
  number_start integer not null default 1,
  number_end integer not null,
  total_numbers integer not null,
  price_per_number numeric(12, 2) not null check (price_per_number > 0),
  max_numbers_per_customer integer check (max_numbers_per_customer is null or max_numbers_per_customer > 0),
  reservation_minutes integer not null default 15 check (reservation_minutes > 0),
  starts_at timestamptz,
  ends_at timestamptz,
  draw_at timestamptz,
  requires_authorization boolean not null default true,
  legal_authorization_code text,
  legal_authorization_url text,
  rules text,
  draw_method text not null default 'manual_external' check (
    draw_method in ('manual_external', 'internal_random')
  ),
  draw_reference text,
  terms_accepted_by_admin boolean not null default false,
  winner_customer_id uuid references public.customers(id) on delete set null,
  winner_raffle_number_id uuid,
  drawn_at timestamptz,
  draw_notes text,
  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (number_end >= number_start),
  check (total_numbers = number_end - number_start + 1)
);

create table if not exists public.raffle_numbers (
  id uuid primary key default gen_random_uuid(),
  raffle_campaign_id uuid not null references public.raffle_campaigns(id) on delete cascade,
  number integer not null,
  label text not null,
  status text not null default 'available' check (
    status in (
      'available',
      'reserved',
      'pending_payment',
      'sold',
      'cancelled',
      'winner'
    )
  ),
  customer_id uuid references public.customers(id) on delete set null,
  raffle_order_id uuid,
  reserved_until timestamptz,
  sold_at timestamptz,
  cancelled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (raffle_campaign_id, number),
  unique (raffle_campaign_id, label)
);

create table if not exists public.raffle_orders (
  id uuid primary key default gen_random_uuid(),
  raffle_campaign_id uuid not null references public.raffle_campaigns(id) on delete cascade,
  customer_id uuid not null references public.customers(id) on delete cascade,
  order_number text not null unique,
  status text not null default 'pending_payment' check (
    status in (
      'reserved',
      'pending_payment',
      'paid',
      'expired',
      'cancelled',
      'refunded'
    )
  ),
  quantity integer not null check (quantity > 0),
  unit_price numeric(12, 2) not null,
  total_amount numeric(12, 2) not null,
  payment_id uuid references public.payments(id) on delete set null,
  cash_entry_id uuid references public.cash_entries(id) on delete set null,
  reserved_until timestamptz,
  paid_at timestamptz,
  cancelled_at timestamptz,
  expired_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.raffle_numbers
  drop constraint if exists raffle_numbers_order_fk;

alter table public.raffle_numbers
  add constraint raffle_numbers_order_fk
  foreign key (raffle_order_id)
  references public.raffle_orders(id)
  on delete set null;

alter table public.raffle_campaigns
  drop constraint if exists raffle_campaigns_winner_raffle_number_fk;

alter table public.raffle_campaigns
  add constraint raffle_campaigns_winner_raffle_number_fk
  foreign key (winner_raffle_number_id)
  references public.raffle_numbers(id)
  on delete set null;

create table if not exists public.raffle_draw_audit_logs (
  id uuid primary key default gen_random_uuid(),
  raffle_campaign_id uuid not null references public.raffle_campaigns(id) on delete cascade,
  action text not null,
  payload jsonb,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists raffle_campaigns_status_idx on public.raffle_campaigns(status);
create index if not exists raffle_campaigns_slug_idx on public.raffle_campaigns(slug);
create index if not exists raffle_numbers_campaign_status_idx on public.raffle_numbers(raffle_campaign_id, status);
create index if not exists raffle_numbers_customer_id_idx on public.raffle_numbers(customer_id);
create index if not exists raffle_orders_campaign_id_idx on public.raffle_orders(raffle_campaign_id);
create index if not exists raffle_orders_customer_id_idx on public.raffle_orders(customer_id);
create index if not exists raffle_orders_status_idx on public.raffle_orders(status);

drop trigger if exists set_raffle_campaigns_updated_at on public.raffle_campaigns;
create trigger set_raffle_campaigns_updated_at before update on public.raffle_campaigns
for each row execute function public.set_updated_at();

drop trigger if exists set_raffle_numbers_updated_at on public.raffle_numbers;
create trigger set_raffle_numbers_updated_at before update on public.raffle_numbers
for each row execute function public.set_updated_at();

drop trigger if exists set_raffle_orders_updated_at on public.raffle_orders;
create trigger set_raffle_orders_updated_at before update on public.raffle_orders
for each row execute function public.set_updated_at();

create or replace function public.expire_raffle_reservations()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_expired_order_ids uuid[];
  v_count integer := 0;
begin
  select coalesce(array_agg(id), array[]::uuid[])
    into v_expired_order_ids
  from public.raffle_orders
  where status in ('reserved', 'pending_payment')
    and reserved_until is not null
    and reserved_until < now()
  for update;

  if coalesce(array_length(v_expired_order_ids, 1), 0) = 0 then
    return 0;
  end if;

  update public.raffle_orders
  set status = 'expired',
      expired_at = now()
  where id = any(v_expired_order_ids);

  get diagnostics v_count = row_count;

  update public.raffle_numbers
  set status = 'available',
      customer_id = null,
      raffle_order_id = null,
      reserved_until = null
  where raffle_order_id = any(v_expired_order_ids)
    and status in ('reserved', 'pending_payment');

  insert into public.raffle_draw_audit_logs (raffle_campaign_id, action, payload)
  select distinct raffle_campaign_id,
    'reservation.expired',
    jsonb_build_object('raffle_order_ids', v_expired_order_ids)
  from public.raffle_orders
  where id = any(v_expired_order_ids);

  return v_count;
end;
$$;

create or replace function public.reserve_raffle_numbers(
  p_campaign_id uuid,
  p_customer_id uuid,
  p_numbers integer[]
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_campaign record;
  v_distinct_numbers integer[];
  v_quantity integer;
  v_reserved_until timestamptz;
  v_order_id uuid;
  v_order_number text;
  v_existing_count integer;
  v_locked_count integer;
  v_labels text[];
begin
  perform public.expire_raffle_reservations();

  if p_customer_id is null then
    raise exception 'Cliente obrigatorio';
  end if;

  select array_agg(distinct n order by n)
    into v_distinct_numbers
  from unnest(p_numbers) as n;

  v_quantity := coalesce(array_length(v_distinct_numbers, 1), 0);

  if v_quantity = 0 then
    raise exception 'Informe ao menos um numero';
  end if;

  if v_quantity <> coalesce(array_length(p_numbers, 1), 0) then
    raise exception 'Numeros duplicados na reserva';
  end if;

  select *
    into v_campaign
  from public.raffle_campaigns
  where id = p_campaign_id
  for update;

  if not found then
    raise exception 'Campanha nao encontrada';
  end if;

  if v_campaign.status <> 'open' then
    raise exception 'Campanha nao esta aberta para reservas';
  end if;

  if v_campaign.starts_at is not null and v_campaign.starts_at > now() then
    raise exception 'Campanha ainda nao iniciou';
  end if;

  if v_campaign.ends_at is not null and v_campaign.ends_at < now() then
    raise exception 'Campanha encerrada';
  end if;

  if exists (
    select 1
    from unnest(v_distinct_numbers) as requested(number)
    where requested.number < v_campaign.number_start
       or requested.number > v_campaign.number_end
  ) then
    raise exception 'Numero fora do intervalo da campanha';
  end if;

  if v_campaign.max_numbers_per_customer is not null then
    select count(*)
      into v_existing_count
    from public.raffle_numbers
    where raffle_campaign_id = p_campaign_id
      and customer_id = p_customer_id
      and status in ('reserved', 'pending_payment', 'sold', 'winner');

    if v_existing_count + v_quantity > v_campaign.max_numbers_per_customer then
      raise exception 'Limite de numeros por cliente excedido';
    end if;
  end if;

  with locked_numbers as (
    select id
    from public.raffle_numbers
    where raffle_campaign_id = p_campaign_id
      and number = any(v_distinct_numbers)
      and status = 'available'
    for update
  )
  select count(*)
    into v_locked_count
  from locked_numbers;

  if v_locked_count <> v_quantity then
    raise exception 'Um ou mais numeros nao estao disponiveis';
  end if;

  v_reserved_until := now() + make_interval(mins => v_campaign.reservation_minutes);
  v_order_number := concat(
    'RF-',
    v_campaign.code,
    '-',
    to_char(now(), 'YYYYMMDDHH24MISS'),
    '-',
    upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 4))
  );

  insert into public.raffle_orders (
    raffle_campaign_id,
    customer_id,
    order_number,
    status,
    quantity,
    unit_price,
    total_amount,
    reserved_until
  )
  values (
    p_campaign_id,
    p_customer_id,
    v_order_number,
    'pending_payment',
    v_quantity,
    v_campaign.price_per_number,
    v_quantity * v_campaign.price_per_number,
    v_reserved_until
  )
  returning id into v_order_id;

  update public.raffle_numbers
  set status = 'pending_payment',
      customer_id = p_customer_id,
      raffle_order_id = v_order_id,
      reserved_until = v_reserved_until
  where raffle_campaign_id = p_campaign_id
    and number = any(v_distinct_numbers);

  select array_agg(label order by number)
    into v_labels
  from public.raffle_numbers
  where raffle_order_id = v_order_id;

  if not exists (
    select 1
    from public.raffle_numbers
    where raffle_campaign_id = p_campaign_id
      and status = 'available'
  ) then
    update public.raffle_campaigns
    set status = 'sold_out'
    where id = p_campaign_id;
  end if;

  insert into public.raffle_draw_audit_logs (
    raffle_campaign_id,
    action,
    payload
  )
  values (
    p_campaign_id,
    'reservation.created',
    jsonb_build_object(
      'raffle_order_id', v_order_id,
      'customer_id', p_customer_id,
      'numbers', v_distinct_numbers,
      'reserved_until', v_reserved_until
    )
  );

  return jsonb_build_object(
    'orderId', v_order_id,
    'orderNumber', v_order_number,
    'reservedUntil', v_reserved_until,
    'totalAmount', v_quantity * v_campaign.price_per_number,
    'numbers', v_labels
  );
end;
$$;

alter table public.raffle_campaigns enable row level security;
alter table public.raffle_numbers enable row level security;
alter table public.raffle_orders enable row level security;
alter table public.raffle_draw_audit_logs enable row level security;

drop policy if exists "public_read_published_raffle_campaigns" on public.raffle_campaigns;
create policy "public_read_published_raffle_campaigns"
on public.raffle_campaigns for select
using (status in ('published', 'open', 'sold_out', 'closed', 'drawn') or public.is_owner());

drop policy if exists "owner_all_raffle_campaigns" on public.raffle_campaigns;
create policy "owner_all_raffle_campaigns"
on public.raffle_campaigns for all
using (public.is_owner())
with check (public.is_owner());

drop policy if exists "public_read_public_raffle_numbers" on public.raffle_numbers;
create policy "public_read_public_raffle_numbers"
on public.raffle_numbers for select
using (
  exists (
    select 1
    from public.raffle_campaigns c
    where c.id = raffle_campaign_id
      and c.status in ('published', 'open', 'sold_out', 'closed', 'drawn')
  )
  or customer_id in (
    select id from public.customers where profile_id = public.current_profile_id()
  )
  or public.is_owner()
);

drop policy if exists "owner_all_raffle_numbers" on public.raffle_numbers;
create policy "owner_all_raffle_numbers"
on public.raffle_numbers for all
using (public.is_owner())
with check (public.is_owner());

drop policy if exists "customer_read_own_raffle_orders" on public.raffle_orders;
create policy "customer_read_own_raffle_orders"
on public.raffle_orders for select
using (
  customer_id in (
    select id from public.customers where profile_id = public.current_profile_id()
  )
  or public.is_owner()
);

drop policy if exists "owner_all_raffle_orders" on public.raffle_orders;
create policy "owner_all_raffle_orders"
on public.raffle_orders for all
using (public.is_owner())
with check (public.is_owner());

drop policy if exists "owner_all_raffle_draw_audit_logs" on public.raffle_draw_audit_logs;
create policy "owner_all_raffle_draw_audit_logs"
on public.raffle_draw_audit_logs for all
using (public.is_owner())
with check (public.is_owner());
