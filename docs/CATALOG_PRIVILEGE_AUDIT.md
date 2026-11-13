# Auditoria de privilégios do catálogo

Data: 2026-11-13
Branch: `mobile-release-2026-12-15`
Escopo: preparação local; nenhuma correção aplicada em produção.

## Consumidores e identidade de banco

- O catálogo público Next.js usa a chave pública exclusivamente em
  `web/src/lib/catalog.ts`.
- Listagem, home, filtros, franquias e categorias usam
  `catalog_product_cards`.
- Detalhe usa `products` com relações `franchises`, `suppliers`,
  `product_images` e `product_variants`.
- Páginas públicas de fornecedores leem `suppliers` diretamente.
- Painel administrativo e APIs de produto, fornecedor e Acervo Raro usam
  `createSupabaseAdminClient()`, portanto executam como `service_role`.
- Pedidos, checkout, cupons, estoque e relatórios também acessam produtos e
  variantes pelo backend `service_role`.
- Não foi encontrado consumidor Next.js que necessite DML direto como `anon`
  ou `authenticated` nas tabelas-base do catálogo.

## Matriz de acesso

| Objeto | Consumidores | Acesso público necessário | Campos públicos | Campos internos | Estado anterior |
| --- | --- | --- | --- | --- | --- |
| `products` | detalhe, views, filtros; admin/backend | SELECT por coluna | `id`, `name`, `slug`, `franchise_id`, `supplier_id`, `product_type`, `funko_number`, `category_name`, `subcategory_name`, `external_catalog_code`, `description`, `main_image_url`, `status`, `created_at` | `seo_title`, `seo_description`, `updated_at`; códigos futuros não consumidos | ACL de tabela inteira para `anon`/`authenticated`; RLS ativa |
| `product_variants` | detalhe, cards, pedidos, estoque, checkout | SELECT por coluna | `id`, `product_id`, `sku`, `condition`, `type`, `source`, `sale_price`, `market_price`, `status`, `created_at`, `special_label`, `special_tags` | `estimated_cost`, `updated_at` | ACL de tabela inteira para `anon`/`authenticated`; RLS ativa |
| `product_images` | detalhe e imagem alternativa dos cards | SELECT por coluna | `id`, `product_id`, `image_url`, `sort_order` | `created_at` | ACL de tabela inteira para `anon`/`authenticated`; RLS ativa |
| `franchises` | relação de produto e cards | SELECT por coluna | `id`, `name`, `slug`, `status` | `image_url`, `created_at`, `updated_at` não são consumidos pelo contrato atual | ACL de tabela inteira para `anon`/`authenticated`; RLS ativa |
| `suppliers` | cards, filtros, páginas de marcas/fornecedores | SELECT por coluna | `id`, `name`, `slug`, `description`, `logo_url`, `banner_url`, `accent_color`, `website_url`, `status`, `sort_order` | `created_at`, `updated_at` | ACL de tabela inteira para `anon`/`authenticated`; RLS ativa |
| `rare_collectibles` | read model privado; serviço server-only | nenhum grant direto | nenhum | todos: série, autenticação, URLs de checkout/WhatsApp, notas, autoria e metadados operacionais | ACL de tabela inteira para `anon`/`authenticated`; RLS ativa |
| `private.rare_collectible_product_ids` | somente as duas views públicas | USAGE no schema e SELECT na view | `product_id` | nenhum outro campo raro | fora do schema público; `security_barrier` |

Categorias e subcategorias não possuem tabela própria: são colunas de
`products`. `catalog_category_options` depende de `products` e do read model
privado para excluir Acervo Raro.

## Policies preservadas

- `products`: leitura de ativos; administração via `is_admin()`.
- `product_variants`: leitura de variantes não ocultas; administração via
  `is_admin()`.
- `product_images`: leitura quando o produto é público; administração via
  `is_admin()`.
- `franchises`: leitura de ativos; administração via `is_admin()`.
- `suppliers`: leitura de ativos; administração via `is_owner()`.
- `rare_collectibles`: leitura pública condicionada à visibilidade e estado;
  administração via `is_admin()`. A migration corretiva remove o grant direto,
  pois o site atual usa o serviço server-only e as views comuns precisam apenas
  do read model privado.

RLS limita linhas, mas não substitui grants. A correção remove os ACLs amplos e
mantém as policies sem alteração, como defesa adicional para as colunas que
continuam públicas.

## Operações finais por papel

| Papel | Leitura pública | Escrita direta | Administração |
| --- | --- | --- | --- |
| `anon` | views e colunas explicitamente listadas | nenhuma | nenhuma |
| `authenticated` | mesmas colunas públicas, sujeitas a RLS | nenhuma | nenhuma direta; APIs Next.js fazem autorização e usam backend |
| admin/owner no Next.js | via APIs e serviços server-only | via `service_role` | preservada |
| `service_role` | integral | SELECT/INSERT/UPDATE/DELETE preservados | integral |

## Rollback e risco

O rollback documentado na migration restaura `GRANT ALL` e, por isso, reabre a
exposição de `estimated_cost`, metadados raros e DML direto. Em caso de campo
público omitido, preferir uma migration forward concedendo somente a coluna
comprovadamente necessária.
