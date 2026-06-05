create table if not exists public.suppliers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text,
  logo_url text,
  banner_url text,
  accent_color text,
  website_url text,
  status text not null default 'active' check (status in ('active', 'inactive', 'hidden')),
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.products
  add column if not exists supplier_id uuid references public.suppliers(id) on delete set null;

create index if not exists suppliers_slug_idx on public.suppliers(slug);
create index if not exists suppliers_status_idx on public.suppliers(status);
create index if not exists products_supplier_id_idx on public.products(supplier_id);

drop trigger if exists set_suppliers_updated_at on public.suppliers;
create trigger set_suppliers_updated_at before update on public.suppliers
for each row execute function public.set_updated_at();

alter table public.suppliers enable row level security;

drop policy if exists "public_suppliers_select_active" on public.suppliers;
create policy "public_suppliers_select_active"
on public.suppliers for select
using (status = 'active' or public.is_owner());

drop policy if exists "owner_all_suppliers" on public.suppliers;
create policy "owner_all_suppliers"
on public.suppliers for all
using (public.is_owner())
with check (public.is_owner());

grant select on public.suppliers to anon, authenticated;
grant all on public.suppliers to authenticated;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.current_profile_role() = 'owner', false)
$$;

comment on function public.is_admin() is
  'Alias legado para acesso interno. Na aplicacao V1, somente owner deve acessar areas administrativas.';

insert into public.suppliers (name, slug, logo_url, sort_order, status)
values
  ('Piticas', 'piticas', '/brand/piticas.webp', 10, 'active'),
  ('Copag', 'copag', null, 20, 'active'),
  ('Panini', 'panini', null, 30, 'active')
on conflict (slug) do update
set
  name = excluded.name,
  logo_url = coalesce(excluded.logo_url, public.suppliers.logo_url),
  sort_order = excluded.sort_order,
  status = excluded.status;
