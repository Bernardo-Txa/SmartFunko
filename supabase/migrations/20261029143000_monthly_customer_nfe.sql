create table public.bling_monthly_nfe_issues (
  id uuid primary key default gen_random_uuid(),
  competence_id uuid not null references public.v2_order_competencies(id) on delete restrict,
  customer_id uuid not null references public.customers(id) on delete restrict,
  status text not null default 'draft'
    check (status in ('draft', 'created', 'sent', 'authorized', 'rejected', 'cancelled', 'failed')),
  bling_nfe_id text,
  bling_number text,
  bling_series text,
  access_key text,
  danfe_url text,
  pdf_url text,
  xml_url text,
  request_payload jsonb,
  response_payload jsonb,
  error_message text,
  emitted_at timestamptz,
  sent_at timestamptz,
  last_synced_at timestamptz,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (competence_id, customer_id)
);

create table public.bling_monthly_nfe_issue_orders (
  issue_id uuid not null references public.bling_monthly_nfe_issues(id) on delete cascade,
  order_id uuid not null references public.v2_orders(id) on delete restrict,
  created_at timestamptz not null default now(),
  primary key (issue_id, order_id),
  unique (order_id)
);

create index bling_monthly_nfe_issues_competence_idx
  on public.bling_monthly_nfe_issues (competence_id, customer_id);
create index bling_monthly_nfe_issues_customer_idx
  on public.bling_monthly_nfe_issues (customer_id);
create index bling_monthly_nfe_issues_created_by_idx
  on public.bling_monthly_nfe_issues (created_by)
  where created_by is not null;
create index bling_monthly_nfe_issues_bling_id_idx
  on public.bling_monthly_nfe_issues (bling_nfe_id)
  where bling_nfe_id is not null;

drop trigger if exists set_bling_monthly_nfe_issues_updated_at on public.bling_monthly_nfe_issues;
create trigger set_bling_monthly_nfe_issues_updated_at
before update on public.bling_monthly_nfe_issues
for each row execute function public.set_updated_at();

alter table public.bling_monthly_nfe_issues enable row level security;
alter table public.bling_monthly_nfe_issue_orders enable row level security;

-- Estas tabelas sao acessadas apenas pelas rotas administrativas server-side.
revoke all on table public.bling_monthly_nfe_issues from anon, authenticated;
revoke all on table public.bling_monthly_nfe_issue_orders from anon, authenticated;
grant select, insert, update, delete on table public.bling_monthly_nfe_issues to service_role;
grant select, insert, update, delete on table public.bling_monthly_nfe_issue_orders to service_role;

drop policy if exists "admin_all_bling_monthly_nfe_issues" on public.bling_monthly_nfe_issues;
create policy "admin_all_bling_monthly_nfe_issues"
on public.bling_monthly_nfe_issues for all
using (public.is_admin()) with check (public.is_admin());

drop policy if exists "admin_all_bling_monthly_nfe_issue_orders" on public.bling_monthly_nfe_issue_orders;
create policy "admin_all_bling_monthly_nfe_issue_orders"
on public.bling_monthly_nfe_issue_orders for all
using (public.is_admin()) with check (public.is_admin());

comment on table public.bling_monthly_nfe_issues is
  'NF-e consolidada por cliente e competencia comercial no Bling.';
comment on table public.bling_monthly_nfe_issue_orders is
  'Pedidos incluidos em cada NF-e mensal; order_id unico impede faturamento mensal duplicado.';
