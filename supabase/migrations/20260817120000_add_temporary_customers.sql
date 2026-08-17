create table if not exists public.temporary_customers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text not null,
  phone_normalized text not null,
  notes text,
  status text not null default 'active' check (status in ('active', 'merged', 'archived')),
  merged_customer_id uuid references public.customers(id) on delete set null,
  merged_at timestamptz,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists temporary_customers_active_phone_idx
  on public.temporary_customers(phone_normalized)
  where status = 'active';

alter table public.v2_orders
  add column if not exists temporary_customer_id uuid references public.temporary_customers(id) on delete set null;

alter table public.v2_orders
  alter column customer_id drop not null;

do $$
begin
  alter table public.v2_orders
    add constraint v2_orders_customer_identity_check
    check (
      (customer_id is not null and temporary_customer_id is null)
      or
      (customer_id is null and temporary_customer_id is not null)
    );
exception
  when duplicate_object then null;
end $$;

create index if not exists v2_orders_temporary_customer_id_idx
  on public.v2_orders(temporary_customer_id);
