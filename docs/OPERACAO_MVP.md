# Operacao SmartFunkos

Revisado em 2026-08-07. Este documento descreve a operacao atual do web/admin.

## Principio

O sistema e a fonte oficial de pedidos, competencias, pagamentos e acompanhamento. WhatsApp continua como atendimento, mas nao deve ser a fonte de controle.

## Modulos ativos

- Dashboard: leitura operacional rapida.
- Clientes: cadastro e manutencao de clientes.
- Produtos: manutencao separada de catalogo geral e collabs.
- Pre-vendas: cadastro temporario e reservas pagas antes de virar pedido.
- Acervo Raro: pecas especiais, autografadas, certificadas ou limitadas.
- Recebimento: conferencia de carga e separacao por cliente.
- Pedidos: Pedidos V2.
- Cupons: descontos e cupons operacionais.
- Rifas: campanhas, cotas, pagamentos e sorteio interno.
- Relatorios: fechamento mensal, BI e financeiro.

## Pedidos WhatsApp

1. Admin abre `/admin/v2/pedidos`.
2. Seleciona cliente.
3. Seleciona vendedor: Daniel ou Allana.
4. Define data comercial do pedido.
5. Adiciona um ou mais itens.
6. Para item ja cadastrado, busca produto do catalogo/collab correspondente.
7. Para item livre, preenche nome livre e preco. Esse item nao cadastra produto.
8. Sistema cria pedidos V2 aprovados, visiveis para o cliente e vinculados a competencia da data.

Regra importante: varios itens podem ser lancados juntos para acelerar o trabalho do admin, mas o sistema pode manter o controle fino por pedido/item.

## Pedidos do site

1. Cliente monta carrinho no site.
2. Sistema cria pedido V2 com aprovacao `aguardando_aprovacao`.
3. Pedido aparece para o cliente, mas sem pagamento liberado.
4. Admin aprova ou recusa.
5. Se aprovado, pedido entra na cobranca do cliente.
6. Se recusado, cliente ve o estado recusado.

O preco aprovado e o preco original do carrinho; nao ha edicao de valor antes de aprovar.

## Pagamento parcial

1. Cliente abre `/conta/pedidos-v2`.
2. Pedidos aparecem agrupados por competencia.
3. Cliente seleciona os pedidos nao pagos que quer quitar.
4. Pode marcar a competencia para selecionar todos os pedidos disponiveis daquele mes.
5. Sistema cria uma sessao InfinitePay com os pedidos selecionados.
6. Quando o pagamento for confirmado, apenas os pedidos daquela sessao viram `pago`.

Pedidos pagos nao aparecem com checkbox para pagamento novamente.

## Competencias

Competencias comerciais ficam na tabela `v2_order_competencies`.

O admin deve cadastrar/ajustar as janelas comerciais quando necessario. O pedido recebe a competencia no momento da criacao.

Exemplos:

- Julho/2026: 30/06/2026 a 30/07/2026
- Agosto/2026: 31/07/2026 a 30/08/2026
- Setembro/2026: 31/08/2026 a 29/09/2026

## Operacao depois do pagamento

Pedido pago continua aguardando fechamento ate o admin atualizar a operacao.

Fluxo operacional:

- `aguardando_fechamento`
- `solicitado`
- `recebido`
- `enviado`

Quando enviado, o admin pode informar codigo de rastreio para o cliente acompanhar.

Frete nao faz parte da nota automatica por enquanto. Quando os pedidos chegam, os admins combinam frete/envio diretamente com o cliente.

## Recebimento de carga

1. Admin abre `/admin/recebimento`.
2. Busca pelo nome do produto, numero do Funko, SKU ou codigo do item recebido.
3. Confere quais clientes possuem pedidos pagos e solicitados daquele produto.
4. Separa fisicamente os itens por cliente.
5. Marca pedidos individuais como recebido ou usa selecao em lote.

Recebimento muda apenas pedidos pagos de `solicitado` para `recebido`. Envio e rastreio continuam no fluxo de pedidos.

## Cancelamento e reembolso

- Pedido nao pago pode ser cancelado pelo admin.
- Pedido pago pode ser cancelado, mas deve marcar `reembolso_pendente`.
- Reembolso financeiro e feito fora do sistema.
- Depois do reembolso manual, admin marca `reembolsado`.

## Produtos 2.0

Produtos ficam separados por manutencao:

- Produtos gerais
- Piticas
- NBA Brasil
- Copag
- Panini

Regras:

- collab aparece apenas no catalogo da collab;
- produto geral aparece no catalogo geral;
- Acervo Raro nao aparece no catalogo geral;
- item livre de WhatsApp nao cadastra produto;
- nao ha estoque/lote no fluxo atual;
- cada variacao relevante deve ser um produto separado.

## Pre-vendas

Pre-venda e cadastro proprio, temporario e separado do catalogo comum.

Fluxo:

1. Admin cadastra o item em `/admin/pre-vendas`.
2. Cliente seleciona itens em `/pre-vendas`.
3. Cliente paga pela InfinitePay.
4. Apenas depois do pagamento confirmado, o sistema cria pedido V2 ja pago.
5. Admin consulta no painel quantas unidades pagas precisa pedir de cada produto.

Pedido de pre-venda nao pode ser cancelado pelo cliente.

## Acervo Raro

Acervo Raro e usado para itens realmente especiais:

- autografados;
- autenticados;
- com certificado;
- raros ou extremamente limitados.

O cadastro fica em `/admin/acervo-raro` e pode ter multiplas imagens, descricao, texto de historia, autenticacao, itens inclusos, preco, status e controle de slideshow.

O botao de slideshow nao cria um destaque permanente; ele apenas decide se a peca participa do slideshow publico.

## Rifas

Rifas seguem no modulo atual.

Fluxo geral:

1. Admin cria campanha.
2. Cliente reserva cotas e paga por InfinitePay.
3. Webhook/status confirma pagamento.
4. Numeros pagos ficam registrados no cliente.
5. Admin acompanha ranking, cotas vendidas e compradores do mes.
6. Sorteio acontece dentro do app.
7. O sistema evita comprador repetido nas posicoes premiadas.

Premiacao padrao:

- 1o lugar: premio principal.
- 2o a 5o lugar: cupom de 10%.

Rifas precisam de revisao juridica/compliance antes de uso promocional amplo.

## Relatorios

Relatorios ficam em `/admin/relatorios`.

Fechamento mensal:

- filtro por competencia;
- total por cliente;
- pedidos pagos e pendentes;
- botao para gerar link;
- botao para copiar mensagem;
- botao para abrir WhatsApp.

BI e Financeiro:

- filtros por competencia;
- leitura de vendas, recebidos, pendentes, rifas, pre-vendas e fluxo financeiro;
- sem caixa lateral separado no fechamento.

## InfinitePay

Todo pagamento automatico usa InfinitePay. O webhook e a consulta server-side sao a fonte de confirmacao.

Se `INFINITEPAY_HANDLE` nao estiver configurado, o sistema nao consegue gerar link. Em dev, isso e esperado ate a env estar preenchida.

## PopFlix

PopFlix esta no codigo, mas fica oculto enquanto `NEXT_PUBLIC_POPFLIX_ENABLED=false`.

Antes de reativar:

- revisar cadastro de assinatura;
- revisar checkout;
- revisar painel admin;
- validar cobranca e status;
- revisar textos publicos.
