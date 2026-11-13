\set ON_ERROR_STOP on
set role service_role;
select public.mobile_start_v2_payment_session_idempotent(
  (select id from public.customers where email = 'CODEX_TEST_IDEMP_A@example.invalid'),
  (select id from public.profiles where email = 'CODEX_TEST_IDEMP_A@example.invalid'),
  'CODEX_TEST_PAYMENT_CONCURRENT_0001',
  repeat('f', 64),
  array[(select id from public.v2_orders where notes = 'CODEX_TEST_ORDER')]
);
