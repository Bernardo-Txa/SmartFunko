\set ON_ERROR_STOP on

-- Local-only behavioral validation for 20261113005521.
-- This script never calls a payment provider. All fixtures use CODEX_TEST_ names
-- and example.invalid email addresses. The local stack is destroyed afterwards.

create or replace function pg_temp.assert_true(condition boolean, message text)
returns void language plpgsql as $$
begin
  if condition is not true then
    raise exception 'assertion_failed: %', message;
  end if;
end;
$$;

delete from auth.users
where email in (
  'CODEX_TEST_IDEMP_A@example.invalid',
  'CODEX_TEST_IDEMP_B@example.invalid'
);

insert into auth.users (
  id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
)
values
  ('91000000-0000-4000-8000-000000000001', 'authenticated', 'authenticated',
   'CODEX_TEST_IDEMP_A@example.invalid', '', now(),
   '{"provider":"email","providers":["email"]}', '{"name":"CODEX_TEST_IDEMP_A"}', now(), now()),
  ('91000000-0000-4000-8000-000000000002', 'authenticated', 'authenticated',
   'CODEX_TEST_IDEMP_B@example.invalid', '', now(),
   '{"provider":"email","providers":["email"]}', '{"name":"CODEX_TEST_IDEMP_B"}', now(), now());

insert into public.v2_order_competencies (
  id, code, label, starts_on, ends_on, status
)
values
  ('60000000-0000-4000-8000-000000000001', 'CODEX_TEST_CURRENT', 'CODEX_TEST_CURRENT', current_date - 1, current_date + 1, 'open'),
  ('60000000-0000-4000-8000-000000000002', 'CODEX_TEST_OTHER', 'CODEX_TEST_OTHER', current_date + 10, current_date + 20, 'closed')
on conflict (id) do update set
  starts_on = excluded.starts_on,
  ends_on = excluded.ends_on,
  status = excluded.status;

insert into public.products (id, name, slug, status, product_type)
values ('40000000-0000-4000-8000-000000000001', 'CODEX_TEST_PRODUCT', 'codex-test-product', 'active', 'funko_pop')
on conflict (id) do update set name = excluded.name, status = excluded.status;

insert into public.product_variants (id, product_id, sku, sale_price, status)
values ('50000000-0000-4000-8000-000000000001', '40000000-0000-4000-8000-000000000001', 'CODEX_TEST_SKU', 25.00, 'available')
on conflict (id) do update set sale_price = excluded.sale_price, status = excluded.status;

select pg_temp.assert_true(
  (select relrowsecurity from pg_class where oid = 'public.mobile_idempotency_requests'::regclass),
  'ledger RLS must be enabled'
);
select pg_temp.assert_true(not has_table_privilege('anon', 'public.mobile_idempotency_requests', 'SELECT'), 'anon must not read ledger');
select pg_temp.assert_true(not has_table_privilege('authenticated', 'public.mobile_idempotency_requests', 'SELECT'), 'authenticated must not read ledger');
select pg_temp.assert_true(not has_table_privilege('service_role', 'public.mobile_idempotency_requests', 'SELECT'), 'service_role must use RPCs, not the ledger directly');

select pg_temp.assert_true(
  not has_function_privilege('anon', 'public.mobile_create_v2_order_idempotent(uuid,uuid,text,text,jsonb,text,uuid,text)', 'EXECUTE'),
  'anon must not execute order RPC'
);
select pg_temp.assert_true(
  not has_function_privilege('authenticated', 'public.mobile_start_v2_payment_session_idempotent(uuid,uuid,text,text,uuid[])', 'EXECUTE'),
  'authenticated must not execute payment RPC'
);
select pg_temp.assert_true(
  has_function_privilege('service_role', 'public.mobile_create_v2_order_idempotent(uuid,uuid,text,text,jsonb,text,uuid,text)', 'EXECUTE'),
  'service_role must execute order RPC'
);

set role service_role;
select public.mobile_create_v2_order_idempotent(
  (select id from public.customers where email = 'CODEX_TEST_IDEMP_A@example.invalid'),
  (select id from public.profiles where email = 'CODEX_TEST_IDEMP_A@example.invalid'),
  'CODEX_TEST_ORDER_KEY_0001', repeat('a', 64),
  '[{"productVariantId":"50000000-0000-4000-8000-000000000001","productId":"40000000-0000-4000-8000-000000000001","itemContext":"general","productName":"CODEX_TEST_PRODUCT","productSku":"CODEX_TEST_SKU","quantity":2,"unitPrice":25.00}]'::jsonb,
  'CODEX_TEST_ORDER', null, null
);
select public.mobile_create_v2_order_idempotent(
  (select id from public.customers where email = 'CODEX_TEST_IDEMP_A@example.invalid'),
  (select id from public.profiles where email = 'CODEX_TEST_IDEMP_A@example.invalid'),
  'CODEX_TEST_ORDER_KEY_0001', repeat('a', 64),
  '[{"productVariantId":"50000000-0000-4000-8000-000000000001","productId":"40000000-0000-4000-8000-000000000001","itemContext":"general","productName":"CODEX_TEST_PRODUCT","productSku":"CODEX_TEST_SKU","quantity":2,"unitPrice":25.00}]'::jsonb,
  'CODEX_TEST_ORDER', null, null
);
reset role;

select pg_temp.assert_true(
  (select count(*) = 1 from public.mobile_idempotency_requests where idempotency_key = 'CODEX_TEST_ORDER_KEY_0001'),
  'same key must create one ledger row'
);
select pg_temp.assert_true(
  (select count(*) = 1 from public.v2_orders where notes = 'CODEX_TEST_ORDER'),
  'same key must create one order'
);
select pg_temp.assert_true(
  (select count(*) = 1 from public.v2_order_items i join public.v2_orders o on o.id = i.order_id where o.notes = 'CODEX_TEST_ORDER'),
  'order items must be created atomically'
);
select pg_temp.assert_true(
  (select count(*) = 1 from public.v2_order_events e join public.v2_orders o on o.id = e.order_id where o.notes = 'CODEX_TEST_ORDER' and e.event_type = 'order.created'),
  'order event must be created atomically'
);

do $$
begin
  perform set_config('role', 'service_role', true);
  begin
    perform public.mobile_create_v2_order_idempotent(
      (select id from public.customers where email = 'CODEX_TEST_IDEMP_A@example.invalid'),
      (select id from public.profiles where email = 'CODEX_TEST_IDEMP_A@example.invalid'),
      'CODEX_TEST_ORDER_KEY_0001', repeat('b', 64), '[]'::jsonb, null, null, null
    );
    raise exception 'assertion_failed: payload mismatch was accepted';
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
    perform public.mobile_create_v2_order_idempotent(
      (select id from public.customers where email = 'CODEX_TEST_IDEMP_A@example.invalid'),
      (select id from public.profiles where email = 'CODEX_TEST_IDEMP_B@example.invalid'),
      'CODEX_TEST_OWNERSHIP_001', repeat('c', 64),
      '[{"productVariantId":"50000000-0000-4000-8000-000000000001","productId":"40000000-0000-4000-8000-000000000001","itemContext":"general","productName":"CODEX_TEST_PRODUCT","productSku":"CODEX_TEST_SKU","quantity":1,"unitPrice":25.00}]'::jsonb,
      null, null, null
    );
    raise exception 'assertion_failed: cross-customer actor was accepted';
  exception when no_data_found then
    if sqlerrm <> 'customer_not_found' then raise; end if;
  end;
  perform set_config('role', 'postgres', true);
end;
$$;

select pg_temp.assert_true(
  not exists (select 1 from public.mobile_idempotency_requests where idempotency_key = 'CODEX_TEST_OWNERSHIP_001'),
  'failed ownership check must roll back ledger claim'
);

begin;
set local role service_role;
select public.mobile_create_v2_order_idempotent(
  (select id from public.customers where email = 'CODEX_TEST_IDEMP_A@example.invalid'),
  (select id from public.profiles where email = 'CODEX_TEST_IDEMP_A@example.invalid'),
  'CODEX_TEST_ROLLBACK_0001', repeat('d', 64),
  '[{"productVariantId":"50000000-0000-4000-8000-000000000001","productId":"40000000-0000-4000-8000-000000000001","itemContext":"general","productName":"CODEX_TEST_PRODUCT","productSku":"CODEX_TEST_SKU","quantity":1,"unitPrice":25.00}]'::jsonb,
  'CODEX_TEST_ROLLBACK_ORDER', null, null
);
rollback;

select pg_temp.assert_true(not exists(select 1 from public.mobile_idempotency_requests where idempotency_key = 'CODEX_TEST_ROLLBACK_0001'), 'ledger must roll back');
select pg_temp.assert_true(not exists(select 1 from public.v2_orders where notes = 'CODEX_TEST_ROLLBACK_ORDER'), 'order must roll back');

set role service_role;
select public.mobile_create_v2_order_idempotent(
  (select id from public.customers where email = 'CODEX_TEST_IDEMP_B@example.invalid'),
  (select id from public.profiles where email = 'CODEX_TEST_IDEMP_B@example.invalid'),
  'CODEX_TEST_ORDER_KEY_0001', repeat('e', 64),
  '[{"productVariantId":"50000000-0000-4000-8000-000000000001","productId":"40000000-0000-4000-8000-000000000001","itemContext":"general","productName":"CODEX_TEST_PRODUCT","productSku":"CODEX_TEST_SKU","quantity":1,"unitPrice":25.00}]'::jsonb,
  'CODEX_TEST_ORDER_CUSTOMER_B', null, null
);
reset role;

select pg_temp.assert_true(
  (select count(*) = 2 from public.mobile_idempotency_requests where operation = 'order.create' and idempotency_key = 'CODEX_TEST_ORDER_KEY_0001'),
  'same key must be independently scoped to each customer'
);

update public.v2_orders
set approval_status = 'aprovado'
where notes = 'CODEX_TEST_ORDER';

-- The concurrent shell test uses this order and key. No provider RPC is called.
select id as codex_test_payable_order_id
from public.v2_orders
where notes = 'CODEX_TEST_ORDER';
