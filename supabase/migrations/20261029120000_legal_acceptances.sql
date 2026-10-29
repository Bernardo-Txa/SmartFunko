create table public.legal_acceptances (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid not null references auth.users(id) on delete cascade,
  terms_version text not null,
  privacy_version text not null,
  accepted_at timestamptz not null default now(),
  user_agent text,
  ip_address text,
  acceptance_source text not null default 'web'
    check (acceptance_source in ('web', 'mobile')),
  unique (auth_user_id, terms_version, privacy_version)
);

comment on table public.legal_acceptances is
  'Historico imutavel de aceite dos Termos de Uso e da Politica de Privacidade.';

create index legal_acceptances_user_accepted_at_idx
  on public.legal_acceptances (auth_user_id, accepted_at desc);

alter table public.legal_acceptances enable row level security;

-- O aceite e consultado e gravado exclusivamente pelo backend autenticado.
-- Nenhum cliente pode alterar ou apagar a evidencia diretamente pela Data API.
revoke all on table public.legal_acceptances from anon, authenticated;
grant select, insert on table public.legal_acceptances to service_role;

