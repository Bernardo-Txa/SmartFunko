# Stability Checkup 1.0

Escopo deste hotfix: pedidos, pagamentos, checkout assistido, rifas, migrations/schema, logs e tratamento de erro.

Fora de escopo: UI premium, mobile visual, home mobile, wishlist, colecao, scanner, marketplace e design system.

## Rotas criticas

Admin pedidos:
- `/admin/pedidos`
- `/admin/pedidos/[id]`
- `POST /api/v1/admin/orders/[id]/approve-payment`
- `POST /api/v1/admin/orders/[id]/reject`
- `/api/v1/admin/orders/[id]/payments` se existir no deploy atual

Cliente pedidos:
- `/conta/pedidos`
- `/conta/pedidos/[orderNumber]`
- `GET /api/v1/me/orders`
- `GET /api/v1/me/orders/[orderNumber]`

Admin rifas:
- `/admin/rifas`
- `/admin/rifas/[id]`
- `GET/POST /api/v1/admin/raffles`
- `GET/PATCH /api/v1/admin/raffles/[id]`
- `POST /api/v1/admin/raffles/[id]/draw`
- `GET /api/v1/admin/raffles/[id]/orders`

Cliente/mobile rifas:
- `/rifas`
- `/rifas/[slug]`
- `GET /api/v1/public/raffles`
- `GET /api/v1/public/raffles/[slug]`
- `GET /api/v1/public/raffles/[slug]/numbers`
- `GET /api/v1/me/raffles/orders`
- `GET /api/v1/me/raffles`

Webhooks:
- `POST /api/v1/webhooks/infinitepay`
- `POST /webhook-infinitepay` se existir no deploy atual
- `POST /api/webhook-infinitepay` se existir no deploy atual

## Logs de producao

Para cada falha na Vercel, capturar:
- request id;
- rota e metodo;
- status HTTP;
- mensagem server-side;
- stack trace;
- `code`, `message`, `details` e `hint` do Supabase.

Logs adicionados/reforcados:
- `[OrderService] listOrders failed`
- `[OrderService] getOrderById failed`
- `[OrderService] getCustomerOrders failed`
- `[OrderService] getCustomerOrderByNumber failed`
- `[AssistedCheckout] failed to fetch assisted order`
- `[ApprovePayment] failed`
- `[RaffleService] expireReservations failed`
- `[RaffleService] listRaffleOrders failed`
- `[RaffleService] listPublicRaffleNumbers failed`
- `[AdminRaffleDetailPage] failed to load campaign`
- `[AdminRaffleDetailPage] failed to load raffle orders`
- `[AdminRaffleDetailPage] failed to load raffle numbers`

Nao logar service role key, tokens de usuario, segredo InfinitePay ou payload sensivel.

## Schema critico

Campos esperados em `orders`:
- `payment_max_installments`
- `payment_max_installments_source`
- `payment_fee_mode`
- `paid_installments`
- `provider_payment_method`
- `provider_fee_amount`

Campos esperados em `raffle_orders`:
- `payment_max_installments`
- `payment_fee_mode`
- `capture_method`
- `transaction_nsu`
- `cash_entry_id`
- `payment_id`
- `payment_provider`
- `payment_status`
- `paid_at`
- `reserved_until`
- `total_amount`

Campos esperados em `raffle_numbers`:
- `campaign_id` ou `raffle_campaign_id`, conforme migration real
- `raffle_order_id`
- `status`
- `label`
- `number`
- `reserved_until`
- `customer_id`

Campos esperados em `payments`:
- `order_id`
- `amount`
- `status`
- `method`
- `provider`
- `provider_reference`
- `payment_link_url`
- `paid_at`
- `created_at`

Migrations relevantes:
- `20260610190943_assisted_checkout_infinitepay.sql`
- `20260611120000_raffle_infinitepay_checkout.sql`
- `20260615120000_payment_rules_installments_and_fees.sql`
- `20260615143000_stability_payments_provider_fields.sql`

## Validacao de pedidos

1. Abrir `/admin/pedidos` e verificar se a lista renderiza sem erro de Server Components.
2. Abrir um pedido com itens, cliente e pagamentos.
3. Abrir um pedido sem pagamentos e confirmar fallback visual.
4. Aprovar pagamento em pedido `under_review` com itens e total maior que zero.
5. Confirmar que pedido inexistente retorna 404.
6. Confirmar que pedido pago retorna 409 ao gerar link.
7. Confirmar que pedido sem itens retorna 409.

## Validacao de rifas

1. Abrir `/admin/rifas`.
2. Abrir `/admin/rifas/[id]` para rifa com pedidos e numeros.
3. Simular falha em pedidos e confirmar que a campanha ainda renderiza.
4. Simular falha em numeros e confirmar que pedidos ainda renderizam.
5. Confirmar que `expire_raffle_reservations` roda no maximo uma vez por instancia de `RaffleService`.
6. Reservar numero via `/api/v1/me/raffles/[slug]/reserve`.
7. Gerar link InfinitePay para pedido de rifa pendente.
8. Confirmar pagamento manual de pedido de rifa pendente.

## Validacao mobile/API

1. Testar endpoints `/api/v1/public/raffles*` com CORS.
2. Testar endpoints `/api/v1/me/raffles*` com Authorization.
3. Verificar 409 para conflitos normais: numero indisponivel, reserva expirada, rifa encerrada ou pagamento ja gerado.
4. Verificar 500 somente para erro inesperado, sem stack trace no JSON.

## Comandos locais

```bash
cd web
npm run lint
npm run build
```

## Resultado Supabase Producao - 2026-06-15

Projeto validado: `sufppaxdxmxdcfkuvanm`.

Migrations aplicadas no remoto:
- `20260615120000_payment_rules_installments_and_fees.sql`
- `20260615143000_stability_payments_provider_fields.sql`

Validacoes remotas concluídas:
- tabelas criticas existem;
- campos criticos de `orders`, `raffle_orders`, `raffle_numbers` e `payments` existem;
- selects reais de `OrderService`, `AssistedCheckoutService`, `RaffleService` e `/api/v1/admin/orders/[id]/payments` passam sem erro;
- RPC `expire_raffle_reservations` existe e executou com retorno `0`;
- sem reservas pendentes expiradas;
- sem divergencia ativa entre quantidade de pedidos de rifa e numeros vinculados;
- sem divergencia ativa de total de pedido de rifa;
- sem pedido assistido em analise/aguardando pagamento sem itens;
- sem pedido pago sem pagamento pago;
- sem pagamento pago sem `paid_at`.

Correcao de dado aplicada:
- 1 pedido legado de rifa com `status = paid` e `payment_status = pending` foi normalizado para `payment_status = paid`.
