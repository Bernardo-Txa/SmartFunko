-- Fix PostgreSQL 17 compatibility in the mobile payment-session RPC.
-- PostgreSQL does not provide min(uuid); array_agg is safe here because the
-- function separately enforces that every selected order has one competence.
--
-- Rollback: restore the previous function body only when the mobile payment
-- endpoint is disabled, because the previous body fails at runtime on PG17.

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
  select count(*), (array_agg(competence_id))[1], sum(total) into v_count,v_competence_id,v_amount
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

revoke all on function public.mobile_start_v2_payment_session_idempotent(uuid,uuid,text,text,uuid[])
from public, anon, authenticated;
grant execute on function public.mobile_start_v2_payment_session_idempotent(uuid,uuid,text,text,uuid[])
to service_role;
