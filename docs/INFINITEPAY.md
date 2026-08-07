# InfinitePay

Revisado em 2026-08-07.

## Papel no sistema

InfinitePay e o gateway padrao para links de pagamento. A SmartFunkos nao captura dados de cartao/Pix internamente.

Usos atuais:

- Pedidos V2;
- Pre-vendas;
- Rifas;
- PopFlix, quando ativo;
- pedidos legados, apenas compatibilidade.

## Criacao de link

Payload base:

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
      "description": "Produto SmartFunkos",
      "price": 15000,
      "quantity": 1
    }
  ],
  "order_nsu": "SFV2-...",
  "redirect_url": "https://site/conta/pedidos-v2",
  "webhook_url": "https://site/api/v1/webhooks/infinitepay"
}
```

`price` e enviado em centavos.

Padroes de `order_nsu`:

- Pedido V2: identificador da sessao/pedido V2.
- Rifa: `RAFFLE-{raffleOrderId}`.
- Pre-venda: identificador da reserva/sessao de pre-venda.
- PopFlix: identificador da assinatura/pagamento PopFlix.

## Confirmacao

O redirect informa o cliente, mas nao deve baixar pagamento sozinho.

Fontes validas:

- webhook `POST /api/v1/webhooks/infinitepay`;
- `payment_check` server-side;
- validacao manual admin quando necessario.

Quando o pagamento e confirmado:

- pedido V2: apenas os pedidos da sessao viram `pago`;
- pre-venda: cria pedido V2 pago;
- rifa: confirma cotas pagas;
- PopFlix: atualiza assinatura/pagamento quando o modulo estiver ativo.

## Webhook

Endpoint principal:

```txt
POST /api/v1/webhooks/infinitepay
```

Aliases:

```txt
POST /webhook-infinitepay
POST /api/webhook-infinitepay
```

Regras:

- nao exige login;
- valida HMAC se `INFINITEPAY_WEBHOOK_SECRET` estiver configurado e o header vier no formato esperado;
- registra payload bruto;
- precisa ser idempotente;
- evento duplicado nao pode duplicar pedido, pagamento, caixa, cota ou reserva.

Campos aceitos quando vierem do provedor:

- `order_nsu`
- `invoice_slug`
- `transaction_nsu`
- `receipt_url`
- `capture_method`
- `installments`
- `paid_amount`
- `amount`
- `provider_fee_amount`
- `fee_amount`

## Manual review

Enviar para revisao manual quando:

- valor pago estiver ausente;
- valor pago for menor que o esperado;
- pedido/sessao nao for encontrado;
- rifa estiver expirada ou numero ja liberado;
- webhook chegar em estado inesperado;
- houver divergencia de status.

Precisa existir rotina admin para revisar esses eventos antes da operacao final.

## Parcelas e taxa

Nao inventar campos de payload que a InfinitePay nao documenta para a conta atual.

O sistema pode salvar:

- limite operacional de parcelas;
- modo de taxa;
- parcelas informadas pelo provedor no retorno.

O enforcement real depende da configuracao da conta InfinitePay ou de campo oficial futuro.

## Configuracao

```txt
INFINITEPAY_API_BASE_URL=https://api.checkout.infinitepay.io
INFINITEPAY_HANDLE=smartfunko
INFINITEPAY_API_KEY=
INFINITEPAY_WEBHOOK_SECRET=
INFINITEPAY_WEBHOOK_ENABLED=true
```

`INFINITEPAY_HANDLE` e obrigatorio para gerar link. Em ambiente local, o erro "Configure INFINITEPAY_HANDLE" significa que a env ainda nao foi preenchida.

## Consulta manual

Endpoint externo:

```txt
POST https://api.checkout.infinitepay.io/payment_check
```

Corpo esperado pelo backend:

```json
{
  "handle": "smartfunko",
  "order_nsu": "SFV2-...",
  "slug": "codigo-da-fatura"
}
```

Se a resposta confirmar pagamento, o backend executa o mesmo fluxo de baixa usado pelo webhook.
