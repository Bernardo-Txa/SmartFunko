# Estado atual SmartFunkos

Revisado em 2026-08-07.

Este documento e a fonte principal da versao atual do produto. Documentos antigos de V1 devem ser tratados como historico quando conflitarem com esta pagina.

## Produto atual

A SmartFunkos esta estruturada como uma operacao assistida:

- o site ajuda o cliente a descobrir produtos, collabs, pre-vendas, acervo raro e rifas;
- o cliente acompanha pedidos, pagamentos e reservas pela conta;
- o admin controla cadastro, aprovacao, cobranca, fechamento mensal e manutencao;
- InfinitePay e o gateway padrao para pagamentos automatizados;
- WhatsApp continua como canal de atendimento, mas o controle operacional fica no sistema.

## Navegacao publica

- `/`: home com vitrine e slideshow comercial.
- `/catalogo`: catalogo geral, sem collabs e sem acervo raro.
- `/produto/[slug]`: detalhe de produto do catalogo geral.
- `/collabs`: lista de collabs oficiais.
- `/collabs/[slug]`: catalogo exclusivo de uma collab.
- `/pre-vendas`: produtos temporarios de pre-venda.
- `/acervo-raro`: pecas especiais, assinadas, autenticadas ou extremamente limitadas.
- `/acervo-raro/[slug]`: detalhe de uma peca rara.
- `/rifas` e `/rifas/[slug]`: campanhas de rifa quando a flag estiver ativa.
- `/carrinho`: carrinho assistido para itens do catalogo.
- `/conta`: area autenticada do cliente.
- `/conta/pedidos-v2`: acompanhamento atual de pedidos por competencia.

PopFlix existe, mas deve ficar oculto enquanto `NEXT_PUBLIC_POPFLIX_ENABLED=false`.

## Painel admin

Menu principal esperado:

- Dashboard
- Clientes
- Produtos
- Pre-vendas
- Acervo Raro
- Recebimento
- Pedidos
- Cupons
- Rifas
- Relatorios

Modulos antigos como Estoque, Lotes, Fornecedores, Pagamentos/Caixa isolados, BI legado, Demanda e Smart Clube nao fazem parte da navegacao operacional atual, salvo se forem reativados intencionalmente.

## Pedidos V2

Pedidos V2 sao o fluxo atual.

Tabelas principais:

- `v2_order_competencies`
- `v2_orders`
- `v2_order_items`
- `v2_payment_sessions`
- `v2_payment_session_orders`
- `v2_order_events`
- `v2_payment_provider_events`
- `v2_shipments`

Cada pedido possui tres controles separados:

- aprovacao: `aguardando_aprovacao`, `aprovado`, `recusado`;
- pagamento: `nao_pago`, `checkout_gerado`, `pago`, `reembolso_pendente`, `reembolsado`, `cancelado`;
- operacao: `aguardando_fechamento`, `solicitado`, `recebido`, `enviado`, `cancelado`.

Regras atuais:

- pedido criado pelo admin via WhatsApp nasce aprovado e aparece para o cliente;
- pedido criado pelo site nasce aguardando aprovacao e so pode ser pago depois da aprovacao;
- cada item lancado pelo admin pode virar um pedido individual;
- o cliente pode pagar varios pedidos juntos em uma unica sessao InfinitePay;
- o cliente pode pagar parcialmente, selecionando apenas alguns pedidos de uma competencia;
- pedido pago nao exibe checkbox de selecao para novo pagamento;
- cancelamento de pedido pago marca reembolso pendente; o reembolso financeiro e manual fora do sistema;
- apos reembolso manual, admin marca o pedido como reembolsado;
- frete ainda nao entra no fechamento automatico.

Vendedores validos no lancamento admin: Daniel e Allana.

## Competencias

Competencia nao deve ser calculada por formula fixa no codigo. Ela e cadastrada em tabela com janela comercial.

Exemplos:

- Julho/2026: 30/06/2026 a 30/07/2026
- Agosto/2026: 31/07/2026 a 30/08/2026
- Setembro/2026: 31/08/2026 a 29/09/2026

Todo pedido recebe `competence_id` no momento da criacao com base na data comercial do pedido.

## Recebimento de carga

Recebimento fica em `/admin/recebimento` e atende a rotina de chegada de caixas dos fornecedores.

Uso previsto:

- buscar por nome do produto, numero do Funko, SKU ou codigo;
- filtrar por competencia e por status operacional;
- ver quais clientes compraram aquele item;
- selecionar pedidos individuais ou todos os pedidos solicitados de um produto;
- marcar pedidos pagos e solicitados como `recebido` em lote.

A aba nao cria pedido e nao muda pagamento. Ela apenas acelera a separacao fisica e a mudanca operacional de `solicitado` para `recebido`.

## Produtos 2.0

Produtos sao mantidos por area:

- Produtos gerais
- Piticas
- NBA Brasil
- Copag
- Panini

Regras:

- produto geral aparece no catalogo geral;
- produto de collab aparece apenas dentro da collab;
- produto de Acervo Raro nao aparece em Produtos gerais nem no catalogo geral;
- item livre usado em pedido WhatsApp nao deve cadastrar produto;
- nao existe controle operacional de estoque/lote no fluxo atual;
- produto com variacao deve ser cadastrado como produtos separados quando cada variacao tiver preco/identidade propria.

O cadastro de Produtos 2.0 e simples: nome, tipo, preco, imagem, numero, categoria, linha/colecao e descricao.

## Acervo Raro

Acervo Raro e separado do catalogo comum.

Uso previsto:

- pecas autografadas;
- pecas autenticadas;
- itens com certificado;
- itens extremamente limitados;
- itens com narrativa e imagens proprias.

O admin cadastra a peca em `/admin/acervo-raro`, podendo adicionar imagens, textos, descricao, itens inclusos, autenticacao, preco e status. O controle "slideshow" serve apenas para decidir se a peca aparece no hero/slideshow publico.

Rotas publicas:

- `/acervo-raro`
- `/acervo-raro/[slug]`

## Pre-vendas

Pre-vendas sao temporarias e separadas do catalogo geral.

Fluxo:

1. Admin cadastra o item de pre-venda em `/admin/pre-vendas`.
2. Cliente seleciona itens em `/pre-vendas`.
3. Cliente paga antes de confirmar a reserva.
4. Depois do pagamento confirmado, o sistema cria pedido V2 com:
   - origem `preorder`;
   - aprovacao `aprovado`;
   - pagamento `pago`;
   - operacao `aguardando_fechamento`.
5. Admin usa o painel para ver quantas unidades pagas precisa pedir de cada item.

Pedido de pre-venda nao pode ser cancelado pelo cliente. Cancelamento, se necessario, e acao admin.

## Rifas

Rifas usam o modulo atual, nao uma V2 separada.

Rotas principais:

- `/admin/rifas`
- `/admin/rifas/nova`
- `/admin/rifas/[id]`
- `/rifas`
- `/rifas/[slug]`
- `/conta/rifas`

Melhorias atuais:

- dashboard admin por mes/competencia;
- ranking de compradores por quantidade de cotas;
- totais de cotas e receita;
- pagamento por InfinitePay;
- sorteio dentro do app;
- sorteio evita comprador repetido entre as posicoes premiadas;
- premiacao padrao: 1o lugar ganha o premio principal; 2o a 5o lugar ganham cupom de 10%.

Antes de uso promocional real, manter revisao juridica/compliance como pendencia.

## Relatorios

Relatorios ficam em `/admin/relatorios`.

Abas atuais:

- Fechamento mensal
- BI
- Financeiro

Fechamento mensal:

- filtra por competencia;
- lista clientes com pedidos pagos e pendentes;
- mostra total da nota, total pago e pendente;
- permite gerar link de pagamento do site;
- permite copiar mensagem de WhatsApp;
- permite abrir WhatsApp com a mensagem.

PDF nao e requisito atual. A prioridade e mensagem/link de WhatsApp com dados claros.

BI e Financeiro tambem devem usar filtro por competencia para manutencao simples.

## Pagamentos

Gateway padrao: InfinitePay.

Tipos de checkout tratados pelo sistema:

- pedido V2 comum: `order_v2`;
- rifa: `raffle`;
- pre-venda: `preorder`;
- PopFlix: `popflix`, quando o modulo estiver ativo;
- pedido legado: `order`, apenas compatibilidade.

O redirect da InfinitePay nao e a fonte unica de verdade. Confirmacao depende de webhook e/ou consulta server-side `payment_check`.

## PopFlix

PopFlix existe, mas esta oculto por padrao.

Planos configurados:

- Basico: R$ 109,90
- Deluxe/intermediario: R$ 199,99
- Premium: R$ 259,90

Antes de publicar, revisar cadastro, assinatura, cobranca recorrente/manual e painel admin.

## Pendencias antes da versao final

- Revisar juridicamente rifas e termos de participacao.
- Definir rotina real para reembolso manual e marcacao de reembolsado.
- Criar rotina operacional para eventos InfinitePay em `manual_review`.
- Automatizar envio de WhatsApp somente se houver integracao oficial aprovada; por enquanto o sistema abre/copias mensagens.
- Confirmar RLS/migrations aplicadas no Supabase de producao.
- Rodar QA responsivo completo em admin e publico.
- Validar build em ambiente com Supabase responsivo; build local pode falhar se consultas de catalogo no Supabase remoto estourarem timeout.
