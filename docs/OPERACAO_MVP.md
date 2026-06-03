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

- Rotas internas exigem usuario com role `owner`.
- A role `admin` fica reservada/legada no banco e nao deve ser usada para novos usuarios internos.
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
3. Ajustar o role do profile para `owner` no Supabase.
4. Entrar em `/admin/login`.
5. Criar cliente via `POST /api/v1/admin/customers`.
6. Criar pedido via `POST /api/v1/admin/orders`.
7. Adicionar item via `POST /api/v1/admin/orders/[id]/items`.
8. Registrar pagamento via `POST /api/v1/admin/payments/manual`.
9. Abrir `/admin/dashboard`, `/admin/pedidos`, `/admin/pagamentos` e `/admin/caixa`.
10. Abrir `/pedido/[orderNumber]?token=...`.

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
