create table if not exists public.bling_nfe_issues (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.v2_orders(id) on delete cascade,
  status text not null default 'draft'
    check (status in ('draft', 'created', 'sent', 'authorized', 'rejected', 'cancelled', 'failed')),
  bling_nfe_id text,
  bling_number text,
  access_key text,
  danfe_url text,
  pdf_url text,
  xml_url text,
  request_payload jsonb,
  response_payload jsonb,
  error_message text,
  emitted_at timestamptz,
  sent_at timestamptz,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (order_id)
);

create index if not exists bling_nfe_issues_order_id_idx
on public.bling_nfe_issues(order_id);

create index if not exists bling_nfe_issues_bling_nfe_id_idx
on public.bling_nfe_issues(bling_nfe_id)
where bling_nfe_id is not null;

drop trigger if exists set_bling_nfe_issues_updated_at on public.bling_nfe_issues;
create trigger set_bling_nfe_issues_updated_at before update on public.bling_nfe_issues
for each row execute function public.set_updated_at();

alter table public.bling_nfe_issues enable row level security;

drop policy if exists "admin_all_bling_nfe_issues" on public.bling_nfe_issues;
create policy "admin_all_bling_nfe_issues"
on public.bling_nfe_issues for all
using (public.is_admin())
with check (public.is_admin());

comment on table public.bling_nfe_issues is 'Controle local das NF-e criadas/enviadas no Bling a partir de pedidos V2.';
