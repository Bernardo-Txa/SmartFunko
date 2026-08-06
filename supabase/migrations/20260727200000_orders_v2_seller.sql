alter table public.v2_orders
  add column if not exists seller text;

alter table public.v2_orders
  drop constraint if exists v2_orders_seller_check,
  add constraint v2_orders_seller_check
  check (seller is null or seller in ('daniel', 'allana'));

create index if not exists v2_orders_seller_idx on public.v2_orders(seller);

update public.v2_orders
set seller = orders.seller
from public.orders
where v2_orders.legacy_order_id = orders.id
  and v2_orders.seller is null
  and orders.seller in ('daniel', 'allana');

comment on column public.v2_orders.seller is 'Vendedor responsavel pelo pedido V2, quando definido pelo admin.';
