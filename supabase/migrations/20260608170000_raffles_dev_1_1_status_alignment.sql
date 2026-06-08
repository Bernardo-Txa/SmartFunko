update public.raffle_campaigns
set status = case
  when status = 'published' then 'open'
  when status = 'pending_authorization' then 'draft'
  else status
end
where status in ('published', 'pending_authorization');

update public.raffle_numbers
set status = 'pending_payment'
where status = 'reserved';

update public.raffle_orders
set status = 'pending_payment'
where status = 'reserved';

alter table public.raffle_campaigns
  drop constraint if exists raffle_campaigns_status_check;

alter table public.raffle_campaigns
  add constraint raffle_campaigns_status_check check (
    status in (
      'draft',
      'open',
      'paused',
      'sold_out',
      'closed',
      'drawn',
      'cancelled'
    )
  );

alter table public.raffle_numbers
  drop constraint if exists raffle_numbers_status_check;

alter table public.raffle_numbers
  add constraint raffle_numbers_status_check check (
    status in (
      'available',
      'pending_payment',
      'sold',
      'cancelled',
      'winner'
    )
  );

alter table public.raffle_orders
  drop constraint if exists raffle_orders_status_check;

alter table public.raffle_orders
  add constraint raffle_orders_status_check check (
    status in (
      'pending_payment',
      'paid',
      'expired',
      'cancelled',
      'refunded'
    )
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
      and status in ('pending_payment', 'sold', 'winner');

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

drop policy if exists "public_read_published_raffle_campaigns" on public.raffle_campaigns;
create policy "public_read_published_raffle_campaigns"
on public.raffle_campaigns for select
using (status in ('open', 'sold_out', 'closed', 'drawn') or public.is_owner());

drop policy if exists "public_read_public_raffle_numbers" on public.raffle_numbers;
create policy "public_read_public_raffle_numbers"
on public.raffle_numbers for select
using (
  exists (
    select 1
    from public.raffle_campaigns c
    where c.id = raffle_campaign_id
      and c.status in ('open', 'sold_out', 'closed', 'drawn')
  )
  or customer_id in (
    select id from public.customers where profile_id = public.current_profile_id()
  )
  or public.is_owner()
);
