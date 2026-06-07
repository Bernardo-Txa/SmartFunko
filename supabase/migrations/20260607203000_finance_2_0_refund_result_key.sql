create or replace function public.refund_manual_payment(
  p_payment_id uuid,
  p_amount numeric default null,
  p_created_by uuid default null,
  p_notes text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_payment record;
  v_order record;
  v_cash_entry_id uuid;
  v_refund_amount numeric;
  v_cash_refund_amount numeric;
  v_paid_remaining numeric;
  v_refunded_total numeric;
  v_pending_amount numeric;
  v_previous_status public.order_status;
  v_new_status public.order_status;
begin
  if p_notes is null or length(trim(p_notes)) < 3 then
    raise exception 'Justificativa do estorno e obrigatoria';
  end if;

  select id, order_id, customer_id, method, amount, fee_amount, net_amount, status, paid_at
    into v_payment
  from public.payments
  where id = p_payment_id
  for update;

  if not found then
    raise exception 'Pagamento nao encontrado';
  end if;

  if v_payment.status <> 'paid' then
    raise exception 'Somente pagamento pago pode ser estornado';
  end if;

  v_refund_amount := coalesce(p_amount, v_payment.amount);

  if v_refund_amount <= 0 then
    raise exception 'Valor de estorno deve ser maior que zero';
  end if;

  if v_refund_amount > v_payment.amount + 0.001 then
    raise exception 'Valor de estorno maior que o pagamento';
  end if;

  if abs(v_refund_amount - v_payment.amount) > 0.001 then
    raise exception 'Estorno parcial ainda nao esta disponivel';
  end if;

  select id, order_number, customer_id, total, status
    into v_order
  from public.orders
  where id = v_payment.order_id
  for update;

  if not found then
    raise exception 'Pedido do pagamento nao encontrado';
  end if;

  v_previous_status := v_order.status;
  v_cash_refund_amount := v_payment.net_amount;

  update public.payments
  set status = 'refunded'
  where id = p_payment_id;

  insert into public.cash_entries (
    type,
    category,
    order_id,
    payment_id,
    amount,
    description,
    occurred_at,
    created_by
  )
  values (
    'expense',
    'refund',
    v_payment.order_id,
    p_payment_id,
    v_cash_refund_amount,
    concat('Estorno do pedido ', v_order.order_number, ': ', p_notes),
    now(),
    p_created_by
  )
  returning id into v_cash_entry_id;

  select coalesce(sum(amount), 0)
    into v_paid_remaining
  from public.payments
  where order_id = v_payment.order_id
    and status = 'paid';

  select coalesce(sum(amount), 0)
    into v_refunded_total
  from public.payments
  where order_id = v_payment.order_id
    and status = 'refunded';

  v_pending_amount := greatest(0, v_order.total - v_paid_remaining);
  v_new_status := case
    when v_paid_remaining >= v_order.total and v_order.total > 0 then 'paid'::public.order_status
    when v_paid_remaining > 0 then 'partially_paid'::public.order_status
    when v_refunded_total >= v_order.total and v_order.total > 0 then 'refunded'::public.order_status
    else 'pending_payment'::public.order_status
  end;

  if v_previous_status <> v_new_status then
    update public.orders
    set status = v_new_status
    where id = v_payment.order_id;

    insert into public.order_status_history (
      order_id,
      previous_status,
      new_status,
      notes,
      changed_by
    )
    values (
      v_payment.order_id,
      v_previous_status::text,
      v_new_status::text,
      concat('Estorno manual: ', p_notes),
      p_created_by
    );
  end if;

  insert into public.admin_action_logs (
    admin_id,
    action,
    entity_type,
    entity_id,
    old_value,
    new_value
  )
  values (
    p_created_by,
    'payment.refund_manual',
    'payment',
    p_payment_id,
    jsonb_build_object(
      'payment_status', v_payment.status,
      'order_status', v_previous_status,
      'paid_amount', v_payment.amount,
      'net_amount', v_payment.net_amount
    ),
    jsonb_build_object(
      'payment_id', p_payment_id,
      'cash_entry_id', v_cash_entry_id,
      'refund_cash_entry_id', v_cash_entry_id,
      'order_id', v_payment.order_id,
      'refund_amount', v_refund_amount,
      'cash_refund_amount', v_cash_refund_amount,
      'paid_remaining', v_paid_remaining,
      'pending_amount', v_pending_amount,
      'order_status', v_new_status,
      'notes', p_notes
    )
  );

  return jsonb_build_object(
    'payment_id', p_payment_id,
    'cash_entry_id', v_cash_entry_id,
    'refund_cash_entry_id', v_cash_entry_id,
    'order_id', v_payment.order_id,
    'previous_status', v_previous_status,
    'new_status', v_new_status,
    'refunded_amount', v_refund_amount,
    'paid_amount', v_paid_remaining,
    'pending_amount', v_pending_amount
  );
end;
$$;

revoke all on function public.refund_manual_payment(uuid, numeric, uuid, text)
from public, anon, authenticated;

grant execute on function public.refund_manual_payment(uuid, numeric, uuid, text)
to service_role;
