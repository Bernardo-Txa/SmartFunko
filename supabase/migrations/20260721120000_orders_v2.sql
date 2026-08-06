create table if not exists public.v2_order_competencies (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  label text not null,
  starts_on date not null,
  ends_on date not null,
  status text not null default 'open'
    check (status in ('open', 'closed', 'archived')),
  notes text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint v2_order_competencies_period_check check (starts_on <= ends_on)
);

create table if not exists public.v2_orders (
  id uuid primary key default gen_random_uuid(),
  order_number text not null unique,
  customer_id uuid not null references public.customers(id) on delete restrict,
  competence_id uuid not null references public.v2_order_competencies(id) on delete restrict,
  source text not null default 'admin_whatsapp'
    check (source in ('admin_whatsapp', 'admin_manual', 'site')),
  order_date date not null default current_date,
  approval_status text not null default 'aprovado'
    check (approval_status in ('aguardando_aprovacao', 'aprovado', 'recusado')),
  payment_status text not null default 'nao_pago'
    check (payment_status in ('nao_pago', 'checkout_gerado', 'pago', 'reembolso_pendente', 'reembolsado', 'cancelado')),
  fulfillment_status text not null default 'aguardando_fechamento'
    check (fulfillment_status in ('aguardando_fechamento', 'solicitado', 'recebido', 'enviado', 'cancelado')),
  subtotal numeric(12, 2) not null default 0 check (subtotal >= 0),
  discount numeric(12, 2) not null default 0 check (discount >= 0),
  total numeric(12, 2) not null default 0 check (total >= 0),
  customer_visible boolean not null default true,
  notes text,
  internal_notes text,
  rejection_reason text,
  cancellation_reason text,
  refund_notes text,
  tracking_code text,
  tracking_url text,
  requested_at timestamptz,
  received_at timestamptz,
  shipped_at timestamptz,
  paid_at timestamptz,
  rejected_at timestamptz,
  refund_requested_at timestamptz,
  refunded_at timestamptz,
  created_by uuid references public.profiles(id) on delete set null,
  reviewed_by uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.v2_order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.v2_orders(id) on delete cascade,
  product_variant_id uuid references public.product_variants(id) on delete set null,
  product_name text not null,
  product_sku text,
  quantity integer not null default 1 check (quantity > 0),
  unit_price numeric(12, 2) not null check (unit_price >= 0),
  total_price numeric(12, 2) generated always as (quantity * unit_price) stored,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.v2_payment_sessions (
  id uuid primary key default gen_random_uuid(),
  checkout_number text not null unique,
  customer_id uuid not null references public.customers(id) on delete restrict,
  competence_id uuid references public.v2_order_competencies(id) on delete set null,
  provider text not null default 'infinitepay',
  status text not null default 'pending'
    check (status in ('pending', 'paid', 'failed', 'expired', 'cancelled', 'superseded')),
  amount numeric(12, 2) not null check (amount > 0),
  payment_link_url text,
  provider_reference text,
  invoice_slug text,
  transaction_nsu text,
  receipt_url text,
  paid_amount numeric(12, 2),
  provider_fee_amount numeric(12, 2),
  paid_installments integer check (paid_installments is null or paid_installments > 0),
  request_payload jsonb,
  provider_payload jsonb,
  expires_at timestamptz,
  paid_at timestamptz,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.v2_payment_session_orders (
  id uuid primary key default gen_random_uuid(),
  payment_session_id uuid not null references public.v2_payment_sessions(id) on delete cascade,
  order_id uuid not null references public.v2_orders(id) on delete restrict,
  amount numeric(12, 2) not null check (amount > 0),
  created_at timestamptz not null default now(),
  unique (payment_session_id, order_id)
);

create table if not exists public.v2_order_events (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references public.v2_orders(id) on delete cascade,
  payment_session_id uuid references public.v2_payment_sessions(id) on delete cascade,
  customer_id uuid references public.customers(id) on delete set null,
  actor_id uuid references public.profiles(id) on delete set null,
  event_type text not null,
  from_status text,
  to_status text,
  notes text,
  metadata jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.v2_payment_provider_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null default 'infinitepay',
  event_id text not null,
  event_type text,
  order_nsu text,
  provider_reference text,
  payment_session_id uuid references public.v2_payment_sessions(id) on delete set null,
  payload jsonb not null,
  processing_status text not null default 'pending'
    check (processing_status in ('pending', 'processed', 'ignored', 'failed', 'manual_review')),
  error_message text,
  processed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (provider, event_id)
);

create table if not exists public.v2_shipments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.v2_orders(id) on delete cascade,
  customer_id uuid not null references public.customers(id) on delete restrict,
  status text not null default 'preparando'
    check (status in ('preparando', 'enviado', 'entregue', 'cancelado')),
  carrier text,
  tracking_code text,
  tracking_url text,
  shipped_at timestamptz,
  delivered_at timestamptz,
  notes text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists v2_order_competencies_period_idx
on public.v2_order_competencies(starts_on, ends_on);

create index if not exists v2_orders_customer_id_idx on public.v2_orders(customer_id);
create index if not exists v2_orders_competence_id_idx on public.v2_orders(competence_id);
create index if not exists v2_orders_order_date_idx on public.v2_orders(order_date);
create index if not exists v2_orders_statuses_idx
on public.v2_orders(approval_status, payment_status, fulfillment_status);

create index if not exists v2_order_items_order_id_idx on public.v2_order_items(order_id);
create index if not exists v2_order_items_product_variant_id_idx on public.v2_order_items(product_variant_id);

create index if not exists v2_payment_sessions_customer_id_idx on public.v2_payment_sessions(customer_id);
create index if not exists v2_payment_sessions_status_idx on public.v2_payment_sessions(status);
create index if not exists v2_payment_sessions_provider_reference_idx
on public.v2_payment_sessions(provider_reference);

create index if not exists v2_payment_session_orders_order_id_idx
on public.v2_payment_session_orders(order_id);

create index if not exists v2_order_events_order_id_idx on public.v2_order_events(order_id);
create index if not exists v2_order_events_payment_session_id_idx on public.v2_order_events(payment_session_id);
create index if not exists v2_payment_provider_events_order_nsu_idx on public.v2_payment_provider_events(order_nsu);
create index if not exists v2_shipments_order_id_idx on public.v2_shipments(order_id);

create or replace function public.v2_set_order_total()
returns trigger
language plpgsql
as $$
begin
  new.total = greatest(coalesce(new.subtotal, 0) - coalesce(new.discount, 0), 0);
  return new;
end;
$$;

create or replace function public.v2_recalculate_order_totals(p_order_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_subtotal numeric(12, 2);
begin
  select coalesce(sum(total_price), 0)
    into v_subtotal
  from public.v2_order_items
  where order_id = p_order_id;

  update public.v2_orders
     set subtotal = v_subtotal,
         updated_at = now()
   where id = p_order_id;
end;
$$;

create or replace function public.v2_order_items_recalculate_order()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'DELETE' then
    perform public.v2_recalculate_order_totals(old.order_id);
    return old;
  end if;

  perform public.v2_recalculate_order_totals(new.order_id);
  return new;
end;
$$;

drop trigger if exists set_v2_order_competencies_updated_at on public.v2_order_competencies;
create trigger set_v2_order_competencies_updated_at before update on public.v2_order_competencies
for each row execute function public.set_updated_at();

drop trigger if exists set_v2_orders_updated_at on public.v2_orders;
create trigger set_v2_orders_updated_at before update on public.v2_orders
for each row execute function public.set_updated_at();

drop trigger if exists set_v2_orders_total on public.v2_orders;
create trigger set_v2_orders_total before insert or update of subtotal, discount on public.v2_orders
for each row execute function public.v2_set_order_total();

drop trigger if exists set_v2_order_items_updated_at on public.v2_order_items;
create trigger set_v2_order_items_updated_at before update on public.v2_order_items
for each row execute function public.set_updated_at();

drop trigger if exists recalculate_v2_order_items_total on public.v2_order_items;
create trigger recalculate_v2_order_items_total after insert or update or delete on public.v2_order_items
for each row execute function public.v2_order_items_recalculate_order();

drop trigger if exists set_v2_payment_sessions_updated_at on public.v2_payment_sessions;
create trigger set_v2_payment_sessions_updated_at before update on public.v2_payment_sessions
for each row execute function public.set_updated_at();

drop trigger if exists set_v2_shipments_updated_at on public.v2_shipments;
create trigger set_v2_shipments_updated_at before update on public.v2_shipments
for each row execute function public.set_updated_at();

alter table public.v2_order_competencies enable row level security;
alter table public.v2_orders enable row level security;
alter table public.v2_order_items enable row level security;
alter table public.v2_payment_sessions enable row level security;
alter table public.v2_payment_session_orders enable row level security;
alter table public.v2_order_events enable row level security;
alter table public.v2_payment_provider_events enable row level security;
alter table public.v2_shipments enable row level security;

drop policy if exists "public_select_v2_order_competencies" on public.v2_order_competencies;
create policy "public_select_v2_order_competencies"
on public.v2_order_competencies for select
using (true);

drop policy if exists "admin_all_v2_order_competencies" on public.v2_order_competencies;
create policy "admin_all_v2_order_competencies"
on public.v2_order_competencies for all
using (public.is_admin()) with check (public.is_admin());

drop policy if exists "customers_select_own_v2_orders" on public.v2_orders;
create policy "customers_select_own_v2_orders"
on public.v2_orders for select
using (
  customer_visible
  and exists (
    select 1 from public.customers
    where customers.id = v2_orders.customer_id
      and customers.profile_id = public.current_profile_id()
  )
);

drop policy if exists "admin_all_v2_orders" on public.v2_orders;
create policy "admin_all_v2_orders"
on public.v2_orders for all
using (public.is_admin()) with check (public.is_admin());

drop policy if exists "customers_select_own_v2_order_items" on public.v2_order_items;
create policy "customers_select_own_v2_order_items"
on public.v2_order_items for select
using (
  exists (
    select 1
    from public.v2_orders
    join public.customers on customers.id = v2_orders.customer_id
    where v2_orders.id = v2_order_items.order_id
      and v2_orders.customer_visible
      and customers.profile_id = public.current_profile_id()
  )
);

drop policy if exists "admin_all_v2_order_items" on public.v2_order_items;
create policy "admin_all_v2_order_items"
on public.v2_order_items for all
using (public.is_admin()) with check (public.is_admin());

drop policy if exists "customers_select_own_v2_payment_sessions" on public.v2_payment_sessions;
create policy "customers_select_own_v2_payment_sessions"
on public.v2_payment_sessions for select
using (
  exists (
    select 1 from public.customers
    where customers.id = v2_payment_sessions.customer_id
      and customers.profile_id = public.current_profile_id()
  )
);

drop policy if exists "admin_all_v2_payment_sessions" on public.v2_payment_sessions;
create policy "admin_all_v2_payment_sessions"
on public.v2_payment_sessions for all
using (public.is_admin()) with check (public.is_admin());

drop policy if exists "customers_select_own_v2_payment_session_orders" on public.v2_payment_session_orders;
create policy "customers_select_own_v2_payment_session_orders"
on public.v2_payment_session_orders for select
using (
  exists (
    select 1
    from public.v2_payment_sessions
    join public.customers on customers.id = v2_payment_sessions.customer_id
    where v2_payment_sessions.id = v2_payment_session_orders.payment_session_id
      and customers.profile_id = public.current_profile_id()
  )
);

drop policy if exists "admin_all_v2_payment_session_orders" on public.v2_payment_session_orders;
create policy "admin_all_v2_payment_session_orders"
on public.v2_payment_session_orders for all
using (public.is_admin()) with check (public.is_admin());

drop policy if exists "customers_select_own_v2_order_events" on public.v2_order_events;
create policy "customers_select_own_v2_order_events"
on public.v2_order_events for select
using (
  exists (
    select 1
    from public.v2_orders
    join public.customers on customers.id = v2_orders.customer_id
    where v2_orders.id = v2_order_events.order_id
      and customers.profile_id = public.current_profile_id()
  )
);

drop policy if exists "admin_all_v2_order_events" on public.v2_order_events;
create policy "admin_all_v2_order_events"
on public.v2_order_events for all
using (public.is_admin()) with check (public.is_admin());

drop policy if exists "owner_all_v2_payment_provider_events" on public.v2_payment_provider_events;
create policy "owner_all_v2_payment_provider_events"
on public.v2_payment_provider_events for all
using (public.current_profile_role() = 'owner') with check (public.current_profile_role() = 'owner');

drop policy if exists "customers_select_own_v2_shipments" on public.v2_shipments;
create policy "customers_select_own_v2_shipments"
on public.v2_shipments for select
using (
  exists (
    select 1 from public.customers
    where customers.id = v2_shipments.customer_id
      and customers.profile_id = public.current_profile_id()
  )
);

drop policy if exists "admin_all_v2_shipments" on public.v2_shipments;
create policy "admin_all_v2_shipments"
on public.v2_shipments for all
using (public.is_admin()) with check (public.is_admin());

insert into public.v2_order_competencies (code, label, starts_on, ends_on, notes)
values
  ('2026-07', 'Julho/2026', '2026-06-30', '2026-07-30', 'Competencia inicial de pedidos V2.'),
  ('2026-08', 'Agosto/2026', '2026-07-31', '2026-08-30', 'Competencia inicial de pedidos V2.'),
  ('2026-09', 'Setembro/2026', '2026-08-31', '2026-09-29', 'Competencia inicial de pedidos V2.')
on conflict (code) do nothing;

comment on table public.v2_order_competencies is 'Janelas comerciais mensais usadas pelos pedidos V2.';
comment on table public.v2_orders is 'Pedidos V2 paralelos ao fluxo legado de orders.';
comment on table public.v2_payment_sessions is 'Checkouts InfinitePay que podem quitar um ou varios pedidos V2 selecionados pelo cliente.';
