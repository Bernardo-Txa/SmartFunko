delete from public.rare_collectibles rare
where not exists (
  select 1
  from public.product_variants variant
  cross join lateral unnest(coalesce(variant.special_tags, '{}')) as tag(value)
  where variant.id = rare.variant_id
    and lower(btrim(tag.value)) = 'acervo raro'
);
