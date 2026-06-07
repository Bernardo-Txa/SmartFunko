create table if not exists public.inventory_movements (
  id uuid primary key default gen_random_uuid(),

  inventory_item_id uuid not null references public.inventory_items(id) on delete cascade,
  product_variant_id uuid references public.product_variants(id) on delete set null,

  order_id uuid references public.orders(id) on delete set null,
  order_item_id uuid references public.order_items(id) on delete set null,

  type text not null check (
    type in (
      'created',
      'status_change',
      'reserved',
      'released',
      'sold',
      'cancelled',
      'received',
      'damaged',
      'unavailable',
      'manual_adjustment',
      'cost_adjustment',
      'location_change'
    )
  ),

  previous_status text,
  new_status text,

  previous_location text,
  new_location text,

  previous_purchase_cost numeric,
  new_purchase_cost numeric,

  previous_landed_cost numeric,
  new_landed_cost numeric,

  notes text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists inventory_movements_inventory_item_id_idx
on public.inventory_movements(inventory_item_id);

create index if not exists inventory_movements_product_variant_id_idx
on public.inventory_movements(product_variant_id);

create index if not exists inventory_movements_order_id_idx
on public.inventory_movements(order_id);

create index if not exists inventory_movements_created_at_idx
on public.inventory_movements(created_at desc);

alter table public.inventory_movements enable row level security;

drop policy if exists "owner_all_inventory_movements" on public.inventory_movements;

create policy "owner_all_inventory_movements"
on public.inventory_movements
for all
using (public.is_owner())
with check (public.is_owner());
