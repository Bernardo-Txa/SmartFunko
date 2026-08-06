create table if not exists public.popflix_subscriptions (
  id uuid primary key default gen_random_uuid(),
  subscription_code text not null unique,
  customer_id uuid not null references public.customers(id) on delete cascade,
  plan text not null check (plan in ('basic', 'deluxe', 'premium')),
  status text not null default 'pending_payment' check (
    status in ('pending_payment', 'active', 'paused', 'cancelled', 'expired')
  ),
  monthly_price numeric(12, 2) not null check (monthly_price > 0),
  favorite_franchises text,
  notes text,
  payment_provider text,
  payment_provider_reference text,
  payment_link_url text,
  started_at timestamptz,
  next_billing_at timestamptz,
  last_payment_at timestamptz,
  cancelled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists popflix_subscriptions_customer_id_idx
on public.popflix_subscriptions(customer_id);

create index if not exists popflix_subscriptions_status_idx
on public.popflix_subscriptions(status);

create index if not exists popflix_subscriptions_plan_idx
on public.popflix_subscriptions(plan);

drop trigger if exists set_popflix_subscriptions_updated_at on public.popflix_subscriptions;
create trigger set_popflix_subscriptions_updated_at before update on public.popflix_subscriptions
for each row execute function public.set_updated_at();

alter table public.popflix_subscriptions enable row level security;

drop policy if exists "customers_select_own_popflix_subscriptions" on public.popflix_subscriptions;
create policy "customers_select_own_popflix_subscriptions"
on public.popflix_subscriptions for select
using (
  customer_id in (
    select id from public.customers where profile_id = public.current_profile_id()
  )
  or public.is_owner()
);

drop policy if exists "owner_all_popflix_subscriptions" on public.popflix_subscriptions;
create policy "owner_all_popflix_subscriptions"
on public.popflix_subscriptions for all
using (public.is_owner())
with check (public.is_owner());
