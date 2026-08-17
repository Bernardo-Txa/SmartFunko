alter table public.temporary_customers enable row level security;

drop policy if exists "admin_all_temporary_customers" on public.temporary_customers;
create policy "admin_all_temporary_customers"
on public.temporary_customers for all
using (public.is_admin()) with check (public.is_admin());
