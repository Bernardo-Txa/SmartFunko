insert into auth.users (
  id,
  instance_id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  raw_app_meta_data,
  raw_user_meta_data
)
values
  (
    '10000000-0000-4000-8000-000000000001',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'owner@smartfunko.local',
    crypt('SmartFunko@123', gen_salt('bf')),
    now(),
    now(),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"name":"Owner SmartFunko"}'::jsonb
  ),
  (
    '10000000-0000-4000-8000-000000000011',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'ana.cliente@smartfunko.local',
    crypt('SmartFunko@123', gen_salt('bf')),
    now(),
    now(),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"name":"Ana Cliente","phone":"+5511999990001"}'::jsonb
  ),
  (
    '10000000-0000-4000-8000-000000000012',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'bruno.cliente@smartfunko.local',
    crypt('SmartFunko@123', gen_salt('bf')),
    now(),
    now(),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"name":"Bruno Cliente","phone":"+5511999990002"}'::jsonb
  ),
  (
    '10000000-0000-4000-8000-000000000013',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'carla.cliente@smartfunko.local',
    crypt('SmartFunko@123', gen_salt('bf')),
    now(),
    now(),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"name":"Carla Cliente","phone":"+5511999990003"}'::jsonb
  )
on conflict (id) do update
set
  email = excluded.email,
  encrypted_password = excluded.encrypted_password,
  raw_app_meta_data = excluded.raw_app_meta_data,
  raw_user_meta_data = excluded.raw_user_meta_data,
  updated_at = now();

insert into public.profiles (auth_user_id, name, email, role)
values
  ('10000000-0000-4000-8000-000000000001', 'Owner SmartFunko', 'owner@smartfunko.local', 'owner'),
  ('10000000-0000-4000-8000-000000000011', 'Ana Cliente', 'ana.cliente@smartfunko.local', 'customer'),
  ('10000000-0000-4000-8000-000000000012', 'Bruno Cliente', 'bruno.cliente@smartfunko.local', 'customer'),
  ('10000000-0000-4000-8000-000000000013', 'Carla Cliente', 'carla.cliente@smartfunko.local', 'customer')
on conflict (auth_user_id) do update
set
  name = excluded.name,
  email = excluded.email,
  role = excluded.role,
  updated_at = now();

with profile_rows as (
  select id, email, name
  from public.profiles
  where auth_user_id in (
    '10000000-0000-4000-8000-000000000011',
    '10000000-0000-4000-8000-000000000012',
    '10000000-0000-4000-8000-000000000013'
  )
)
insert into public.customers (profile_id, name, email, phone, instagram, status, notes)
select
  profile_rows.id,
  profile_rows.name,
  profile_rows.email,
  case profile_rows.email
    when 'ana.cliente@smartfunko.local' then '+5511999990001'
    when 'bruno.cliente@smartfunko.local' then '+5511999990002'
    else '+5511999990003'
  end,
  case profile_rows.email
    when 'ana.cliente@smartfunko.local' then '@anafunkos'
    when 'bruno.cliente@smartfunko.local' then '@brunocoleciona'
    else '@carlapop'
  end,
  case profile_rows.email
    when 'bruno.cliente@smartfunko.local' then 'vip'::public.customer_status
    else 'active'::public.customer_status
  end,
  'Cliente seed para validacao do MVP operacional.'
from profile_rows
on conflict (profile_id) do update
set
  name = excluded.name,
  email = excluded.email,
  phone = excluded.phone,
  instagram = excluded.instagram,
  status = excluded.status,
  notes = excluded.notes,
  updated_at = now();

insert into public.franchises (name, slug, status)
values
  ('Disney', 'disney', 'active'),
  ('Marvel', 'marvel', 'active'),
  ('One Piece', 'one-piece', 'active'),
  ('Naruto', 'naruto', 'active'),
  ('Star Wars', 'star-wars', 'active'),
  ('Rocks', 'rocks', 'active')
on conflict (slug) do update
set
  name = excluded.name,
  status = excluded.status,
  updated_at = now();

with franchise_rows as (
  select id, slug from public.franchises
)
insert into public.products (
  name,
  slug,
  franchise_id,
  funko_number,
  description,
  main_image_url,
  category_name,
  subcategory_name,
  external_catalog_code,
  status,
  seo_title,
  seo_description
)
values
  (
    'Disney Dumbo Dreamland Dumbo 1195 Exclusivo',
    'disney-dumbo-dreamland-dumbo-1195-exclusivo',
    (select id from franchise_rows where slug = 'disney'),
    '1195',
    'Produto exclusivo com atendimento e confirmacao pelo WhatsApp.',
    'https://cdn.awsli.com.br/800x800/84/84034/produto/161912510/funko-pop--disney-classics-dumbo-1195-exclusivo-a-1--800-5ixl3unfcx.jpg',
    'Disney',
    'Dumbo',
    'BH7199B47',
    'active',
    'Disney Dumbo Dreamland Dumbo 1195 Exclusivo',
    'Funko Pop Disney Dumbo exclusivo na SmartFunko.'
  ),
  (
    'Funko Pop! Rocks The Cure Robert Smith 306 Exclusivo',
    'funko-pop-rocks-the-cure-robert-smith-306-exclusivo',
    (select id from franchise_rows where slug = 'rocks'),
    '306',
    'Item especial para colecionadores de musica.',
    'https://cdn.awsli.com.br/800x800/84/84034/produto/190386537/funk-pop--rocks-the-cure-robert-smith-306-exclusivo-c-800-i3rntug3aw.jpg',
    'Música',
    'The Cure',
    'RS306EXC',
    'active',
    'Robert Smith 306 Exclusivo',
    'Funko Pop Rocks The Cure Robert Smith exclusivo.'
  ),
  (
    'Funko Pop! Marvel Venomized Kingpin 883 Exclusivo',
    'funko-pop-marvel-venomized-kingpin-883-exclusivo',
    (select id from franchise_rows where slug = 'marvel'),
    '883',
    'Linha Marvel Venom com acabamento exclusivo.',
    'https://cdn.awsli.com.br/800x800/84/84034/produto/120273053/funko-pop-marvel-venom-venomized-kingpin-883-exclusivo-bfg-swpy4z6l2i.png',
    'Heróis/Vilões',
    'Marvel',
    'MV883VEN',
    'active',
    'Venomized Kingpin 883 Exclusivo',
    'Funko Pop Marvel Venomized Kingpin na SmartFunko.'
  ),
  (
    'Funko Pop! One Piece Luffy Gear Five',
    'funko-pop-one-piece-luffy-gear-five',
    (select id from franchise_rows where slug = 'one-piece'),
    '1607',
    'Figura colecionavel com caixa original. Unidade pronta para reserva pelo atendimento.',
    'https://cdn.awsli.com.br/800x800/84/84034/produto/372621331/gyro-attack-gitd-x-zad8se6y0g.png',
    'Animes',
    'One Piece',
    'SF-OP-0001',
    'active',
    'Funko Pop! One Piece Luffy Gear Five',
    'Funko Pop One Piece Luffy Gear Five na SmartFunko.'
  ),
  (
    'Funko Pop! Naruto Kakashi Lightning Blade',
    'funko-pop-naruto-kakashi-lightning-blade',
    (select id from franchise_rows where slug = 'naruto'),
    '994',
    'Kakashi em pose de batalha, sob encomenda nacional.',
    'https://cdn.awsli.com.br/800x800/84/84034/produto/175030702/bnhh-awnqltlr6t.png',
    'Animes',
    'Naruto',
    'NR994KAK',
    'active',
    'Kakashi Lightning Blade',
    'Funko Pop Naruto Kakashi na SmartFunko.'
  ),
  (
    'Funko Pop! Star Wars Luke Skywalker 453 Exclusivo',
    'funko-pop-star-wars-luke-skywalker-453-exclusivo',
    (select id from franchise_rows where slug = 'star-wars'),
    '453',
    'Luke Skywalker exclusivo para vitrine especial.',
    'https://cdn.awsli.com.br/800x800/84/84034/produto/160855620/funko-pop-television-star-wars-luke-skywalker-453-exclusivo-a-800-6lwopdzgqz.jpg',
    'Filmes e Séries',
    'Star Wars',
    'SW453LUK',
    'active',
    'Luke Skywalker 453 Exclusivo',
    'Funko Pop Star Wars Luke Skywalker exclusivo.'
  ),
  (
    'Funko Pop! Marvel Spider-Man Symbiote',
    'funko-pop-marvel-spider-man-symbiote',
    (select id from franchise_rows where slug = 'marvel'),
    '1430',
    'Item sob consulta com fornecedor nacional.',
    'https://cdn.awsli.com.br/800x800/84/84034/produto/287580539/green-go-b-1--800-ww6169d5ma.jpg',
    'Heróis/Vilões',
    'Spider-Man',
    'SF-MV-0007',
    'active',
    'Funko Pop! Marvel Spider-Man Symbiote',
    'Funko Pop Marvel Spider-Man Symbiote na SmartFunko.'
  ),
  (
    'Funko Pop! Marvel X-Men Mojo 1308 Exclusivo',
    'funko-pop-marvel-x-men-mojo-1308-exclusivo',
    (select id from franchise_rows where slug = 'marvel'),
    '1308',
    'Especial Marvel X-Men com etiqueta de exclusivo.',
    'https://cdn.awsli.com.br/800x800/84/84034/produto/261857312/image-1--800asdfas-bacf5qagk9.jpg',
    'Heróis/Vilões',
    'X-Men',
    'WK4429O71',
    'active',
    'Marvel X-Men Mojo 1308 Exclusivo',
    'Funko Pop Marvel X-Men Mojo exclusivo.'
  ),
  (
    'Funko Pop! Marvel X-Men Roberto 1309 Exclusivo',
    'funko-pop-marvel-x-men-roberto-1309-exclusivo',
    (select id from franchise_rows where slug = 'marvel'),
    '1309',
    'Especial X-Men com disponibilidade sob encomenda.',
    'https://cdn.awsli.com.br/800x800/84/84034/produto/261860148/funko-pop--x-men-roberto-1305-exclusivo-c-1--800-cw46heff34.jpg',
    'Heróis/Vilões',
    'X-Men',
    'HR4910K31',
    'active',
    'Marvel X-Men Roberto 1309 Exclusivo',
    'Funko Pop Marvel X-Men Roberto exclusivo.'
  ),
  (
    'Case Protetor Caixa de Acrilico Expositor',
    'case-protetor-caixa-de-acrilico-expositor',
    null,
    '000',
    'Protetor de acrilico para caixa Funko Pop.',
    'https://cdn.awsli.com.br/800x800/84/84034/produto/187588782/67d0c32162.jpg',
    'Acessórios',
    'Protetores de Caixas',
    'FQ5481K29',
    'active',
    'Case Protetor Caixa de Acrilico',
    'Protetor de caixa para Funko Pop.'
  )
on conflict (slug) do update
set
  name = excluded.name,
  franchise_id = excluded.franchise_id,
  funko_number = excluded.funko_number,
  description = excluded.description,
  main_image_url = excluded.main_image_url,
  category_name = excluded.category_name,
  subcategory_name = excluded.subcategory_name,
  external_catalog_code = excluded.external_catalog_code,
  status = excluded.status,
  seo_title = excluded.seo_title,
  seo_description = excluded.seo_description,
  updated_at = now();

with image_rows(slug, image_url, sort_order) as (
  values
    ('funko-pop-one-piece-luffy-gear-five', 'https://cdn.awsli.com.br/800x800/84/84034/produto/372621331/gyro-attack-gitd-x-zad8se6y0g.png', 0),
    ('funko-pop-one-piece-luffy-gear-five', 'https://cdn.awsli.com.br/800x800/84/84034/produto/222652487/funko-pop--raide-iziupzwkxy.jpg', 1),
    ('funko-pop-marvel-x-men-mojo-1308-exclusivo', 'https://cdn.awsli.com.br/800x800/84/84034/produto/261857312/image-1--800asdfas-bacf5qagk9.jpg', 0),
    ('funko-pop-marvel-x-men-mojo-1308-exclusivo', 'https://cdn.awsli.com.br/800x800/84/84034/produto/261863427/sauron-c-1--800-zq1fb2b1za.jpg', 1),
    ('case-protetor-caixa-de-acrilico-expositor', 'https://cdn.awsli.com.br/800x800/84/84034/produto/187588782/67d0c32162.jpg', 0),
    ('case-protetor-caixa-de-acrilico-expositor', 'https://cdn.awsli.com.br/800x800/84/84034/produto/180927727/188426ce29.jpg', 1)
)
insert into public.product_images (product_id, image_url, sort_order)
select products.id, image_rows.image_url, image_rows.sort_order
from image_rows
join public.products on products.slug = image_rows.slug
where not exists (
  select 1
  from public.product_images
  where product_images.product_id = products.id
    and product_images.image_url = image_rows.image_url
);

with product_rows as (
  select id, slug from public.products
)
insert into public.product_variants (
  product_id,
  sku,
  condition,
  type,
  source,
  sale_price,
  market_price,
  estimated_cost,
  special_label,
  special_tags,
  status
)
values
  ((select id from product_rows where slug = 'disney-dumbo-dreamland-dumbo-1195-exclusivo'), 'BH7199B47', 'new', 'exclusive', 'national', 159.90, 199.90, 92.00, 'Exclusivo', array['Disney', 'Especial'], 'order_only'),
  ((select id from product_rows where slug = 'funko-pop-rocks-the-cure-robert-smith-306-exclusivo'), 'RS306EXC', 'new', 'exclusive', 'international', 264.90, 319.90, 150.00, 'Exclusivo', array['Rocks', 'Limitado'], 'order_only'),
  ((select id from product_rows where slug = 'funko-pop-marvel-venomized-kingpin-883-exclusivo'), 'MV883VEN', 'new', 'glow', 'national', 229.90, 279.90, 130.00, 'Glow', array['Marvel', 'Glow'], 'order_only'),
  ((select id from product_rows where slug = 'funko-pop-one-piece-luffy-gear-five'), 'SF-OP-0001', 'new', 'exclusive', 'own_stock', 219.90, 249.90, 140.00, 'Exclusivo', array['Pronta-entrega'], 'available'),
  ((select id from product_rows where slug = 'funko-pop-naruto-kakashi-lightning-blade'), 'NR994KAK', 'new', 'common', 'national', 189.90, 229.90, 112.00, null, '{}', 'order_only'),
  ((select id from product_rows where slug = 'funko-pop-star-wars-luke-skywalker-453-exclusivo'), 'SW453LUK', 'new', 'exclusive', 'international', 249.90, 299.90, 145.00, 'Exclusivo', array['Star Wars'], 'preorder'),
  ((select id from product_rows where slug = 'funko-pop-marvel-spider-man-symbiote'), 'SF-MV-0007', 'new', 'glow', 'national', 189.90, 229.90, 120.00, 'Glow', array['Marvel'], 'order_only'),
  ((select id from product_rows where slug = 'funko-pop-marvel-x-men-mojo-1308-exclusivo'), 'WK4429O71', 'new', 'exclusive', 'national', 309.90, 359.90, 190.00, 'Exclusivo', array['X-Men', 'Special'], 'order_only'),
  ((select id from product_rows where slug = 'funko-pop-marvel-x-men-roberto-1309-exclusivo'), 'HR4910K31', 'new', 'exclusive', 'national', 309.90, 359.90, 190.00, 'Exclusivo', array['X-Men', 'Special'], 'order_only'),
  ((select id from product_rows where slug = 'case-protetor-caixa-de-acrilico-expositor'), 'FQ5481K29', 'new', 'common', 'own_stock', 29.90, 39.90, 12.00, null, '{}', 'available')
on conflict (sku) do update
set
  condition = excluded.condition,
  type = excluded.type,
  source = excluded.source,
  sale_price = excluded.sale_price,
  market_price = excluded.market_price,
  estimated_cost = excluded.estimated_cost,
  special_label = excluded.special_label,
  special_tags = excluded.special_tags,
  status = excluded.status,
  updated_at = now();

with variant_rows as (
  select id, sku, estimated_cost
  from public.product_variants
  where sku in ('SF-OP-0001', 'FQ5481K29', 'BH7199B47', 'NR994KAK', 'SF-MV-0007')
)
insert into public.inventory_items (product_variant_id, sku, status, location, purchase_cost, landed_cost, notes)
select
  variant_rows.id,
  'INV-' || variant_rows.sku,
  'available',
  'Seed-A1',
  variant_rows.estimated_cost,
  variant_rows.estimated_cost,
  'Item seed para validacao operacional.'
from variant_rows
on conflict (sku) do update
set
  product_variant_id = excluded.product_variant_id,
  status = excluded.status,
  location = excluded.location,
  purchase_cost = excluded.purchase_cost,
  landed_cost = excluded.landed_cost,
  notes = excluded.notes,
  updated_at = now();

with seed_context as (
  select
    customers.id as customer_id,
    owner_profiles.id as owner_profile_id,
    product_variants.id as variant_id,
    product_variants.sale_price
  from public.customers
  join public.profiles customer_profiles
    on customer_profiles.id = customers.profile_id
   and customer_profiles.email = 'ana.cliente@smartfunko.local'
  cross join public.profiles owner_profiles
  join public.product_variants
    on product_variants.sku = 'SF-OP-0001'
  where owner_profiles.email = 'owner@smartfunko.local'
)
insert into public.orders (
  order_number,
  customer_id,
  channel,
  status,
  subtotal,
  discount,
  shipping_amount,
  total,
  public_token,
  notes,
  internal_notes,
  created_by
)
select
  'SF-SEED-0001',
  seed_context.customer_id,
  'whatsapp',
  'paid',
  seed_context.sale_price,
  0,
  0,
  seed_context.sale_price,
  'seed-public-token-0001',
  'Pedido seed com link publico para validacao.',
  'Pedido criado pela seed operacional.',
  seed_context.owner_profile_id
from seed_context
on conflict (order_number) do update
set
  customer_id = excluded.customer_id,
  status = excluded.status,
  subtotal = excluded.subtotal,
  total = excluded.total,
  public_token = excluded.public_token,
  notes = excluded.notes,
  internal_notes = excluded.internal_notes,
  created_by = excluded.created_by,
  updated_at = now();

with seed_context as (
  select
    orders.id as order_id,
    product_variants.id as variant_id,
    product_variants.sale_price
  from public.orders
  join public.product_variants on product_variants.sku = 'SF-OP-0001'
  where orders.order_number = 'SF-SEED-0001'
)
insert into public.order_items (
  order_id,
  product_variant_id,
  quantity,
  unit_price,
  total_price,
  source,
  status
)
select
  seed_context.order_id,
  seed_context.variant_id,
  1,
  seed_context.sale_price,
  seed_context.sale_price,
  'stock',
  'paid'
from seed_context
where not exists (
  select 1
  from public.order_items
  where order_items.order_id = seed_context.order_id
    and order_items.product_variant_id = seed_context.variant_id
);

with seed_context as (
  select
    orders.id as order_id,
    orders.customer_id,
    orders.total,
    owner_profiles.id as owner_profile_id
  from public.orders
  cross join public.profiles owner_profiles
  where orders.order_number = 'SF-SEED-0001'
    and owner_profiles.email = 'owner@smartfunko.local'
)
insert into public.payments (
  order_id,
  customer_id,
  method,
  amount,
  fee_amount,
  net_amount,
  status,
  paid_at,
  created_by
)
select
  seed_context.order_id,
  seed_context.customer_id,
  'pix',
  seed_context.total,
  0,
  seed_context.total,
  'paid',
  now(),
  seed_context.owner_profile_id
from seed_context
where not exists (
  select 1
  from public.payments
  where payments.order_id = seed_context.order_id
    and payments.method = 'pix'
    and payments.status = 'paid'
);

with seed_context as (
  select
    orders.id as order_id,
    payments.id as payment_id,
    payments.net_amount,
    payments.created_by
  from public.orders
  join public.payments on payments.order_id = orders.id
  where orders.order_number = 'SF-SEED-0001'
    and payments.method = 'pix'
    and payments.status = 'paid'
  order by payments.created_at
  limit 1
)
insert into public.cash_entries (
  type,
  category,
  order_id,
  payment_id,
  amount,
  description,
  occurred_at,
  created_by
)
select
  'income',
  'sale',
  seed_context.order_id,
  seed_context.payment_id,
  seed_context.net_amount,
  'Recebimento Pix pedido seed SF-SEED-0001',
  now(),
  seed_context.created_by
from seed_context
where not exists (
  select 1
  from public.cash_entries
  where cash_entries.order_id = seed_context.order_id
    and cash_entries.payment_id = seed_context.payment_id
);
