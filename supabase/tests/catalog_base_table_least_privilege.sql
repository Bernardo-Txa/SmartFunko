\set ON_ERROR_STOP on

create or replace function pg_temp.assert_true(condition boolean, message text)
returns void language plpgsql as $$
begin
  if condition is not true then
    raise exception 'assertion_failed: %', message;
  end if;
end;
$$;

select pg_temp.assert_true(
  not has_table_privilege('anon', 'public.product_variants', 'SELECT'),
  'anon must not retain table-wide SELECT on product_variants'
);
select pg_temp.assert_true(
  not has_table_privilege('authenticated', 'public.product_variants', 'SELECT'),
  'authenticated must not retain table-wide SELECT on product_variants'
);
select pg_temp.assert_true(
  not has_column_privilege('anon', 'public.product_variants', 'estimated_cost', 'SELECT'),
  'anon must not read estimated_cost'
);
select pg_temp.assert_true(
  not has_column_privilege('authenticated', 'public.product_variants', 'estimated_cost', 'SELECT'),
  'authenticated must not read estimated_cost'
);

select pg_temp.assert_true(
  not has_column_privilege('anon', 'public.products', 'seo_title', 'SELECT')
  and not has_column_privilege('anon', 'public.products', 'seo_description', 'SELECT')
  and not has_column_privilege('anon', 'public.products', 'updated_at', 'SELECT')
  and not has_column_privilege('anon', 'public.product_variants', 'updated_at', 'SELECT')
  and not has_column_privilege('anon', 'public.product_images', 'created_at', 'SELECT')
  and not has_column_privilege('anon', 'public.franchises', 'created_at', 'SELECT')
  and not has_column_privilege('anon', 'public.franchises', 'updated_at', 'SELECT')
  and not has_column_privilege('anon', 'public.suppliers', 'created_at', 'SELECT')
  and not has_column_privilege('anon', 'public.suppliers', 'updated_at', 'SELECT'),
  'anon must not read internal catalog columns'
);

select pg_temp.assert_true(
  not has_any_column_privilege('anon', 'public.rare_collectibles', 'SELECT')
  and not has_any_column_privilege('authenticated', 'public.rare_collectibles', 'SELECT'),
  'Acervo Raro base metadata must not be directly readable'
);

select pg_temp.assert_true(
  not has_table_privilege('anon', 'public.products', 'INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER')
  and not has_table_privilege('authenticated', 'public.products', 'INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER')
  and not has_table_privilege('anon', 'public.product_variants', 'INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER')
  and not has_table_privilege('authenticated', 'public.product_variants', 'INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER'),
  'client roles must not retain direct catalog DML or DDL-like privileges'
);

select pg_temp.assert_true(
  has_table_privilege('service_role', 'public.products', 'SELECT,INSERT,UPDATE,DELETE')
  and has_table_privilege('service_role', 'public.product_variants', 'SELECT,INSERT,UPDATE,DELETE')
  and has_table_privilege('service_role', 'public.product_images', 'SELECT,INSERT,UPDATE,DELETE')
  and has_table_privilege('service_role', 'public.franchises', 'SELECT,INSERT,UPDATE,DELETE')
  and has_table_privilege('service_role', 'public.suppliers', 'SELECT,INSERT,UPDATE,DELETE')
  and has_table_privilege('service_role', 'public.rare_collectibles', 'SELECT,INSERT,UPDATE,DELETE'),
  'service_role catalog operations must remain available'
);

select pg_temp.assert_true(
  (select option_value::boolean from pg_options_to_table(
    (select reloptions from pg_class where oid='public.catalog_product_cards'::regclass)
  ) where option_name='security_invoker')
  and (select option_value::boolean from pg_options_to_table(
    (select reloptions from pg_class where oid='public.catalog_category_options'::regclass)
  ) where option_name='security_invoker'),
  'catalog views must remain SECURITY INVOKER'
);

begin read only;
set local role anon;
select pg_temp.assert_true(
  exists(select 1 from public.catalog_product_cards),
  'anon catalog cards must remain non-empty'
);
select pg_temp.assert_true(
  exists(select 1 from public.catalog_category_options),
  'anon category options must remain non-empty'
);
select pg_temp.assert_true(
  exists(select 1 from public.products where slug is not null),
  'anon product detail base query must remain readable'
);
select pg_temp.assert_true(
  exists(select 1 from public.suppliers where status='active'),
  'anon supplier pages must remain readable'
);
rollback;

begin read only;
set local role authenticated;
select pg_temp.assert_true(
  exists(select 1 from public.catalog_product_cards)
  and exists(select 1 from public.catalog_category_options),
  'authenticated catalog views must remain readable'
);
rollback;

select pg_temp.assert_true(
  not exists (
    select 1
    from public.catalog_product_cards cards
    join public.rare_collectibles rare on rare.product_id=cards.id
  ),
  'Acervo Raro products must remain excluded from normal catalog cards'
);

do $$
begin
  perform set_config('role', 'anon', true);

  begin
    execute 'select estimated_cost from public.product_variants limit 1';
    raise exception 'assertion_failed: anon read estimated_cost';
  exception when insufficient_privilege then null;
  end;

  begin
    execute 'insert into public.products (name, slug, status) values (''BLOCKED'', ''blocked'', ''active'')';
    raise exception 'assertion_failed: anon inserted a product';
  exception when insufficient_privilege then null;
  end;

  begin
    execute 'update public.products set name=name where false';
    raise exception 'assertion_failed: anon updated products';
  exception when insufficient_privilege then null;
  end;

  begin
    execute 'delete from public.products where false';
    raise exception 'assertion_failed: anon deleted products';
  exception when insufficient_privilege then null;
  end;

  begin
    execute 'truncate public.products';
    raise exception 'assertion_failed: anon truncated products';
  exception when insufficient_privilege then null;
  end;

  perform set_config('role', 'postgres', true);
end;
$$;
