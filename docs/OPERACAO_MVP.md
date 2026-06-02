# Operacao MVP SmartFunko

## Fluxo principal

1. Cliente escolhe um produto no catalogo.
2. Cliente chama a Smart Funkos pelo WhatsApp.
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
- `GET|POST /api/v1/admin/customers`
- `GET|PATCH /api/v1/admin/customers/[id]`
- `GET|POST /api/v1/admin/products`
- `GET|PATCH /api/v1/admin/products/[id]`
- `GET|POST /api/v1/admin/inventory`
- `POST /api/v1/admin/inventory/[id]/reserve`
- `POST /api/v1/admin/inventory/[id]/release`
- `POST /api/v1/admin/orders`
- `POST /api/v1/admin/orders/[id]/items`
- `POST /api/v1/admin/payments/manual`
- `GET /api/v1/admin/cashflow`
- `GET /api/v1/me`
- `GET /api/v1/me/orders`
- `GET /api/v1/me/wishlist`
- `GET /api/v1/public/orders/[orderNumber]?token=...`

## Regras implementadas

- Rotas admin exigem usuario com role `admin` ou `owner`.
- Rotas de caixa exigem role `owner`.
- Rotas `/me` exigem usuario autenticado e cliente vinculado.
- Pagamento manual gera pagamento, entrada de caixa, log administrativo e atualiza status financeiro.
- Reserva de estoque impede reservar unidade que nao esteja `available`.
- Cancelamento de pedido libera unidade reservada.
- Link publico valida `order_number + public_token` e nao expoe dados internos.
- Mock do catalogo so e permitido fora de `production`.

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
3. Ajustar o role do profile para `admin` ou `owner` no Supabase.
4. Entrar em `/admin/login`.
5. Criar cliente via `POST /api/v1/admin/customers`.
6. Criar pedido via `POST /api/v1/admin/orders`.
7. Adicionar item via `POST /api/v1/admin/orders/[id]/items`.
8. Registrar pagamento via `POST /api/v1/admin/payments/manual`.
9. Abrir `/admin/dashboard`, `/admin/pedidos`, `/admin/pagamentos` e `/admin/caixa`.
10. Abrir `/pedido/[orderNumber]?token=...`.

## Telas operacionais

- `/admin/pedidos`: listagem real dos pedidos.
- `/admin/pedidos/novo`: criacao operacional de pedido vindo do WhatsApp.
- `/admin/pedidos/[id]`: detalhe com itens, pagamentos, historico, logs, acoes e link publico.
- `/admin/produtos`: cadastro rapido de produto e variante.
- `/admin/estoque`: cadastro de unidade de estoque.

Na tela de novo pedido, o admin pode selecionar cliente existente, cadastrar cliente rapido, adicionar itens, escolher origem, vincular unidade de estoque, informar frete/desconto e preencher observacoes.

Na tela de detalhe, o admin pode copiar link publico, registrar pagamento manual, adicionar item, atualizar status de item e cancelar pedido.

## Catalogo publico

O catalogo publico usa paginacao server-side:

- pagina padrao: 24 produtos;
- busca por texto via `q`;
- filtro por linha/franquia via `franchise`;
- filtro de disponibilidade via `status`;
- API: `/api/v1/public/products?page=1&pageSize=24&q=Batman`.

## Importacao do catalogo CSV

O importador fica em `scripts/import-products-csv.mjs` e usa `web/.env.local`.

Dry-run:

```bash
npm run catalog:import:dry-run
```

Importacao real ignorando linhas invalidas:

```bash
npm run catalog:import -- --skip-invalid
```

Padrao do importador:

- cria/atualiza franquias por slug;
- cria/atualiza produtos por slug estavel com codigo;
- cria/atualiza variantes por SKU (`Codigo`);
- cria/atualiza imagens por `product_id + image_url`;
- preserva `categoria_principal`, `subcategoria`, `special` e tags especiais;
- nao cria unidades de estoque automaticamente.

Importacao executada em 2026-06-02 com `--skip-invalid`:

- 15.543 linhas de produto no CSV;
- 15.542 produtos validos importados;
- 15.542 variantes importadas;
- 15.542 imagens importadas;
- 712 franquias/linhas criadas ou atualizadas;
- total atual no Supabase apos seed + CSV: 15.544 produtos e 15.544 variantes;
- linha invalida conhecida: linha 9648, SKU `QD3657S89`, preco `R$ 229,90x`.

## Fora da V1

- Pix automatico.
- Checkout proprio.
- Lotes internacionais completos.
- Wishlist avancada.
- Notificacoes.
- Flutter mobile.
- Leiloes.
- BI avancado.
- Integracao fiscal/frete.
