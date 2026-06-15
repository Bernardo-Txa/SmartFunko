alter table public.orders
  add column if not exists payment_max_installments integer,
  add column if not exists payment_max_installments_source text,
  add column if not exists payment_fee_mode text,
  add column if not exists payment_provider_payload jsonb,
  add column if not exists paid_installments integer,
  add column if not exists provider_payment_method text,
  add column if not exists provider_fee_amount numeric(12, 2);

alter table public.payments
  add column if not exists payment_max_installments integer,
  add column if not exists payment_max_installments_source text,
  add column if not exists payment_fee_mode text,
  add column if not exists paid_installments integer,
  add column if not exists provider_payment_method text,
  add column if not exists provider_fee_amount numeric(12, 2),
  add column if not exists provider_payload jsonb;

alter table public.raffle_orders
  add column if not exists payment_max_installments integer,
  add column if not exists payment_max_installments_source text,
  add column if not exists payment_fee_mode text,
  add column if not exists paid_installments integer,
  add column if not exists provider_payment_method text,
  add column if not exists provider_fee_amount numeric(12, 2);

alter table public.orders
  drop constraint if exists orders_payment_max_installments_check,
  add constraint orders_payment_max_installments_check
  check (payment_max_installments is null or payment_max_installments between 1 and 12);

alter table public.orders
  drop constraint if exists orders_payment_max_installments_source_check,
  add constraint orders_payment_max_installments_source_check
  check (payment_max_installments_source is null or payment_max_installments_source in ('default_rule', 'admin_override'));

alter table public.orders
  drop constraint if exists orders_payment_fee_mode_check,
  add constraint orders_payment_fee_mode_check
  check (payment_fee_mode is null or payment_fee_mode in ('merchant_absorbs', 'customer_pays', 'account_default'));

alter table public.orders
  drop constraint if exists orders_paid_installments_check,
  add constraint orders_paid_installments_check
  check (paid_installments is null or paid_installments between 1 and 12);

alter table public.orders
  drop constraint if exists orders_provider_fee_amount_check,
  add constraint orders_provider_fee_amount_check
  check (provider_fee_amount is null or provider_fee_amount >= 0);

alter table public.payments
  drop constraint if exists payments_payment_max_installments_check,
  add constraint payments_payment_max_installments_check
  check (payment_max_installments is null or payment_max_installments between 1 and 12);

alter table public.payments
  drop constraint if exists payments_payment_max_installments_source_check,
  add constraint payments_payment_max_installments_source_check
  check (payment_max_installments_source is null or payment_max_installments_source in ('default_rule', 'admin_override'));

alter table public.payments
  drop constraint if exists payments_payment_fee_mode_check,
  add constraint payments_payment_fee_mode_check
  check (payment_fee_mode is null or payment_fee_mode in ('merchant_absorbs', 'customer_pays', 'account_default'));

alter table public.payments
  drop constraint if exists payments_paid_installments_check,
  add constraint payments_paid_installments_check
  check (paid_installments is null or paid_installments between 1 and 12);

alter table public.payments
  drop constraint if exists payments_provider_fee_amount_check,
  add constraint payments_provider_fee_amount_check
  check (provider_fee_amount is null or provider_fee_amount >= 0);

alter table public.raffle_orders
  drop constraint if exists raffle_orders_payment_max_installments_check,
  add constraint raffle_orders_payment_max_installments_check
  check (payment_max_installments is null or payment_max_installments between 1 and 12);

alter table public.raffle_orders
  drop constraint if exists raffle_orders_payment_max_installments_source_check,
  add constraint raffle_orders_payment_max_installments_source_check
  check (payment_max_installments_source is null or payment_max_installments_source in ('default_rule', 'admin_override'));

alter table public.raffle_orders
  drop constraint if exists raffle_orders_payment_fee_mode_check,
  add constraint raffle_orders_payment_fee_mode_check
  check (payment_fee_mode is null or payment_fee_mode in ('merchant_absorbs', 'customer_pays', 'account_default'));

alter table public.raffle_orders
  drop constraint if exists raffle_orders_paid_installments_check,
  add constraint raffle_orders_paid_installments_check
  check (paid_installments is null or paid_installments between 1 and 12);

alter table public.raffle_orders
  drop constraint if exists raffle_orders_provider_fee_amount_check,
  add constraint raffle_orders_provider_fee_amount_check
  check (provider_fee_amount is null or provider_fee_amount >= 0);

comment on column public.orders.payment_max_installments is 'Limite maximo de parcelas aprovado internamente para o link de pagamento.';
comment on column public.orders.payment_max_installments_source is 'Origem do limite de parcelas: default_rule ou admin_override.';
comment on column public.orders.payment_fee_mode is 'Modo interno de taxa: merchant_absorbs, customer_pays ou account_default.';
comment on column public.orders.payment_provider_payload is 'Resumo auditavel do payload de criacao e resposta do provedor.';
comment on column public.orders.paid_installments is 'Parcelas efetivamente escolhidas no provedor, quando informado por webhook/status.';
comment on column public.orders.provider_payment_method is 'Metodo de pagamento informado pelo provedor.';
comment on column public.orders.provider_fee_amount is 'Taxa informada explicitamente pelo provedor, quando disponivel.';

comment on column public.payments.payment_max_installments is 'Limite maximo de parcelas aprovado internamente para o pagamento.';
comment on column public.payments.payment_max_installments_source is 'Origem do limite de parcelas: default_rule ou admin_override.';
comment on column public.payments.payment_fee_mode is 'Modo interno de taxa: merchant_absorbs, customer_pays ou account_default.';
comment on column public.payments.paid_installments is 'Parcelas efetivamente escolhidas no provedor, quando informado por webhook/status.';
comment on column public.payments.provider_payment_method is 'Metodo de pagamento informado pelo provedor.';
comment on column public.payments.provider_fee_amount is 'Taxa informada explicitamente pelo provedor, quando disponivel.';
comment on column public.payments.provider_payload is 'Payload bruto do provedor vinculado ao pagamento, quando disponivel.';

comment on column public.raffle_orders.payment_max_installments is 'Limite maximo de parcelas aprovado internamente para pagamento de rifa.';
comment on column public.raffle_orders.payment_max_installments_source is 'Origem do limite de parcelas da rifa.';
comment on column public.raffle_orders.payment_fee_mode is 'Rifas devem usar customer_pays; enforcement no checkout depende da conta/API InfinitePay.';
comment on column public.raffle_orders.paid_installments is 'Parcelas efetivamente escolhidas no provedor, quando informado por webhook/status.';
comment on column public.raffle_orders.provider_payment_method is 'Metodo de pagamento informado pelo provedor.';
comment on column public.raffle_orders.provider_fee_amount is 'Taxa informada explicitamente pelo provedor, quando disponivel.';
