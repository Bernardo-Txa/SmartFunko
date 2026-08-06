alter table public.v2_orders
  add column if not exists legacy_order_id uuid references public.orders(id) on delete set null;

alter table public.v2_order_items
  add column if not exists legacy_order_item_id uuid references public.order_items(id) on delete set null;

alter table public.v2_payment_sessions
  add column if not exists legacy_payment_id uuid references public.payments(id) on delete set null;

create unique index if not exists v2_orders_legacy_order_id_key
on public.v2_orders(legacy_order_id)
where legacy_order_id is not null;

create unique index if not exists v2_order_items_legacy_order_item_id_key
on public.v2_order_items(legacy_order_item_id)
where legacy_order_item_id is not null;

create unique index if not exists v2_payment_sessions_legacy_payment_id_key
on public.v2_payment_sessions(legacy_payment_id)
where legacy_payment_id is not null;

comment on column public.v2_orders.legacy_order_id is 'Pedido V1 que originou este pedido V2 durante migracao controlada.';
comment on column public.v2_order_items.legacy_order_item_id is 'Item de pedido V1 que originou este item V2 durante migracao controlada.';
comment on column public.v2_payment_sessions.legacy_payment_id is 'Pagamento V1 que originou esta sessao V2 durante migracao controlada.';
