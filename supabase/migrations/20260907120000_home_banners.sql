create table if not exists public.home_banners (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  subtitle text,
  eyebrow text,
  image_url text not null,
  mobile_image_url text,
  link_url text,
  button_label text,
  status text not null default 'active'
    check (status in ('active', 'inactive', 'archived')),
  display_order integer not null default 0,
  open_in_new_tab boolean not null default false,
  starts_at timestamptz,
  ends_at timestamptz,
  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint home_banners_period_check check (
    starts_at is null
    or ends_at is null
    or starts_at <= ends_at
  )
);

create index if not exists home_banners_public_idx
on public.home_banners(status, display_order, created_at desc);

drop trigger if exists set_home_banners_updated_at on public.home_banners;
create trigger set_home_banners_updated_at
before update on public.home_banners
for each row execute function public.set_updated_at();

alter table public.home_banners enable row level security;

drop policy if exists "home_banners_public_read_active" on public.home_banners;
create policy "home_banners_public_read_active"
on public.home_banners for select
to public
using (
  status = 'active'
  and (starts_at is null or starts_at <= now())
  and (ends_at is null or ends_at >= now())
);

drop policy if exists "home_banners_admin_all" on public.home_banners;
create policy "home_banners_admin_all"
on public.home_banners for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

grant select on public.home_banners to anon, authenticated;
grant insert, update, delete on public.home_banners to authenticated;

comment on table public.home_banners is 'Banners promocionais da home com imagem larga e link opcional.';
comment on column public.home_banners.image_url is 'Imagem principal do banner, idealmente em proporcao larga.';
comment on column public.home_banners.mobile_image_url is 'Imagem opcional para mobile, quando o recorte desktop nao funcionar bem.';
