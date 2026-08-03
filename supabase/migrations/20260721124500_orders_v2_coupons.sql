alter table public.v2_orders
  add column if not exists coupon_id uuid references public.discount_coupons(id) on delete set null,
  add column if not exists coupon_code text;

create index if not exists v2_orders_coupon_id_idx on public.v2_orders(coupon_id);

comment on column public.v2_orders.coupon_id is 'Cupom aplicado ao pedido V2, quando o pedido veio do carrinho.';
comment on column public.v2_orders.coupon_code is 'Codigo do cupom aplicado ao pedido V2 no momento da criacao.';
