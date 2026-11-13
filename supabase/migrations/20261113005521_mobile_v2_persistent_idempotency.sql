-- Persistent, distributed idempotency for mobile Orders V2.
-- Rollback: revoke/drop the functions below, then drop public.mobile_idempotency_requests.
-- Existing orders and payment sessions are intentionally retained on rollback.

create table public.mobile_idempotency_requests (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete restrict,
  operation text not null check (operation in ('order.create', 'payment_session.create')),
  idempotency_key text not null check (char_length(idempotency_key) between 16 and 128),
  payload_hash text not null check (payload_hash ~ '^[0-9a-f]{64}$'),
  status text not null default 'processing' check (status in ('processing', 'completed', 'failed')),
  resource_id uuid,
  response_body jsonb,
  error_code text,
  lease_token uuid,
  lease_expires_at timestamptz,
  expires_at timestamptz not null default (now() + interval '90 days'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz,
  unique (customer_id, operation, idempotency_key)
);

create index mobile_idempotency_requests_expires_at_idx
on public.mobile_idempotency_requests(expires_at);

alter table public.mobile_idempotency_requests enable row level security;
revoke all on table public.mobile_idempotency_requests from public, anon, authenticated;
revoke all on table public.mobile_idempotency_requests from service_role;

create or replace function public.mobile_create_v2_order_idempotent(
  p_customer_id uuid,
  p_actor_profile_id uuid,
  p_idempotency_key text,
  p_payload_hash text,
  p_items jsonb,
  p_notes text default null,
  p_coupon_id uuid default null,
  p_coupon_code text default null
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_request public.mobile_idempotency_requests%rowtype;
  v_order_id uuid;
  v_order_number text;
  v_competence_id uuid;
  v_subtotal numeric(12,2);
  v_item_count integer;
  v_valid_variant_count integer;
  v_discount numeric(12,2) := 0;
  v_coupon record;
begin
  if p_idempotency_key is null or char_length(p_idempotency_key) not between 16 and 128
     or p_payload_hash !~ '^[0-9a-f]{64}$' then
    raise exception using errcode = '22023', message = 'invalid_idempotency_input';
  end if;

  insert into public.mobile_idempotency_requests(customer_id, operation, idempotency_key, payload_hash)
  values (p_customer_id, 'order.create', p_idempotency_key, p_payload_hash)
  on conflict (customer_id, operation, idempotency_key) do nothing
  returning * into v_request;

  if v_request.id is null then
    select * into v_request from public.mobile_idempotency_requests
     where customer_id = p_customer_id and operation = 'order.create' and idempotency_key = p_idempotency_key
     for update;
    if v_request.payload_hash <> p_payload_hash then
      raise exception using errcode = '23505', message = 'idempotency_payload_mismatch';
    end if;
    if v_request.status = 'completed' and v_request.resource_id is not null then
      return jsonb_build_object('resourceId', v_request.resource_id, 'replayed', true);
    end if;
  end if;

  if not exists (select 1 from public.customers c where c.id = p_customer_id
    and c.profile_id = p_actor_profile_id and c.status in ('active','vip')) then
    raise exception using errcode = 'P0002', message = 'customer_not_found';
  end if;
  select c.id into v_competence_id from public.v2_order_competencies c
   where current_date between c.starts_on and c.ends_on and c.status = 'open'
   order by c.starts_on desc limit 1;
  if v_competence_id is null then raise exception using errcode = 'P0002', message = 'competence_not_found'; end if;

  select count(*), coalesce(sum((item->>'quantity')::integer * (item->>'unitPrice')::numeric), 0)
    into v_item_count, v_subtotal from jsonb_array_elements(p_items) item;
  if v_item_count < 1 or v_item_count > 50 then raise exception using errcode = '22023', message = 'invalid_items'; end if;
  select count(*) into v_valid_variant_count
    from jsonb_array_elements(p_items) item
    join public.product_variants v on v.id=(item->>'productVariantId')::uuid
   where v.status not in ('hidden','sold_out') and v.sale_price=(item->>'unitPrice')::numeric;
  if v_valid_variant_count<>v_item_count then raise exception using errcode='23514',message='variant_changed'; end if;

  if p_coupon_id is not null then
    select * into v_coupon from public.discount_coupons where id=p_coupon_id and code=p_coupon_code and is_active
      and (starts_at is null or starts_at<=now()) and (expires_at is null or expires_at>=now())
      and min_order_total<=v_subtotal and (usage_limit is null or used_count<usage_limit) for update;
    if v_coupon.id is null then raise exception using errcode = '23514', message = 'coupon_unavailable'; end if;
    v_discount := case when v_coupon.discount_type='percent' then v_subtotal*(v_coupon.value/100) else v_coupon.value end;
    if v_coupon.max_discount is not null then v_discount:=least(v_discount,v_coupon.max_discount); end if;
    v_discount:=least(v_subtotal,greatest(v_discount,0));
    update public.discount_coupons set used_count=used_count+1,updated_at=now() where id=p_coupon_id;
  end if;

  v_order_id := gen_random_uuid();
  v_order_number := 'SFV2-' || to_char(clock_timestamp(), 'YYYYMMDD-HH24MISS-') || upper(substr(md5(v_order_id::text),1,5));
  insert into public.v2_orders(id, order_number, customer_id, competence_id, source, order_date,
    approval_status, payment_status, fulfillment_status, subtotal, discount, notes, coupon_id, coupon_code, created_by)
  values (v_order_id, v_order_number, p_customer_id, v_competence_id, 'site', current_date,
    'aguardando_aprovacao', 'nao_pago', 'aguardando_fechamento', v_subtotal, v_discount, p_notes,
    p_coupon_id, p_coupon_code, p_actor_profile_id);

  insert into public.v2_order_items(order_id, product_variant_id, product_id, supplier_id, item_context,
    product_name, product_sku, quantity, unit_price)
  select v_order_id, nullif(item->>'productVariantId','')::uuid, nullif(item->>'productId','')::uuid,
    nullif(item->>'supplierId','')::uuid, coalesce(nullif(item->>'itemContext',''),'general'),
    item->>'productName', nullif(item->>'productSku',''), (item->>'quantity')::integer, (item->>'unitPrice')::numeric
  from jsonb_array_elements(p_items) item;

  insert into public.v2_order_events(order_id, customer_id, actor_id, event_type, to_status, notes, metadata)
  values (v_order_id, p_customer_id, p_actor_profile_id, 'order.created',
    'aguardando_aprovacao/nao_pago/aguardando_fechamento', 'Pedido criado pelo app mobile',
    jsonb_build_object('source','mobile'));

  update public.mobile_idempotency_requests set status='completed', resource_id=v_order_id,
    response_body=jsonb_build_object('resourceId',v_order_id), completed_at=now(), updated_at=now()
   where id=v_request.id;
  return jsonb_build_object('resourceId',v_order_id,'replayed',false);
end;
$$;

create or replace function public.mobile_start_v2_payment_session_idempotent(
  p_customer_id uuid, p_actor_profile_id uuid, p_idempotency_key text, p_payload_hash text, p_order_ids uuid[]
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_request public.mobile_idempotency_requests%rowtype;
  v_session_id uuid;
  v_checkout_number text;
  v_competence_id uuid;
  v_amount numeric(12,2);
  v_count integer;
  v_lease_token uuid;
  v_superseded_session_ids uuid[];
begin
  if not exists (select 1 from public.customers c where c.id=p_customer_id
    and c.profile_id=p_actor_profile_id and c.status in ('active','vip')) then
    raise exception using errcode='P0002',message='customer_not_found';
  end if;
  insert into public.mobile_idempotency_requests(customer_id,operation,idempotency_key,payload_hash)
  values(p_customer_id,'payment_session.create',p_idempotency_key,p_payload_hash)
  on conflict(customer_id,operation,idempotency_key) do nothing returning * into v_request;
  if v_request.id is null then
    select * into v_request from public.mobile_idempotency_requests where customer_id=p_customer_id
      and operation='payment_session.create' and idempotency_key=p_idempotency_key for update;
    if v_request.payload_hash<>p_payload_hash then raise exception using errcode='23505',message='idempotency_payload_mismatch'; end if;
    if v_request.resource_id is not null then
      if v_request.status='completed' then
        return jsonb_build_object('resourceId',v_request.resource_id,'replayed',true,'status','completed','shouldCreateProvider',false);
      end if;
      if v_request.lease_expires_at is not null and v_request.lease_expires_at>now() then
        return jsonb_build_object('resourceId',v_request.resource_id,'replayed',true,'status','processing','shouldCreateProvider',false);
      end if;
      v_lease_token:=gen_random_uuid();
      update public.mobile_idempotency_requests set lease_token=v_lease_token,lease_expires_at=now()+interval '60 seconds',updated_at=now()
       where id=v_request.id;
      return jsonb_build_object('resourceId',v_request.resource_id,'replayed',true,'status','processing',
        'shouldCreateProvider',true,'leaseToken',v_lease_token);
    end if;
  end if;
  if cardinality(p_order_ids) < 1 or cardinality(p_order_ids) > 50 then raise exception using errcode='22023',message='invalid_orders'; end if;
  perform 1 from public.v2_orders o where o.id=any(p_order_ids) order by o.id for update;
  select count(*), min(competence_id), sum(total) into v_count,v_competence_id,v_amount
    from public.v2_orders where id=any(p_order_ids) and customer_id=p_customer_id and customer_visible
      and approval_status='aprovado' and payment_status in ('nao_pago','checkout_gerado')
      and fulfillment_status<>'cancelado' and total>0;
  if v_count<>cardinality(p_order_ids) then raise exception using errcode='P0002',message='orders_not_payable'; end if;
  if (select count(distinct competence_id) from public.v2_orders where id=any(p_order_ids))<>1 then
    raise exception using errcode='23514',message='mixed_competencies';
  end if;

  select coalesce(array_agg(locked.id),array[]::uuid[]) into v_superseded_session_ids from (
    select s.id from public.v2_payment_sessions s
     where s.customer_id=p_customer_id and s.status='pending' and exists(
       select 1 from public.v2_payment_session_orders l where l.payment_session_id=s.id and l.order_id=any(p_order_ids))
     for update
  ) locked;
  update public.v2_payment_sessions set status='superseded',updated_at=now()
   where id=any(v_superseded_session_ids);
  update public.v2_orders o set payment_status='nao_pago',updated_at=now()
   where o.id in (select l.order_id from public.v2_payment_session_orders l
                   where l.payment_session_id=any(v_superseded_session_ids))
     and o.payment_status='checkout_gerado';
  v_session_id:=gen_random_uuid();
  v_lease_token:=gen_random_uuid();
  v_checkout_number:='SFV2PAY-'||to_char(clock_timestamp(),'YYYYMMDD-HH24MISS-')||upper(substr(md5(v_session_id::text),1,5));
  insert into public.v2_payment_sessions(id,checkout_number,customer_id,competence_id,provider,status,amount,created_by)
  values(v_session_id,v_checkout_number,p_customer_id,v_competence_id,'infinitepay','pending',v_amount,p_actor_profile_id);
  insert into public.v2_payment_session_orders(payment_session_id,order_id,amount)
  select v_session_id,o.id,o.total from public.v2_orders o where o.id=any(p_order_ids);
  update public.v2_orders set payment_status='checkout_gerado',updated_at=now() where id=any(p_order_ids);
  insert into public.v2_order_events(order_id,payment_session_id,customer_id,actor_id,event_type,from_status,to_status,notes,metadata)
  select o.id,v_session_id,p_customer_id,p_actor_profile_id,'payment_session.created',o.payment_status,'checkout_gerado',
    'Checkout InfinitePay criado pelo app mobile',jsonb_build_object('checkoutNumber',v_checkout_number)
  from public.v2_orders o where o.id=any(p_order_ids);
  update public.mobile_idempotency_requests set resource_id=v_session_id,response_body=jsonb_build_object('resourceId',v_session_id),
    lease_token=v_lease_token,lease_expires_at=now()+interval '60 seconds',updated_at=now()
   where id=v_request.id;
  return jsonb_build_object('resourceId',v_session_id,'replayed',false,'status','processing',
    'shouldCreateProvider',true,'leaseToken',v_lease_token);
end; $$;

create or replace function public.mobile_complete_v2_payment_session_idempotent(
 p_customer_id uuid,p_idempotency_key text,p_payload_hash text,p_session_id uuid,p_payment_link_url text,
 p_provider_reference text,p_invoice_slug text,p_request_payload jsonb,p_lease_token uuid
) returns jsonb language plpgsql security definer set search_path='' as $$
declare v_request public.mobile_idempotency_requests%rowtype;
begin
 select * into v_request from public.mobile_idempotency_requests where customer_id=p_customer_id
  and operation='payment_session.create' and idempotency_key=p_idempotency_key for update;
 if v_request.id is null or v_request.payload_hash<>p_payload_hash or v_request.resource_id<>p_session_id
    or v_request.lease_token<>p_lease_token then
   raise exception using errcode='P0002',message='idempotency_request_not_found';
 end if;
 update public.v2_payment_sessions set payment_link_url=p_payment_link_url,provider_reference=p_provider_reference,
  invoice_slug=p_invoice_slug,request_payload=p_request_payload,updated_at=now()
  where id=p_session_id and customer_id=p_customer_id;
 if not found then raise exception using errcode='P0002',message='payment_session_not_found'; end if;
 update public.mobile_idempotency_requests set status='completed',response_body=jsonb_build_object('resourceId',p_session_id),
  completed_at=now(),lease_token=null,lease_expires_at=null,updated_at=now() where id=v_request.id;
 return jsonb_build_object('resourceId',p_session_id,'replayed',false);
end; $$;

create or replace function public.mobile_cleanup_v2_idempotency(p_limit integer default 500)
returns integer language plpgsql security definer set search_path='' as $$
declare v_deleted integer;
begin
  with targets as (
    select id from public.mobile_idempotency_requests
     where status in ('completed','failed') and expires_at < now()
       and created_at < now() - interval '180 days'
     order by expires_at asc limit least(greatest(p_limit,1),5000)
     for update skip locked
  )
  delete from public.mobile_idempotency_requests r using targets t
   where r.id=t.id and r.status in ('completed','failed')
     and r.created_at < now() - interval '180 days';
  get diagnostics v_deleted = row_count;
  return v_deleted;
end; $$;

revoke all on function public.mobile_create_v2_order_idempotent(uuid,uuid,text,text,jsonb,text,uuid,text) from public,anon,authenticated;
revoke all on function public.mobile_start_v2_payment_session_idempotent(uuid,uuid,text,text,uuid[]) from public,anon,authenticated;
revoke all on function public.mobile_complete_v2_payment_session_idempotent(uuid,text,text,uuid,text,text,text,jsonb,uuid) from public,anon,authenticated;
revoke all on function public.mobile_cleanup_v2_idempotency(integer) from public,anon,authenticated;
grant execute on function public.mobile_create_v2_order_idempotent(uuid,uuid,text,text,jsonb,text,uuid,text) to service_role;
grant execute on function public.mobile_start_v2_payment_session_idempotent(uuid,uuid,text,text,uuid[]) to service_role;
grant execute on function public.mobile_complete_v2_payment_session_idempotent(uuid,text,text,uuid,text,text,text,jsonb,uuid) to service_role;
grant execute on function public.mobile_cleanup_v2_idempotency(integer) to service_role;

comment on table public.mobile_idempotency_requests is 'Backend-only ledger. Retain completed financial operations for at least 180 days before controlled cleanup.';
