insert into public.franchises (name, slug, status)
values
  ('One Piece', 'one-piece', 'active'),
  ('Marvel', 'marvel', 'active'),
  ('Disney', 'disney', 'active'),
  ('Naruto', 'naruto', 'active')
on conflict (slug) do nothing;

with franchise_rows as (
  select id, slug from public.franchises
)
insert into public.products (
  name,
  slug,
  franchise_id,
  funko_number,
  description,
  status,
  seo_title,
  seo_description
)
values
  (
    'Funko Pop! One Piece Luffy Gear Five',
    'funko-pop-one-piece-luffy-gear-five',
    (select id from franchise_rows where slug = 'one-piece'),
    '1607',
    'Figura colecionavel com caixa original. Unidade pronta para reserva pelo atendimento.',
    'active',
    'Funko Pop! One Piece Luffy Gear Five',
    'Funko Pop One Piece Luffy Gear Five na Smart Funkos.'
  ),
  (
    'Funko Pop! Marvel Spider-Man Symbiote',
    'funko-pop-marvel-spider-man-symbiote',
    (select id from franchise_rows where slug = 'marvel'),
    '1430',
    'Item sob consulta com fornecedor nacional.',
    'active',
    'Funko Pop! Marvel Spider-Man Symbiote',
    'Funko Pop Marvel Spider-Man Symbiote na Smart Funkos.'
  )
on conflict (slug) do nothing;

insert into public.product_variants (
  product_id,
  sku,
  condition,
  type,
  source,
  sale_price,
  market_price,
  estimated_cost,
  status
)
select
  products.id,
  'SF-OP-0001',
  'new',
  'exclusive',
  'own_stock',
  219.90,
  249.90,
  140.00,
  'available'
from public.products
where products.slug = 'funko-pop-one-piece-luffy-gear-five'
on conflict (sku) do nothing;

insert into public.product_variants (
  product_id,
  sku,
  condition,
  type,
  source,
  sale_price,
  estimated_cost,
  status
)
select
  products.id,
  'SF-MV-0007',
  'new',
  'glow',
  'national',
  189.90,
  120.00,
  'order_only'
from public.products
where products.slug = 'funko-pop-marvel-spider-man-symbiote'
on conflict (sku) do nothing;
