alter table public.preorder_reservations
  alter column v2_order_id drop not null;

alter table public.preorder_reservations
  add column if not exists payment_provider text not null default 'infinitepay',
  add column if not exists payment_status text not null default 'pending',
  add column if not exists checkout_number text unique,
  add column if not exists payment_link_url text,
  add column if not exists provider_reference text,
  add column if not exists invoice_slug text,
  add column if not exists transaction_nsu text,
  add column if not exists receipt_url text,
  add column if not exists paid_amount numeric(12, 2),
  add column if not exists provider_fee_amount numeric(12, 2),
  add column if not exists paid_installments integer check (paid_installments is null or paid_installments > 0),
  add column if not exists request_payload jsonb,
  add column if not exists provider_payload jsonb,
  add column if not exists expires_at timestamptz,
  add column if not exists paid_at timestamptz;

alter table public.preorder_reservations
  drop constraint if exists preorder_reservations_status_check;

alter table public.preorder_reservations
  add constraint preorder_reservations_status_check
  check (status in (
    'awaiting_approval',
    'approved',
    'rejected',
    'pending_payment',
    'paid',
    'failed',
    'expired',
    'cancelled'
  ));

alter table public.preorder_reservations
  drop constraint if exists preorder_reservations_payment_status_check;

alter table public.preorder_reservations
  add constraint preorder_reservations_payment_status_check
  check (payment_status in (
    'pending',
    'checkout_generated',
    'paid',
    'failed',
    'expired',
    'cancelled',
    'manual_review'
  ));

create index if not exists preorder_reservations_payment_status_idx
on public.preorder_reservations(payment_status);

create index if not exists preorder_reservations_checkout_number_idx
on public.preorder_reservations(checkout_number);

create index if not exists preorder_reservations_provider_reference_idx
on public.preorder_reservations(provider_reference);

create index if not exists preorder_reservations_invoice_slug_idx
on public.preorder_reservations(invoice_slug);
