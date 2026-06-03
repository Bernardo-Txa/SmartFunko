create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  new_profile_id uuid;
  display_name text;
begin
  display_name := coalesce(
    nullif(new.raw_user_meta_data->>'name', ''),
    nullif(new.raw_user_meta_data->>'full_name', ''),
    split_part(new.email, '@', 1),
    'Cliente Smart'
  );

  insert into public.profiles (auth_user_id, name, email, role)
  values (new.id, display_name, coalesce(new.email, ''), 'customer')
  on conflict (auth_user_id) do update
  set
    name = excluded.name,
    email = excluded.email
  returning id into new_profile_id;

  insert into public.customers (profile_id, name, email, phone, cpf, instagram)
  values (
    new_profile_id,
    display_name,
    new.email,
    nullif(new.raw_user_meta_data->>'phone', ''),
    nullif(new.raw_user_meta_data->>'cpf', ''),
    nullif(new.raw_user_meta_data->>'instagram', '')
  )
  on conflict (profile_id) do update
  set
    name = excluded.name,
    email = excluded.email,
    phone = coalesce(excluded.phone, public.customers.phone),
    cpf = coalesce(excluded.cpf, public.customers.cpf),
    instagram = coalesce(excluded.instagram, public.customers.instagram);

  return new;
end;
$$;
