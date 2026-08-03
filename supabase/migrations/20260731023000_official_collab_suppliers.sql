insert into public.suppliers (
  name,
  slug,
  description,
  logo_url,
  banner_url,
  accent_color,
  website_url,
  sort_order,
  status
)
values
  (
    'Piticas',
    'piticas',
    'Colecao oficial Piticas dentro da Smart Funkos.',
    '/brand/piticas.webp',
    null,
    '#fb923c',
    null,
    10,
    'active'
  ),
  (
    'NBA Brasil',
    'nba-brasil',
    'Colecao oficial NBA Brasil com produtos de basquete, times e cultura esportiva.',
    '/brand/nba-brasil.png',
    null,
    '#60a5fa',
    null,
    20,
    'active'
  ),
  (
    'Copag',
    'copag',
    'Colecao oficial Copag com jogos, cartas e itens colecionaveis.',
    '/brand/copag.png',
    null,
    '#f87171',
    null,
    30,
    'active'
  ),
  (
    'Panini',
    'panini',
    'Colecao oficial Panini com albuns, HQs, cards, mangas e itens editoriais.',
    '/brand/panini.png',
    null,
    '#facc15',
    null,
    40,
    'active'
  )
on conflict (slug) do update
set
  accent_color = excluded.accent_color,
  banner_url = coalesce(public.suppliers.banner_url, excluded.banner_url),
  description = coalesce(public.suppliers.description, excluded.description),
  logo_url = coalesce(public.suppliers.logo_url, excluded.logo_url),
  name = excluded.name,
  sort_order = excluded.sort_order,
  status = excluded.status,
  website_url = coalesce(public.suppliers.website_url, excluded.website_url);
