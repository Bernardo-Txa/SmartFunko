# Relatorios, BI e Financeiro

Revisado em 2026-08-07.

## Telas

- `/admin/relatorios`: entrada principal.
- `/admin/relatorios/fechamento`: fechamento mensal.
- `/admin/relatorios/financeiro`: leitura financeira.
- `/admin/bi`: alias do BI.

## Fechamento mensal

O fechamento mensal e a tela operacional para mandar cobranca ao cliente.

Filtro principal:

- competencia cadastrada em `v2_order_competencies`.

Indicadores:

- clientes com pedidos na competencia;
- clientes a cobrar;
- total da nota;
- total ja pago;
- total pendente;
- quantidade de pedidos pagos e pendentes.

Por cliente, a tela mostra:

- pedidos pendentes detalhados;
- pedidos pagos detalhados;
- total da nota;
- total pago;
- saldo pendente;
- telefone/e-mail quando disponivel.

Acoes:

- gerar link de pagamento;
- copiar mensagem de cobranca;
- abrir WhatsApp;
- abrir link do cliente.

PDF nao e requisito atual. O foco e automatizar texto/link de WhatsApp.

## BI

BI e leitura gerencial por competencia.

Fontes principais:

- Pedidos V2;
- sessoes de pagamento V2;
- `cash_entries`, quando aplicavel;
- rifas pagas;
- pre-vendas pagas que geraram pedido V2.

Regras:

- pedido recusado, cancelado ou reembolsado nao entra como venda liquida;
- pedido `aguardando_aprovacao` nao entra em receita;
- pedido `pago` entra como recebido;
- pedido aprovado e nao pago entra como pendente;
- rifa usa pedidos/cotas pagos como fonte;
- pre-venda so entra como pedido depois do pagamento confirmado.

## Financeiro

Financeiro e leitura de recebido, pendente, taxas/reembolsos e visao de caixa operacional.

Filtro principal:

- competencia, igual ao fechamento.

Quando houver divergencia entre InfinitePay e sistema, a origem de verdade continua sendo webhook/status confirmado e eventos em revisao manual precisam de tratamento admin.

## Fora do escopo atual

- contabilidade fiscal;
- emissao de nota fiscal;
- conciliacao bancaria automatica;
- DRE completa;
- previsao com IA;
- exportacao avancada.
