# Operacao MVP SmartFunko

## Fluxo principal

1. Cliente escolhe um produto no catalogo.
2. Cliente pode favoritar produtos, montar carrinho assistido ou chamar a Smart Funkos pelo WhatsApp.
3. Admin entra no painel e cadastra ou seleciona o cliente.
4. Admin cria um pedido manual.
5. Admin adiciona itens ao pedido.
6. Se o item for pronta-entrega, admin vincula uma unidade de estoque disponivel.
7. Sistema reserva a unidade de estoque.
8. Admin registra pagamento manual.
9. Sistema cria `payments`, cria `cash_entries` e atualiza o status do pedido.
10. Admin envia o link publico `/pedido/[orderNumber]?token=...` para o cliente.

## APIs principais

- `GET /api/v1/admin/dashboard`
- `/admin/demanda` usa wishlist para ranking operacional de demanda, restrito a owner.
- `GET|POST /api/v1/admin/customers`
- `GET|PATCH /api/v1/admin/customers/[id]`
- `GET|POST /api/v1/admin/products`
- `GET|PATCH /api/v1/admin/products/[id]`
- `POST /api/v1/admin/products/[id]/images`
- `PATCH /api/v1/admin/products/[id]/images/reorder`
- `PATCH /api/v1/admin/products/[id]/images/[imageId]/main`
- `DELETE /api/v1/admin/products/[id]/images/[imageId]`
- `POST /api/v1/admin/products/[id]/variants`
- `PATCH /api/v1/admin/product-variants/[id]`
- `GET|POST /api/v1/admin/suppliers`
- `GET|PATCH /api/v1/admin/suppliers/[id]`
- `GET|POST /api/v1/admin/inventory`
- `GET|PATCH /api/v1/admin/inventory/[id]`
- `POST /api/v1/admin/inventory/[id]/adjust`
- `GET /api/v1/admin/inventory/[id]/movements`
- `POST /api/v1/admin/inventory/[id]/reserve`
- `POST /api/v1/admin/inventory/[id]/release`
- `POST /api/v1/admin/inventory/[id]/mark-sold`
- `POST /api/v1/admin/inventory/[id]/mark-damaged`
- `POST /api/v1/admin/orders`
- `POST /api/v1/admin/orders/[id]/items`
- `POST /api/v1/admin/payments/manual`
- `GET /api/v1/admin/cashflow`
- `GET /api/v1/me`
- `GET /api/v1/me/orders`
- `GET /api/v1/me/orders/[orderNumber]`
- `GET /api/v1/me/wishlist`
- `POST /api/v1/me/wishlist`
- `DELETE /api/v1/me/wishlist/[id]`
- `GET /api/v1/public/products`
- `GET /api/v1/public/products/[slug]`
- `GET /api/v1/public/orders/[orderNumber]?token=...`
- `GET /api/v1/public/suppliers`
- `GET /api/v1/public/suppliers/[slug]`

## Rotas publicas comerciais

- `/`: home premium com hero, vitrines, universos, fornecedores, fluxo assistido e confianca.
- `/pronta-entrega`: produtos com estoque proprio ou status disponivel.
- `/pre-venda`: produtos com origem/status de pre-venda, com aviso de prazo variavel.
- `/specials`: produtos com tipo especial, special label ou tags especiais.
- `/novidades`: produtos ativos mais recentes por data de cadastro.
- `/encomendas`: produtos sob encomenda/importacao, com CTA para WhatsApp.
- `/carrinho`: carrinho local para intencao de compra assistida.
- `/conta/wishlist`: favoritos do cliente autenticado.

## Regras implementadas

- Rotas internas usam `owner` como role operacional principal.
- A role `admin` fica reservada/legada; `requireAdmin()` e alias de `requireOwner()` na aplicacao.
- Login e unico em `/login`; `/admin/login` redireciona para `/login?next=/admin/dashboard`.
- A sessao Supabase SSR e renovada em `web/src/proxy.ts`, seguindo a convencao ativa do Next 16 no projeto.
- Rotas `/me` exigem usuario autenticado e cliente vinculado.
- Pagamento manual gera pagamento, entrada de caixa, log administrativo e atualiza status financeiro.
- Reserva de estoque impede reservar unidade que nao esteja `available`.
- Cancelamento de pedido libera unidade reservada.
- Estoque 2.0 registra `inventory_movements` por unidade fisica para criacao, reserva, liberacao, venda, cancelamento, recebimento, avaria, indisponibilidade, ajuste de custo, mudanca de localizacao e ajuste manual.
- Ajuste manual de estoque e restrito a owner, exige justificativa e tambem grava `admin_action_logs`.
- Reserva de estoque exige `order_item_id`; a unidade fica com `status = reserved` e `reserved_for_order_item_id` preenchido.
- Liberacao de estoque limpa `reserved_for_order_item_id` e registra o pedido/item original no movimento.
- Unidades `sold`, `reserved`, `damaged` e `unavailable` nao aparecem como disponiveis para reserva.
- Item vendido nao volta para disponivel por fluxo automatico; qualquer retorno precisa de ajuste manual owner com justificativa.
- Link publico valida `order_number + public_token` e nao expoe dados internos.
- `/conta/pedidos` usa pedidos reais do cliente vinculado ao login e nao mostra pedidos de outros clientes.
- `/conta/pedidos/[orderNumber]` mostra dados seguros do pedido do proprio cliente, incluindo itens, status, pagamentos e observacoes publicas.
- `/api/v1/me/orders` e `/api/v1/me/orders/[orderNumber]` retornam pedidos sanitizados, sem `internal_notes`, custos, margem, logs ou token publico.
- Status internos continuam em ingles no banco, mas badges e textos de UI usam `web/src/lib/status-labels.ts`.
- Fornecedores/collabs usam `suppliers`; publicos ativos aparecem em `/fornecedores` e `/fornecedores/[slug]`.
- O catalogo aceita filtro adicional por fornecedor: `/catalogo?supplier=piticas`.
- O catalogo e as paginas comerciais aceitam busca, fornecedor, categoria e ordenacao comercial (`sort`).
- Filtros comerciais aceitos: `ready`, `preorder`, `specials`, `new` e `order`.
- Produtos sao criados em `/admin/produtos/novo` e editados em `/admin/produtos/[id]`, incluindo fornecedor, imagem, descricao, status e variantes.
- `/admin/produtos/[id]` mostra resumo simples de estoque do produto por status e link para `/admin/estoque`.
- `/admin/estoque` mostra cards reais de total, disponiveis, reservadas, vendidas, em transito, avariadas, indisponiveis, valor estimado e valor disponivel, alem de filtros por produto/SKU/status/localizacao e links para detalhe por unidade.
- `/admin/estoque/[id]` mostra dados da unidade, custos, pedido reservado, historico de movimentos e acoes manuais permitidas para owner.
- `/admin/produtos/[id]` possui a secao "Imagens do produto" para upload real via Supabase Storage, preview, definicao de imagem principal, remocao da galeria e reordenacao por botoes.
- O bucket de imagens e `product-images`, publico para leitura e restrito a owner/admin para escrita.
- Upload aceita `image/jpeg`, `image/png`, `image/webp` e `image/avif`, com limite de 5MB por arquivo.
- `products.main_image_url` continua aceitando URL manual e tem prioridade sobre a primeira imagem de `product_images`.
- Catalogo, home, ProductCard e pagina de produto usam `main_image_url`, depois `product_images` ordenadas por `sort_order`, depois fallback visual.
- Mock do catalogo so e permitido fora de `production`.
- Carrinho assistido persiste apenas no navegador e nao grava pedido, pagamento, frete ou reserva de estoque.
- Wishlist exige login e customer vinculado; customer so ve/remove a propria lista.
- Admin de demanda usa dados reais de `wishlist_items` para ranking por produto, franquia, fornecedor e categoria.

## Variaveis necessarias

No `web/.env.local`:

```bash
NEXT_PUBLIC_SITE_URL=http://localhost:3000
NEXT_PUBLIC_WHATSAPP_NUMBER=5511999999999
NEXT_PUBLIC_SUPABASE_URL=https://project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
```

## Como testar o fluxo

1. Aplicar migrations do Supabase.
2. Criar um usuario pelo cadastro ou pelo Supabase Auth.
3. Ajustar o role do profile para `owner` no Supabase.
4. Entrar em `/login`; owners sao redirecionados para `/admin/dashboard`.
5. Criar cliente via `POST /api/v1/admin/customers`.
6. Criar pedido via `POST /api/v1/admin/orders`.
7. Adicionar item via `POST /api/v1/admin/orders/[id]/items`.
8. Registrar pagamento via `POST /api/v1/admin/payments/manual`.
9. Abrir `/admin/dashboard`, `/admin/pedidos`, `/admin/pagamentos` e `/admin/caixa`.
10. Abrir `/fornecedores`, `/fornecedores/piticas`, `/fornecedores/copag` e `/fornecedores/panini`.
11. Editar produto em `/admin/produtos/[id]`, trocar fornecedor/imagem/preco e conferir em `/catalogo?supplier=piticas`.
12. Em `/admin/produtos/[id]`, enviar imagem valida na secao "Imagens do produto".
13. Testar rejeicao de arquivo acima de 5MB e de arquivo que nao seja imagem aceita.
14. Definir a imagem enviada como principal e conferir card no catalogo/home e galeria em `/produto/[slug]`.
15. Reordenar imagens e conferir a ordem da galeria publica.
16. Remover uma imagem e confirmar que o fallback por `main_image_url`, primeira imagem restante ou `ProductArtwork` continua funcionando.
17. Criar unidade de estoque e conferir movimento `created`.
18. Ajustar status, localizacao e custo com justificativa e conferir movimentos `manual_adjustment`, `location_change` e `cost_adjustment`.
19. Criar pedido com item pronta-entrega vinculado a uma unidade e conferir movimento `reserved`.
20. Cancelar pedido e conferir estoque liberado com movimento `cancelled`.
21. Marcar unidade como avariada e conferir movimento `damaged`.
22. Abrir `/admin/estoque` e `/admin/estoque/[id]`.
23. Confirmar que cliente nao acessa endpoints admin de estoque.
24. Abrir `/pedido/[orderNumber]?token=...`.
25. Entrar como cliente e conferir `/conta/pedidos` e `/conta/pedidos/[orderNumber]`.
26. Testar token errado no link publico.

## Contratos para app futuro

O app Flutter nao faz parte desta V1. Estes contratos devem ser mantidos estaveis para uso futuro:

- `GET /api/v1/me`: exige login; resposta `{ data: { user, profile, customer } }`.
- `GET /api/v1/me/orders`: exige login e customer vinculado; resposta `{ data: Order[] }`, apenas pedidos do customer autenticado.
- `GET /api/v1/me/orders/[orderNumber]`: exige login e customer vinculado; resposta `{ data: Order }`, apenas se o pedido pertencer ao customer autenticado.
- `GET /api/v1/me/wishlist`: exige login e customer vinculado; resposta `{ data: WishlistItem[] }`.
- `POST /api/v1/me/wishlist`: exige login; body com produto/variante conforme service; resposta `{ data: WishlistItem }`.
- `DELETE /api/v1/me/wishlist/[id]`: exige login; remove item do proprio customer.
- `GET /api/v1/public/products`: publico; aceita `q`, `category`, `subcategory`, `franchise`, `supplier`, `filter`, `sort`, `page`, `pageSize`; resposta `{ data: Product[], meta }`.
- `GET /api/v1/public/products/[slug]`: publico; resposta `{ data: Product }` ou 404.
- `GET /api/v1/public/suppliers`: publico; resposta `{ data: Supplier[] }` somente com suppliers `active`.
- `GET /api/v1/public/suppliers/[slug]`: publico; resposta `{ data: Supplier }` somente se `active`.

Pedidos retornados em `/me` sao sanitizados: podem conter numero, status, cliente, itens, pagamentos, totais e observacoes publicas; nao devem conter observacoes internas, custos, margem, logs administrativos, token publico ou IDs operacionais desnecessarios.

## Fora da V1

- Pix automatico.
- Checkout proprio.
- Lotes internacionais completos.
- Wishlist avancada.
- Notificacoes automaticas.
- Flutter mobile.
- Leiloes.
- BI avancado.
- Integracao fiscal/frete.
- Gamificacao / Clube Smart Funkos.
