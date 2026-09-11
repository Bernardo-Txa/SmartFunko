create table if not exists public.integration_oauth_tokens (
  id uuid primary key default gen_random_uuid(),
  provider text not null unique,
  access_token text not null,
  refresh_token text,
  token_type text,
  scope text,
  expires_at timestamptz,
  last_refreshed_at timestamptz,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint integration_oauth_tokens_provider_check
    check (provider in ('bling'))
);

drop trigger if exists set_integration_oauth_tokens_updated_at on public.integration_oauth_tokens;
create trigger set_integration_oauth_tokens_updated_at before update on public.integration_oauth_tokens
for each row execute function public.set_updated_at();

alter table public.integration_oauth_tokens enable row level security;

comment on table public.integration_oauth_tokens is 'Tokens OAuth server-only para integracoes externas. Sem policy RLS: acesso apenas via service role.';
comment on column public.integration_oauth_tokens.access_token is 'Token sensivel. Nunca expor em respostas de API ou clientes.';
comment on column public.integration_oauth_tokens.refresh_token is 'Refresh token sensivel. Nunca expor em respostas de API ou clientes.';

alter table public.bling_nfe_issues
  add column if not exists bling_series text,
  add column if not exists last_synced_at timestamptz;
