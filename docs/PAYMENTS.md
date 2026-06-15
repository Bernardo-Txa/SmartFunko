# Pagamentos

## Pedidos comuns

- Pedidos abaixo de R$ 150,00 usam limite interno padrao de 1x.
- Pedidos a partir de R$ 150,00 usam limite interno padrao de 3x.
- Na aprovacao do checkout assistido, admin/owner pode aumentar o limite, ate o teto operacional de 12x.
- Override menor que o padrao da aprovacao e rejeitado. Para reduzir parcelamento de pedidos acima de R$ 150,00, crie uma regra operacional separada.
- O cliente web/mobile nao envia `maxInstallments`; a regra final e calculada no backend.

Campos de auditoria:

- `payment_max_installments`
- `payment_max_installments_source`: `default_rule` ou `admin_override`
- `payment_fee_mode`: `merchant_absorbs`, `customer_pays` ou `account_default`
- `paid_installments`, quando o provedor informa no webhook/status

## Rifas

- Rifa usa regra propria, sem regra automatica de 3x acima de R$ 150,00.
- O limite interno inicial de rifa e 1x.
- Rifa deve ser auditada com `payment_fee_mode = customer_pays`.
- O status pago de rifa continua vindo somente de webhook/status confirmado pela InfinitePay. Redirect nao baixa pagamento localmente.

## Segurança

- Secrets ficam apenas em variaveis server-only.
- Flutter/mobile e web cliente apenas abrem o link recebido.
- `maxInstallments` enviado por cliente comum nao faz parte do schema de criacao de pedido e nao e usado.
- Apenas endpoints admin calculam e aceitam override de parcelamento.
