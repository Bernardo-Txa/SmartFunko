alter type public.payment_method add value if not exists 'infinitepay';
alter type public.payment_status add value if not exists 'expired';

alter table public.orders
  add column if not exists review_status text not null default 'approved_for_payment',
  add column if not exists review_notes text,
  add column if not exists rejected_reason text,
  add column if not exists reviewed_by uuid references public.profiles(id) on delete set null,
  add column if not exists reviewed_at timestamptz,
  add column if not exists payment_provider text,
  add column if not exists payment_link_url text,
  add column if not exists payment_provider_reference text,
  add column if not exists payment_link_created_at timestamptz,
  add column if not exists payment_link_expires_at timestamptz;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'orders_review_status_check'
      and conrelid = 'public.orders'::regclass
  ) then
    alter table public.orders
      add constraint orders_review_status_check
      check (review_status in ('under_review', 'approved_for_payment', 'awaiting_payment', 'rejected', 'paid', 'cancelled'));
  end if;
end $$;

create table if not exists public.payment_provider_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  event_id text,
  event_type text,
  provider_reference text,
  order_id uuid references public.orders(id) on delete set null,
  payment_id uuid references public.payments(id) on delete set null,
  payload jsonb not null,
  processed_at timestamptz,
  processing_status text not null default 'pending' check (
    processing_status in ('pending', 'processed', 'ignored', 'failed')
  ),
  error_message text,
  created_at timestamptz not null default now(),
  unique(provider, event_id)
);

create index if not exists orders_review_status_idx
on public.orders(review_status);

create index if not exists orders_payment_provider_reference_idx
on public.orders(payment_provider_reference);

create index if not exists payment_provider_events_provider_reference_idx
on public.payment_provider_events(provider_reference);

create index if not exists payment_provider_events_order_id_idx
on public.payment_provider_events(order_id);

alter table public.payment_provider_events enable row level security;

drop policy if exists "owner_all_payment_provider_events" on public.payment_provider_events;
create policy "owner_all_payment_provider_events"
on public.payment_provider_events for all
using (public.is_admin())
with check (public.is_admin());

comment on column public.orders.review_status is 'Status da aprovacao humana do checkout assistido.';
comment on column public.orders.payment_provider is 'Gateway usado para link/cobranca externa.';
comment on column public.orders.payment_link_url is 'URL externa de checkout aprovada pelo admin.';
comment on column public.orders.payment_provider_reference is 'Referencia do gateway usada para idempotencia e conciliacao.';
comment on table public.payment_provider_events is 'Eventos brutos de gateways de pagamento para idempotencia e auditoria server-side.';
