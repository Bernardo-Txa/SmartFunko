alter table public.purchase_batches
  add column if not exists code text,
  add column if not exists description text,
  add column if not exists supplier_id uuid references public.suppliers(id) on delete set null,
  add column if not exists estimated_purchase_cost numeric not null default 0,
  add column if not exists estimated_shipping_cost numeric not null default 0,
  add column if not exists estimated_taxes_cost numeric not null default 0,
  add column if not exists actual_purchase_cost numeric,
  add column if not exists actual_shipping_cost numeric,
  add column if not exists actual_taxes_cost numeric,
  add column if not exists actual_total_cost numeric,
  add column if not exists opened_at timestamptz,
  add column if not exists closed_at timestamptz,
  add column if not exists purchased_at timestamptz,
  add column if not exists shipped_at timestamptz,
  add column if not exists received_at timestamptz,
  add column if not exists cancelled_at timestamptz,
  add column if not exists created_by uuid references public.profiles(id) on delete set null,
  add column if not exists updated_by uuid references public.profiles(id) on delete set null;

update public.purchase_batches
set
  code = coalesce(code, 'LOT-' || upper(substr(replace(id::text, '-', ''), 1, 8))),
  actual_total_cost = coalesce(actual_total_cost, nullif(final_total_cost, 0))
where code is null
   or (actual_total_cost is null and final_total_cost is not null);

alter table public.purchase_batches
  alter column code set not null,
  alter column type set default 'national',
  alter column status set default 'draft';

update public.purchase_batches
set status = case status
  when 'ordered' then 'purchased'
  when 'completed' then 'received'
  else status
end
where status in ('ordered', 'completed');

do $$
declare
  constraint_name text;
begin
  for constraint_name in
    select con.conname
    from pg_constraint con
    where con.conrelid = 'public.purchase_batches'::regclass
      and con.contype = 'c'
      and (
        pg_get_constraintdef(con.oid) ilike '%type%'
        or pg_get_constraintdef(con.oid) ilike '%status%'
      )
  loop
    execute format('alter table public.purchase_batches drop constraint %I', constraint_name);
  end loop;
end $$;

alter table public.purchase_batches
  add constraint purchase_batches_type_check
  check (type in ('national', 'international', 'collab', 'other')),
  add constraint purchase_batches_status_check
  check (status in ('draft', 'open', 'closed', 'purchased', 'in_transit', 'received', 'cancelled'));

create unique index if not exists purchase_batches_code_key
on public.purchase_batches(code);

alter table public.purchase_batch_items
  add column if not exists order_id uuid references public.orders(id) on delete set null,
  add column if not exists product_id uuid references public.products(id) on delete set null,
  add column if not exists customer_id uuid references public.customers(id) on delete set null,
  add column if not exists estimated_unit_cost numeric,
  add column if not exists actual_unit_cost numeric,
  add column if not exists estimated_total_cost numeric,
  add column if not exists actual_total_cost numeric,
  add column if not exists expected_arrival_date date,
  add column if not exists received_at timestamptz,
  add column if not exists notes text;

alter table public.purchase_batch_items
  alter column product_variant_id drop not null;

update public.purchase_batch_items batch_item
set
  status = case batch_item.status
    when 'pending' then 'planned'
    when 'ordered' then 'purchased'
    when 'shipped' then 'in_transit'
    else batch_item.status
  end,
  estimated_unit_cost = coalesce(batch_item.estimated_unit_cost, batch_item.supplier_cost),
  actual_unit_cost = coalesce(batch_item.actual_unit_cost, batch_item.final_landed_cost),
  estimated_total_cost = coalesce(
    batch_item.estimated_total_cost,
    (coalesce(batch_item.supplier_cost, 0) + coalesce(batch_item.shipping_cost_share, 0) + coalesce(batch_item.tax_cost_share, 0)) * batch_item.quantity
  ),
  actual_total_cost = coalesce(batch_item.actual_total_cost, batch_item.final_landed_cost * batch_item.quantity),
  order_id = coalesce(batch_item.order_id, order_items.order_id),
  customer_id = coalesce(batch_item.customer_id, orders.customer_id),
  product_id = coalesce(batch_item.product_id, product_variants.product_id)
from public.order_items
left join public.orders
  on orders.id = order_items.order_id
left join public.product_variants
  on product_variants.id = order_items.product_variant_id
where batch_item.order_item_id = order_items.id;

update public.purchase_batch_items batch_item
set product_id = coalesce(batch_item.product_id, product_variants.product_id)
from public.product_variants
where batch_item.product_variant_id = product_variants.id
  and batch_item.product_id is null;

do $$
declare
  constraint_name text;
begin
  for constraint_name in
    select con.conname
    from pg_constraint con
    where con.conrelid = 'public.purchase_batch_items'::regclass
      and con.contype = 'c'
      and pg_get_constraintdef(con.oid) ilike '%status%'
  loop
    execute format('alter table public.purchase_batch_items drop constraint %I', constraint_name);
  end loop;
end $$;

alter table public.purchase_batch_items
  alter column status set default 'planned',
  add constraint purchase_batch_items_status_check
  check (status in ('planned', 'approved', 'purchased', 'in_transit', 'received', 'cancelled'));

create index if not exists purchase_batches_type_idx
on public.purchase_batches(type);

create index if not exists purchase_batches_supplier_id_idx
on public.purchase_batches(supplier_id);

create index if not exists purchase_batch_items_status_idx
on public.purchase_batch_items(status);

create index if not exists purchase_batch_items_order_id_idx
on public.purchase_batch_items(order_id);

create index if not exists purchase_batch_items_customer_id_idx
on public.purchase_batch_items(customer_id);

create unique index if not exists purchase_batch_items_batch_order_item_key
on public.purchase_batch_items(purchase_batch_id, order_item_id)
where order_item_id is not null;

alter table public.purchase_batches enable row level security;
alter table public.purchase_batch_items enable row level security;

drop policy if exists "admin_all_purchase_batches" on public.purchase_batches;
drop policy if exists "owner_all_purchase_batches" on public.purchase_batches;
create policy "owner_all_purchase_batches"
on public.purchase_batches for all
using (public.is_owner())
with check (public.is_owner());

drop policy if exists "admin_all_purchase_batch_items" on public.purchase_batch_items;
drop policy if exists "owner_all_purchase_batch_items" on public.purchase_batch_items;
create policy "owner_all_purchase_batch_items"
on public.purchase_batch_items for all
using (public.is_owner())
with check (public.is_owner());

grant all on public.purchase_batches to authenticated;
grant all on public.purchase_batch_items to authenticated;
