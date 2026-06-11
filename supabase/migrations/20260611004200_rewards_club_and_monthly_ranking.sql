create table if not exists public.reward_profiles (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null unique references public.customers(id) on delete cascade,
  current_points integer not null default 0 check (current_points >= 0),
  lifetime_points integer not null default 0 check (lifetime_points >= 0),
  level text not null default 'visitor',
  public_nickname text,
  show_in_rankings boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.reward_point_ledger (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete cascade,
  direction text not null check (direction in ('earn', 'spend', 'reverse', 'adjust')),
  points integer not null check (points > 0),
  source_type text not null,
  source_id uuid,
  reason text not null,
  metadata jsonb,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  unique(customer_id, source_type, source_id, reason)
);

create table if not exists public.reward_badges (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  description text,
  icon text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.reward_profile_badges (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete cascade,
  badge_id uuid not null references public.reward_badges(id) on delete cascade,
  granted_by uuid references public.profiles(id) on delete set null,
  granted_at timestamptz not null default now(),
  metadata jsonb,
  unique(customer_id, badge_id)
);

create table if not exists public.monthly_order_rankings (
  id uuid primary key default gen_random_uuid(),
  year integer not null check (year >= 2020),
  month integer not null check (month between 1 and 12),
  title text not null,
  status text not null default 'open' check (status in ('open', 'closed', 'awarded', 'cancelled')),
  first_place_reward text,
  second_place_reward text,
  third_place_reward text,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  closed_at timestamptz,
  awarded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(year, month)
);

create table if not exists public.monthly_order_ranking_entries (
  id uuid primary key default gen_random_uuid(),
  ranking_id uuid not null references public.monthly_order_rankings(id) on delete cascade,
  order_id uuid not null references public.orders(id) on delete cascade,
  customer_id uuid not null references public.customers(id) on delete cascade,
  order_number text not null,
  order_total numeric(12, 2) not null check (order_total >= 0),
  paid_at timestamptz not null,
  rank_position integer,
  is_winner boolean not null default false,
  reward_status text not null default 'none' check (reward_status in ('none', 'pending', 'delivered', 'cancelled')),
  reward_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(ranking_id, order_id)
);

create index if not exists reward_profiles_customer_id_idx
on public.reward_profiles(customer_id);

create index if not exists reward_profiles_level_idx
on public.reward_profiles(level);

create index if not exists reward_point_ledger_customer_created_idx
on public.reward_point_ledger(customer_id, created_at desc);

create index if not exists reward_point_ledger_source_idx
on public.reward_point_ledger(source_type, source_id);

create index if not exists reward_profile_badges_customer_idx
on public.reward_profile_badges(customer_id);

create index if not exists monthly_order_rankings_year_month_idx
on public.monthly_order_rankings(year, month);

create index if not exists monthly_order_ranking_entries_ranking_idx
on public.monthly_order_ranking_entries(ranking_id);

create index if not exists monthly_order_ranking_entries_customer_idx
on public.monthly_order_ranking_entries(customer_id);

create index if not exists monthly_order_ranking_entries_total_idx
on public.monthly_order_ranking_entries(order_total desc);

create index if not exists monthly_order_ranking_entries_position_idx
on public.monthly_order_ranking_entries(rank_position);

drop trigger if exists set_reward_profiles_updated_at on public.reward_profiles;
create trigger set_reward_profiles_updated_at
before update on public.reward_profiles
for each row execute function public.set_updated_at();

drop trigger if exists set_reward_badges_updated_at on public.reward_badges;
create trigger set_reward_badges_updated_at
before update on public.reward_badges
for each row execute function public.set_updated_at();

drop trigger if exists set_monthly_order_rankings_updated_at on public.monthly_order_rankings;
create trigger set_monthly_order_rankings_updated_at
before update on public.monthly_order_rankings
for each row execute function public.set_updated_at();

drop trigger if exists set_monthly_order_ranking_entries_updated_at on public.monthly_order_ranking_entries;
create trigger set_monthly_order_ranking_entries_updated_at
before update on public.monthly_order_ranking_entries
for each row execute function public.set_updated_at();

alter table public.reward_profiles enable row level security;
alter table public.reward_point_ledger enable row level security;
alter table public.reward_badges enable row level security;
alter table public.reward_profile_badges enable row level security;
alter table public.monthly_order_rankings enable row level security;
alter table public.monthly_order_ranking_entries enable row level security;

drop policy if exists "owner_all_reward_profiles" on public.reward_profiles;
create policy "owner_all_reward_profiles"
on public.reward_profiles for all
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "customers_select_own_reward_profiles" on public.reward_profiles;
create policy "customers_select_own_reward_profiles"
on public.reward_profiles for select
using (
  exists (
    select 1
    from public.customers
    join public.profiles on profiles.id = customers.profile_id
    where customers.id = reward_profiles.customer_id
      and profiles.auth_user_id = auth.uid()
  )
);

drop policy if exists "owner_all_reward_point_ledger" on public.reward_point_ledger;
create policy "owner_all_reward_point_ledger"
on public.reward_point_ledger for all
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "customers_select_own_reward_point_ledger" on public.reward_point_ledger;
create policy "customers_select_own_reward_point_ledger"
on public.reward_point_ledger for select
using (
  exists (
    select 1
    from public.customers
    join public.profiles on profiles.id = customers.profile_id
    where customers.id = reward_point_ledger.customer_id
      and profiles.auth_user_id = auth.uid()
  )
);

drop policy if exists "owner_all_reward_badges" on public.reward_badges;
create policy "owner_all_reward_badges"
on public.reward_badges for all
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "customers_select_active_reward_badges" on public.reward_badges;
create policy "customers_select_active_reward_badges"
on public.reward_badges for select
using (is_active = true);

drop policy if exists "owner_all_reward_profile_badges" on public.reward_profile_badges;
create policy "owner_all_reward_profile_badges"
on public.reward_profile_badges for all
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "customers_select_own_reward_profile_badges" on public.reward_profile_badges;
create policy "customers_select_own_reward_profile_badges"
on public.reward_profile_badges for select
using (
  exists (
    select 1
    from public.customers
    join public.profiles on profiles.id = customers.profile_id
    where customers.id = reward_profile_badges.customer_id
      and profiles.auth_user_id = auth.uid()
  )
);

drop policy if exists "owner_all_monthly_order_rankings" on public.monthly_order_rankings;
create policy "owner_all_monthly_order_rankings"
on public.monthly_order_rankings for all
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "customers_select_monthly_order_rankings" on public.monthly_order_rankings;
create policy "customers_select_monthly_order_rankings"
on public.monthly_order_rankings for select
using (status in ('open', 'closed', 'awarded'));

drop policy if exists "owner_all_monthly_order_ranking_entries" on public.monthly_order_ranking_entries;
create policy "owner_all_monthly_order_ranking_entries"
on public.monthly_order_ranking_entries for all
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "customers_select_visible_monthly_order_ranking_entries" on public.monthly_order_ranking_entries;
create policy "customers_select_visible_monthly_order_ranking_entries"
on public.monthly_order_ranking_entries for select
using (
  exists (
    select 1 from public.reward_profiles
    where reward_profiles.customer_id = monthly_order_ranking_entries.customer_id
      and reward_profiles.show_in_rankings = true
  )
  or exists (
    select 1
    from public.customers
    join public.profiles on profiles.id = customers.profile_id
    where customers.id = monthly_order_ranking_entries.customer_id
      and profiles.auth_user_id = auth.uid()
  )
);

insert into public.reward_badges(code, name, description, icon)
values
  ('first_paid_order', 'Primeira compra paga', 'Cliente confirmou o primeiro pedido pago.', 'receipt'),
  ('top3_monthly_order', 'Top 3 mensal', 'Cliente ficou entre os 3 maiores pedidos pagos do mês.', 'trophy'),
  ('elite_collector', 'Colecionador de elite', 'Cliente alcançou um nível avançado no Clube Smart Funkos.', 'sparkles')
on conflict (code) do nothing;

comment on table public.reward_profiles is 'Perfil de pontos e nivel de longo prazo do Clube Smart Funkos.';
comment on table public.reward_point_ledger is 'Extrato imutavel de pontos do cliente.';
comment on table public.monthly_order_rankings is 'Competicoes mensais por maiores pedidos pagos individuais.';
comment on table public.monthly_order_ranking_entries is 'Entradas e ganhadores do ranking mensal de pedidos.';
