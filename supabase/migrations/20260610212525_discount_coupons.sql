create table if not exists public.discount_coupons (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  description text,
  discount_type text not null check (discount_type in ('fixed', 'percent')),
  value numeric(12, 2) not null check (value > 0),
  max_discount numeric(12, 2) check (max_discount is null or max_discount > 0),
  min_order_total numeric(12, 2) not null default 0 check (min_order_total >= 0),
  usage_limit integer check (usage_limit is null or usage_limit > 0),
  used_count integer not null default 0 check (used_count >= 0),
  is_active boolean not null default true,
  starts_at timestamptz,
  expires_at timestamptz,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.orders
  add column if not exists coupon_id uuid references public.discount_coupons(id) on delete set null,
  add column if not exists coupon_code text;

create index if not exists discount_coupons_code_idx
on public.discount_coupons(code);

create index if not exists discount_coupons_active_idx
on public.discount_coupons(is_active);

create index if not exists orders_coupon_id_idx
on public.orders(coupon_id);

drop trigger if exists set_discount_coupons_updated_at on public.discount_coupons;
create trigger set_discount_coupons_updated_at
before update on public.discount_coupons
for each row execute function public.set_updated_at();

alter table public.discount_coupons enable row level security;

drop policy if exists "owner_all_discount_coupons" on public.discount_coupons;
create policy "owner_all_discount_coupons"
on public.discount_coupons for all
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "customers_select_active_discount_coupons" on public.discount_coupons;
create policy "customers_select_active_discount_coupons"
on public.discount_coupons for select
using (
  is_active = true
  and (starts_at is null or starts_at <= now())
  and (expires_at is null or expires_at >= now())
  and (usage_limit is null or used_count < usage_limit)
);

comment on table public.discount_coupons is 'Cupons de desconto aplicaveis no carrinho assistido antes da analise admin.';
comment on column public.orders.coupon_code is 'Codigo do cupom aplicado no momento da criacao do pedido.';
