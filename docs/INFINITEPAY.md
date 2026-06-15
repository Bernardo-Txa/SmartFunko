# InfinitePay

## Payload atual de criacao de link

O backend cria links com:

```json
{
  "customer": {
    "email": "cliente@email.com",
    "name": "Cliente",
    "phone_number": "+5511999999999"
  },
  "handle": "smartfunko",
  "items": [
    {
      "description": "Produto Smart Funkos",
      "price": 15000,
      "quantity": 1
    }
  ],
  "order_nsu": "SF-...",
  "redirect_url": "https://site/pedido/SF-...",
  "webhook_url": "https://site/api/v1/webhooks/infinitepay"
}
```

Para rifas, `order_nsu` usa `RAFFLE-{raffleOrderId}`.

## Parcelas e taxa

A documentacao publica usada pelo projeto para `POST https://api.checkout.infinitepay.io/links` nao documenta campo de payload para:

- numero maximo de parcelas;
- repasse/assuncao de taxa por link;
- plano de pagamento.

Por isso, o backend salva `payment_max_installments` e `payment_fee_mode` para auditoria e decisao operacional, mas nao envia campos inventados ao provedor. Enquanto a API/conta nao expuser esse controle por payload, o controle real de taxa em rifa depende da configuracao da conta InfinitePay.

Se a InfinitePay liberar campo oficial no futuro, atualizar `web/src/server/payments/infinitepay-client.ts` e manter as regras centralizadas em `web/src/server/payments/payment-rules.ts`.

## Webhook

O webhook e a fonte principal de confirmacao. Quando o payload/status informar `installments`, o backend salva em `paid_installments`.

Campos explicitamente aceitos quando vierem do provedor:

- `installments`
- `capture_method`
- `transaction_nsu`
- `receipt_url`
- `provider_fee_amount` ou `fee_amount`
