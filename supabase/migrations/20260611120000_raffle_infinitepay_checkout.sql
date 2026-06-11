alter table public.raffle_orders
  add column if not exists payment_provider text,
  add column if not exists payment_status text default 'pending',
  add column if not exists payment_link_url text,
  add column if not exists payment_provider_reference text,
  add column if not exists payment_link_created_at timestamptz,
  add column if not exists payment_link_expires_at timestamptz,
  add column if not exists receipt_url text,
  add column if not exists capture_method text,
  add column if not exists transaction_nsu text,
  add column if not exists paid_amount numeric,
  add column if not exists provider_payload jsonb;

create index if not exists raffle_orders_payment_provider_reference_idx
on public.raffle_orders(payment_provider_reference);

create index if not exists raffle_orders_transaction_nsu_idx
on public.raffle_orders(transaction_nsu);

create index if not exists raffle_orders_payment_status_idx
on public.raffle_orders(payment_status);

alter table public.payment_provider_events
  drop constraint if exists payment_provider_events_processing_status_check;

alter table public.payment_provider_events
  add constraint payment_provider_events_processing_status_check check (
    processing_status in ('pending', 'processed', 'ignored', 'failed', 'manual_review')
  );

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
  select coalesce(array_agg(expired.id), array[]::uuid[])
    into v_expired_order_ids
  from (
    select id
    from public.raffle_orders
    where status = 'pending_payment'
      and reserved_until is not null
      and reserved_until < now()
    for update
  ) expired;

  if coalesce(array_length(v_expired_order_ids, 1), 0) = 0 then
    return 0;
  end if;

  update public.raffle_orders
  set status = 'expired',
      payment_status = 'expired',
      expired_at = now()
  where id = any(v_expired_order_ids);

  get diagnostics v_count = row_count;

  update public.raffle_numbers
  set status = 'available',
      customer_id = null,
      raffle_order_id = null,
      reserved_until = null
  where raffle_order_id = any(v_expired_order_ids)
    and status = 'pending_payment';

  insert into public.raffle_draw_audit_logs (raffle_campaign_id, action, payload)
  select distinct raffle_campaign_id,
    'reservation.expired',
    jsonb_build_object('raffle_order_ids', v_expired_order_ids)
  from public.raffle_orders
  where id = any(v_expired_order_ids);

  update public.raffle_campaigns c
  set status = 'open'
  where c.status = 'sold_out'
    and exists (
      select 1
      from public.raffle_numbers n
      where n.raffle_campaign_id = c.id
        and n.status = 'available'
    );

  return v_count;
end;
$$;
