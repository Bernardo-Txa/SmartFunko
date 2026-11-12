alter table public.customers
  add column if not exists postal_code text,
  add column if not exists street text,
  add column if not exists address_number text,
  add column if not exists address_complement text,
  add column if not exists neighborhood text,
  add column if not exists city text,
  add column if not exists state text;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
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
  set name = excluded.name, email = excluded.email
  returning id into new_profile_id;

  insert into public.customers (
    profile_id, name, email, phone, cpf, instagram, postal_code, street,
    address_number, address_complement, neighborhood, city, state
  )
  values (
    new_profile_id,
    display_name,
    new.email,
    nullif(new.raw_user_meta_data->>'phone', ''),
    nullif(new.raw_user_meta_data->>'cpf', ''),
    nullif(new.raw_user_meta_data->>'instagram', ''),
    nullif(new.raw_user_meta_data->>'postal_code', ''),
    nullif(new.raw_user_meta_data->>'street', ''),
    nullif(new.raw_user_meta_data->>'address_number', ''),
    nullif(new.raw_user_meta_data->>'address_complement', ''),
    nullif(new.raw_user_meta_data->>'neighborhood', ''),
    nullif(new.raw_user_meta_data->>'city', ''),
    nullif(new.raw_user_meta_data->>'state', '')
  )
  on conflict (profile_id) do update
  set
    name = excluded.name,
    email = excluded.email,
    phone = coalesce(excluded.phone, public.customers.phone),
    cpf = coalesce(excluded.cpf, public.customers.cpf),
    instagram = coalesce(excluded.instagram, public.customers.instagram),
    postal_code = coalesce(excluded.postal_code, public.customers.postal_code),
    street = coalesce(excluded.street, public.customers.street),
    address_number = coalesce(excluded.address_number, public.customers.address_number),
    address_complement = coalesce(excluded.address_complement, public.customers.address_complement),
    neighborhood = coalesce(excluded.neighborhood, public.customers.neighborhood),
    city = coalesce(excluded.city, public.customers.city),
    state = coalesce(excluded.state, public.customers.state);

  return new;
end;
$$;
