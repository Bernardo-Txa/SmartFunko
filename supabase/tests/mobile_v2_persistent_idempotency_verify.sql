\set ON_ERROR_STOP on

create or replace function pg_temp.assert_true(condition boolean, message text)
returns void language plpgsql as $$
begin
  if condition is not true then
    raise exception 'assertion_failed: %', message;
  end if;
end;
$$;

select pg_temp.assert_true(
  (select count(*) = 1 from public.mobile_idempotency_requests where idempotency_key = 'CODEX_TEST_PAYMENT_CONCURRENT_0001'),
  'concurrent calls must create one payment ledger row'
);
select pg_temp.assert_true(
  (select count(*) = 1 from public.v2_payment_sessions where id = (
    select resource_id from public.mobile_idempotency_requests where idempotency_key = 'CODEX_TEST_PAYMENT_CONCURRENT_0001'
  )),
  'concurrent calls must create one payment session'
);
select pg_temp.assert_true(
  (select count(*) = 1 from public.v2_payment_session_orders where payment_session_id = (
    select resource_id from public.mobile_idempotency_requests where idempotency_key = 'CODEX_TEST_PAYMENT_CONCURRENT_0001'
  )),
  'session/order link must be atomic'
);
select pg_temp.assert_true(
  (select payment_status = 'checkout_gerado' from public.v2_orders where notes = 'CODEX_TEST_ORDER'),
  'payable order must be linked to checkout atomically'
);

-- Make the timeout-after-commit case deterministic even when this verification
-- script is started more than 60 seconds after the concurrent setup.
update public.mobile_idempotency_requests
set lease_expires_at = now() + interval '60 seconds'
where idempotency_key = 'CODEX_TEST_PAYMENT_CONCURRENT_0001';

do $$
declare result jsonb; expected_resource text;
begin
  select resource_id::text into expected_resource
  from public.mobile_idempotency_requests
  where idempotency_key = 'CODEX_TEST_PAYMENT_CONCURRENT_0001';
  perform set_config('role', 'service_role', true);
  result := public.mobile_start_v2_payment_session_idempotent(
    (select id from public.customers where email = 'CODEX_TEST_IDEMP_A@example.invalid'),
    (select id from public.profiles where email = 'CODEX_TEST_IDEMP_A@example.invalid'),
    'CODEX_TEST_PAYMENT_CONCURRENT_0001', repeat('f', 64),
    array[(select id from public.v2_orders where notes = 'CODEX_TEST_ORDER')]
  );
  if result->>'resourceId' is distinct from expected_resource
     or (result->>'shouldCreateProvider')::boolean then
    raise exception 'assertion_failed: retry after commit did not reuse the processing session';
  end if;
  perform set_config('role', 'postgres', true);
end;
$$;

do $$
begin
  perform set_config('role', 'service_role', true);
  begin
    perform public.mobile_start_v2_payment_session_idempotent(
      (select id from public.customers where email = 'CODEX_TEST_IDEMP_A@example.invalid'),
      (select id from public.profiles where email = 'CODEX_TEST_IDEMP_A@example.invalid'),
      'CODEX_TEST_PAYMENT_CONCURRENT_0001', repeat('0', 64),
      array[(select id from public.v2_orders where notes = 'CODEX_TEST_ORDER')]
    );
    raise exception 'assertion_failed: payment payload mismatch was accepted';
  exception when unique_violation then
    if sqlerrm <> 'idempotency_payload_mismatch' then raise; end if;
  end;
  perform set_config('role', 'postgres', true);
end;
$$;

do $$
begin
  perform set_config('role', 'service_role', true);
  begin
    perform public.mobile_start_v2_payment_session_idempotent(
      (select id from public.customers where email = 'CODEX_TEST_IDEMP_B@example.invalid'),
      (select id from public.profiles where email = 'CODEX_TEST_IDEMP_B@example.invalid'),
      'CODEX_TEST_PAYMENT_OWNERSHIP_01', repeat('1', 64),
      array[(select id from public.v2_orders where notes = 'CODEX_TEST_ORDER')]
    );
    raise exception 'assertion_failed: cross-customer order was accepted';
  exception when no_data_found then
    if sqlerrm <> 'orders_not_payable' then raise; end if;
  end;
  perform set_config('role', 'postgres', true);
end;
$$;
select pg_temp.assert_true(
  not exists(select 1 from public.mobile_idempotency_requests where idempotency_key = 'CODEX_TEST_PAYMENT_OWNERSHIP_01'),
  'ownership failure must roll back payment ledger claim'
);

update public.v2_orders
set approval_status = 'aprovado'
where notes = 'CODEX_TEST_ORDER_CUSTOMER_B';

begin;
set local role service_role;
select public.mobile_start_v2_payment_session_idempotent(
  (select id from public.customers where email = 'CODEX_TEST_IDEMP_B@example.invalid'),
  (select id from public.profiles where email = 'CODEX_TEST_IDEMP_B@example.invalid'),
  'CODEX_TEST_PAYMENT_ROLLBACK_01', repeat('2', 64),
  array[(select id from public.v2_orders where notes = 'CODEX_TEST_ORDER_CUSTOMER_B')]
);
rollback;

select pg_temp.assert_true(not exists(select 1 from public.mobile_idempotency_requests where idempotency_key = 'CODEX_TEST_PAYMENT_ROLLBACK_01'), 'payment ledger must roll back');
select pg_temp.assert_true(not exists(select 1 from public.v2_payment_sessions s join public.v2_payment_session_orders l on l.payment_session_id=s.id join public.v2_orders o on o.id=l.order_id where o.notes='CODEX_TEST_ORDER_CUSTOMER_B'), 'payment session and link must roll back');
select pg_temp.assert_true((select payment_status='nao_pago' from public.v2_orders where notes='CODEX_TEST_ORDER_CUSTOMER_B'), 'order payment status must roll back');

insert into public.v2_orders (
  id, order_number, customer_id, competence_id, source, order_date,
  approval_status, payment_status, fulfillment_status, subtotal, discount, total,
  customer_visible, notes, created_by
)
select
  '70000000-0000-4000-8000-000000000002', 'CODEX_TEST_MIXED_COMP', c.id,
  '60000000-0000-4000-8000-000000000002', 'site', current_date,
  'aprovado', 'nao_pago', 'aguardando_fechamento', 10, 0, 10,
  true, 'CODEX_TEST_MIXED_COMP', p.id
from public.customers c
join public.profiles p on p.id = c.profile_id
where c.email = 'CODEX_TEST_IDEMP_A@example.invalid';

do $$
begin
  perform set_config('role', 'service_role', true);
  begin
    perform public.mobile_start_v2_payment_session_idempotent(
      (select id from public.customers where email = 'CODEX_TEST_IDEMP_A@example.invalid'),
      (select id from public.profiles where email = 'CODEX_TEST_IDEMP_A@example.invalid'),
      'CODEX_TEST_PAYMENT_MIXED_0001', repeat('3', 64),
      array[
        (select id from public.v2_orders where notes = 'CODEX_TEST_ORDER'),
        '70000000-0000-4000-8000-000000000002'::uuid
      ]
    );
    raise exception 'assertion_failed: mixed competencies were accepted';
  exception when check_violation then
    if sqlerrm <> 'mixed_competencies' then raise; end if;
  end;
  perform set_config('role', 'postgres', true);
end;
$$;
select pg_temp.assert_true(not exists(select 1 from public.mobile_idempotency_requests where idempotency_key = 'CODEX_TEST_PAYMENT_MIXED_0001'), 'mixed competence failure must roll back ledger');

-- Simulate a worker crash after the DB commit and expiry of its provider lease.
update public.mobile_idempotency_requests
set lease_expires_at = now() - interval '1 second'
where idempotency_key = 'CODEX_TEST_PAYMENT_CONCURRENT_0001';

do $$
declare result jsonb; current_lease uuid; session_id uuid;
begin
  perform set_config('role', 'service_role', true);
  result := public.mobile_start_v2_payment_session_idempotent(
    (select id from public.customers where email = 'CODEX_TEST_IDEMP_A@example.invalid'),
    (select id from public.profiles where email = 'CODEX_TEST_IDEMP_A@example.invalid'),
    'CODEX_TEST_PAYMENT_CONCURRENT_0001', repeat('f', 64),
    array[(select id from public.v2_orders where notes = 'CODEX_TEST_ORDER')]
  );
  if not (result->>'shouldCreateProvider')::boolean or not (result->>'replayed')::boolean then
    raise exception 'assertion_failed: expired lease was not safely resumed';
  end if;
  current_lease := (result->>'leaseToken')::uuid;
  session_id := (result->>'resourceId')::uuid;
  perform public.mobile_complete_v2_payment_session_idempotent(
    (select id from public.customers where email = 'CODEX_TEST_IDEMP_A@example.invalid'),
    'CODEX_TEST_PAYMENT_CONCURRENT_0001', repeat('f',64), session_id,
    'https://example.invalid/CODEX_TEST_PAYMENT_LINK', 'CODEX_TEST_PROVIDER_REFERENCE',
    'CODEX_TEST_INVOICE', '{"stub":true}'::jsonb, current_lease
  );
  perform set_config('role', 'postgres', true);
end;
$$;

select pg_temp.assert_true(
  (select status='completed' and lease_token is null and completed_at is not null from public.mobile_idempotency_requests where idempotency_key='CODEX_TEST_PAYMENT_CONCURRENT_0001'),
  'stubbed completion must atomically complete ledger and clear lease'
);
select pg_temp.assert_true(
  (select payment_link_url='https://example.invalid/CODEX_TEST_PAYMENT_LINK' and provider_reference='CODEX_TEST_PROVIDER_REFERENCE' from public.v2_payment_sessions where id=(select resource_id from public.mobile_idempotency_requests where idempotency_key='CODEX_TEST_PAYMENT_CONCURRENT_0001')),
  'stubbed provider fields must be stored on the correct session'
);

do $$
declare result jsonb;
begin
  perform set_config('role', 'service_role', true);
  result := public.mobile_start_v2_payment_session_idempotent(
    (select id from public.customers where email = 'CODEX_TEST_IDEMP_A@example.invalid'),
    (select id from public.profiles where email = 'CODEX_TEST_IDEMP_A@example.invalid'),
    'CODEX_TEST_PAYMENT_CONCURRENT_0001', repeat('f', 64),
    array[(select id from public.v2_orders where notes = 'CODEX_TEST_ORDER')]
  );
  if result->>'status' <> 'completed' or (result->>'shouldCreateProvider')::boolean then
    raise exception 'assertion_failed: completed retry did not reuse final response';
  end if;
  perform set_config('role', 'postgres', true);
end;
$$;

do $$
begin
  perform set_config('role', 'anon', true);
  begin
    perform public.mobile_cleanup_v2_idempotency(1);
    raise exception 'assertion_failed: anon executed privileged cleanup';
  exception when insufficient_privilege then null;
  end;
  perform set_config('role', 'authenticated', true);
  begin
    perform public.mobile_cleanup_v2_idempotency(1);
    raise exception 'assertion_failed: authenticated executed privileged cleanup';
  exception when insufficient_privilege then null;
  end;
  perform set_config('role', 'postgres', true);
end;
$$;
