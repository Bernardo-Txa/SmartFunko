# Pagamentos

Revisado em 2026-08-07.

## Gateway

Gateway padrao: InfinitePay.

O sistema nao captura cartao, Pix ou dados sensiveis diretamente. Cliente sempre abre link externo de pagamento.

## Tipos de pagamento

- `order_v2`: pedidos atuais.
- `preorder`: pre-vendas, pagas antes de virar pedido V2.
- `raffle`: rifas.
- `popflix`: assinatura PopFlix, quando o modulo estiver ativo.
- `order`: pedido legado, apenas compatibilidade.

## Pedido V2

Cliente pode pagar um ou varios pedidos em uma unica sessao InfinitePay.

Regras:

- apenas pedidos aprovados podem ser pagos;
- pedido recusado/cancelado nao entra em checkout;
- pedido ja pago nao entra em nova sessao;
- pagamento parcial por competencia e permitido;
- cada sessao grava os pedidos selecionados em `v2_payment_session_orders`;
- webhook/status pago marca apenas os pedidos da sessao como `pago`.

## Pre-venda

Pre-venda exige pagamento antes de criar pedido.

Fluxo:

1. Cliente seleciona itens de pre-venda.
2. Sistema cria checkout InfinitePay de pre-venda.
3. Pagamento confirmado cria pedido V2 com origem `preorder`.
4. Pedido V2 ja nasce `aprovado`, `pago` e `aguardando_fechamento`.

Se o pagamento nao for confirmado, nao deve entrar na nota do cliente.

## Rifa

Rifa usa InfinitePay para reserva/cotas.

Regras:

- cotas so ficam definitivas depois do pagamento confirmado;
- pagamento atrasado ou divergente deve ir para revisao manual;
- sorteio usa apenas cotas pagas;
- sorteio interno evita comprador repetido entre premiados.

## PopFlix

PopFlix esta oculto por flag.

Planos atuais:

- Basico: R$ 109,90.
- Deluxe/intermediario: R$ 199,99.
- Premium: R$ 259,90.

Antes de ativar publicamente, revisar fluxo de assinatura, recorrencia operacional e painel.

## Confirmacao

O redirect da InfinitePay nao confirma pagamento sozinho.

Fontes aceitas:

- webhook `POST /api/v1/webhooks/infinitepay`;
- aliases legados `/webhook-infinitepay` e `/api/webhook-infinitepay`;
- consulta server-side `payment_check`, quando houver `slug`, `transaction_nsu` ou referencia valida.

Eventos duplicados devem ser idempotentes. Valor ausente, valor menor ou estado inesperado deve entrar em `manual_review`.

## Parcelamento

O projeto salva regras operacionais de parcelamento/taxa para auditoria, mas nao deve inventar campos nao documentados no payload da InfinitePay.

Regras internas atuais:

- pedidos comuns podem usar regra padrao por valor;
- rifa tende a 1x;
- acervo raro/pre-venda podem exibir texto comercial de parcelamento, mas o enforcement real depende da configuracao InfinitePay.

## Seguranca

- `INFINITEPAY_API_KEY` fica somente server-side.
- `INFINITEPAY_WEBHOOK_SECRET` fica somente server-side.
- Browser/mobile apenas recebem e abrem links.
- Nunca confiar em valor enviado pelo cliente para marcar pagamento.
- Nunca marcar pagamento apenas por redirect.
