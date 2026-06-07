create or replace function public.record_manual_payment(
  p_order_id uuid,
  p_customer_id uuid default null,
  p_method text default 'manual',
  p_amount numeric default 0,
  p_fee_amount numeric default 0,
  p_paid_at timestamptz default now(),
  p_created_by uuid default null,
  p_notes text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order record;
  v_method public.payment_method;
  v_payment_id uuid;
  v_cash_entry_id uuid;
  v_net_amount numeric;
  v_paid_before numeric;
  v_paid_after numeric;
  v_pending_before numeric;
  v_pending_after numeric;
  v_previous_status public.order_status;
  v_new_status public.order_status;
begin
  if p_amount is null or p_amount <= 0 then
    raise exception 'Valor do pagamento deve ser maior que zero';
  end if;

  if coalesce(p_fee_amount, 0) < 0 then
    raise exception 'Taxa do pagamento nao pode ser negativa';
  end if;

  v_net_amount := p_amount - coalesce(p_fee_amount, 0);

  if v_net_amount < 0 then
    raise exception 'Taxa do pagamento nao pode ser maior que o valor bruto';
  end if;

  begin
    v_method := p_method::public.payment_method;
  exception
    when invalid_text_representation then
      raise exception 'Metodo de pagamento invalido';
  end;

  select id, order_number, customer_id, total, status
    into v_order
  from public.orders
  where id = p_order_id
  for update;

  if not found then
    raise exception 'Pedido nao encontrado';
  end if;

  if p_customer_id is not null and v_order.customer_id <> p_customer_id then
    raise exception 'Cliente informado nao pertence ao pedido';
  end if;

  if v_order.status in ('cancelled', 'refunded') then
    raise exception 'Pedido com status % nao recebe pagamento', v_order.status;
  end if;

  select coalesce(sum(amount), 0)
    into v_paid_before
  from public.payments
  where order_id = p_order_id
    and status = 'paid';

  v_pending_before := greatest(0, v_order.total - v_paid_before);

  if p_amount > v_pending_before + 0.001 then
    raise exception 'Pagamento maior que o saldo pendente';
  end if;

  insert into public.payments (
    order_id,
    customer_id,
    method,
    amount,
    fee_amount,
    net_amount,
    status,
    paid_at,
    created_by
  )
  values (
    p_order_id,
    v_order.customer_id,
    v_method,
    p_amount,
    coalesce(p_fee_amount, 0),
    v_net_amount,
    'paid',
    coalesce(p_paid_at, now()),
    p_created_by
  )
  returning id into v_payment_id;

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
    'income',
    'sale',
    p_order_id,
    v_payment_id,
    v_net_amount,
    concat('Recebimento do pedido ', v_order.order_number),
    coalesce(p_paid_at, now()),
    p_created_by
  )
  returning id into v_cash_entry_id;

  v_paid_after := v_paid_before + p_amount;
  v_pending_after := greatest(0, v_order.total - v_paid_after);
  v_previous_status := v_order.status;
  v_new_status := case
    when v_paid_after >= v_order.total then 'paid'::public.order_status
    when v_paid_after > 0 then 'partially_paid'::public.order_status
    else 'pending_payment'::public.order_status
  end;

  if v_previous_status <> v_new_status then
    update public.orders
    set status = v_new_status
    where id = p_order_id;

    insert into public.order_status_history (
      order_id,
      previous_status,
      new_status,
      notes,
      changed_by
    )
    values (
      p_order_id,
      v_previous_status::text,
      v_new_status::text,
      coalesce(p_notes, 'Status atualizado por pagamento manual'),
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
    'payment.record_manual',
    'payment',
    v_payment_id,
    jsonb_build_object(
      'order_status', v_previous_status,
      'paid_before', v_paid_before,
      'pending_before', v_pending_before
    ),
    jsonb_build_object(
      'payment_id', v_payment_id,
      'cash_entry_id', v_cash_entry_id,
      'order_id', p_order_id,
      'method', v_method,
      'amount', p_amount,
      'fee_amount', coalesce(p_fee_amount, 0),
      'net_amount', v_net_amount,
      'paid_after', v_paid_after,
      'pending_after', v_pending_after,
      'order_status', v_new_status,
      'notes', p_notes
    )
  );

  return jsonb_build_object(
    'payment_id', v_payment_id,
    'cash_entry_id', v_cash_entry_id,
    'order_id', p_order_id,
    'previous_status', v_previous_status,
    'new_status', v_new_status,
    'paid_amount', v_paid_after,
    'pending_amount', v_pending_after
  );
end;
$$;

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
    'order_id', v_payment.order_id,
    'previous_status', v_previous_status,
    'new_status', v_new_status,
    'refunded_amount', v_refund_amount,
    'paid_amount', v_paid_remaining,
    'pending_amount', v_pending_amount
  );
end;
$$;

revoke all on function public.record_manual_payment(uuid, uuid, text, numeric, numeric, timestamptz, uuid, text)
from public, anon, authenticated;

revoke all on function public.refund_manual_payment(uuid, numeric, uuid, text)
from public, anon, authenticated;

grant execute on function public.record_manual_payment(uuid, uuid, text, numeric, numeric, timestamptz, uuid, text)
to service_role;

grant execute on function public.refund_manual_payment(uuid, numeric, uuid, text)
to service_role;
