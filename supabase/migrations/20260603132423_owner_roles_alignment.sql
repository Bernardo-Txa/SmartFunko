do $$
begin
  if exists (
    select 1
    from pg_enum
    join pg_type on pg_type.oid = pg_enum.enumtypid
    where pg_type.typnamespace = 'public'::regnamespace
      and pg_type.typname = 'profile_role'
      and pg_enum.enumlabel = 'staff'
  ) then
    update public.profiles
    set role = 'owner'::public.profile_role
    where role::text = 'staff';
  end if;
end $$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.current_profile_role() in ('admin', 'owner'), false)
$$;

comment on function public.is_admin() is
  'Alias legado para acesso interno. A role principal da operacao SmartFunko e owner; admin permanece apenas por compatibilidade.';
