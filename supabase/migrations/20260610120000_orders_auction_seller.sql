alter type public.order_item_source add value if not exists 'auction';

alter table public.orders
  add column if not exists seller text;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'orders_seller_check'
      and conrelid = 'public.orders'::regclass
  ) then
    alter table public.orders
      add constraint orders_seller_check
      check (seller is null or seller in ('daniel', 'allana'));
  end if;
end $$;

create index if not exists orders_seller_idx
on public.orders(seller);

comment on column public.orders.seller is
  'Vendedor responsavel pela venda: daniel ou allana.';
