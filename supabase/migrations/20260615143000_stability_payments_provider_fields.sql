alter table public.payments
  add column if not exists provider text,
  add column if not exists provider_reference text,
  add column if not exists payment_link_url text;

create index if not exists payments_provider_reference_idx
on public.payments(provider_reference);

comment on column public.payments.provider is 'Gateway ou provedor externo associado ao pagamento, quando aplicavel.';
comment on column public.payments.provider_reference is 'Referencia externa do provedor para conciliacao do pagamento.';
comment on column public.payments.payment_link_url is 'URL externa de checkout associada ao pagamento, quando aplicavel.';
