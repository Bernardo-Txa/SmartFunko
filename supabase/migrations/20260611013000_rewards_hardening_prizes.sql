alter table public.monthly_order_ranking_entries
  add column if not exists reward_delivered_at timestamptz,
  add column if not exists reward_delivered_by uuid references public.profiles(id) on delete set null,
  add column if not exists reward_cancelled_at timestamptz,
  add column if not exists reward_cancelled_by uuid references public.profiles(id) on delete set null;

create index if not exists monthly_order_ranking_entries_reward_status_idx
on public.monthly_order_ranking_entries(reward_status);

comment on column public.monthly_order_ranking_entries.reward_delivered_at is
  'Data em que o admin marcou o brinde do ranking como entregue.';

comment on column public.monthly_order_ranking_entries.reward_delivered_by is
  'Admin que marcou o brinde do ranking como entregue.';

comment on column public.monthly_order_ranking_entries.reward_cancelled_at is
  'Data em que o admin cancelou o brinde do ranking.';

comment on column public.monthly_order_ranking_entries.reward_cancelled_by is
  'Admin que cancelou o brinde do ranking.';
