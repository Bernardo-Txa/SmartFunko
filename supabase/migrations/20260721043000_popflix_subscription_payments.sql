alter type public.cash_entry_category add value if not exists 'subscription';

alter table public.popflix_subscriptions
  add column if not exists cash_entry_id uuid references public.cash_entries(id) on delete set null,
  add column if not exists payment_status text not null default 'pending',
  add column if not exists payment_link_created_at timestamptz,
  add column if not exists receipt_url text,
  add column if not exists capture_method text,
  add column if not exists transaction_nsu text,
  add column if not exists paid_amount numeric(12, 2),
  add column if not exists paid_installments integer,
  add column if not exists provider_fee_amount numeric(12, 2),
  add column if not exists provider_payment_method text,
  add column if not exists provider_payload jsonb;

alter table public.popflix_subscriptions
  drop constraint if exists popflix_subscriptions_payment_status_check,
  add constraint popflix_subscriptions_payment_status_check
  check (payment_status in ('pending', 'paid', 'failed', 'expired', 'cancelled', 'manual_review'));

alter table public.popflix_subscriptions
  drop constraint if exists popflix_subscriptions_paid_installments_check,
  add constraint popflix_subscriptions_paid_installments_check
  check (paid_installments is null or paid_installments between 1 and 12);

alter table public.popflix_subscriptions
  drop constraint if exists popflix_subscriptions_provider_fee_amount_check,
  add constraint popflix_subscriptions_provider_fee_amount_check
  check (provider_fee_amount is null or provider_fee_amount >= 0);

alter table public.popflix_subscriptions
  drop constraint if exists popflix_subscriptions_paid_amount_check,
  add constraint popflix_subscriptions_paid_amount_check
  check (paid_amount is null or paid_amount >= 0);

alter table public.payment_provider_events
  add column if not exists popflix_subscription_id uuid references public.popflix_subscriptions(id) on delete set null;

create index if not exists popflix_subscriptions_payment_provider_reference_idx
on public.popflix_subscriptions(payment_provider_reference);

create index if not exists popflix_subscriptions_transaction_nsu_idx
on public.popflix_subscriptions(transaction_nsu);

create index if not exists popflix_subscriptions_cash_entry_id_idx
on public.popflix_subscriptions(cash_entry_id);

create index if not exists payment_provider_events_popflix_subscription_id_idx
on public.payment_provider_events(popflix_subscription_id);

comment on column public.popflix_subscriptions.payment_link_url is
'URL de checkout InfinitePay da mensalidade PopFlix mais recente.';
comment on column public.popflix_subscriptions.payment_status is
'Status da cobrança PopFlix mais recente.';
comment on column public.payment_provider_events.popflix_subscription_id is
'Assinatura PopFlix associada ao evento do gateway, quando aplicável.';
