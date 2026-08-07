# Divida tecnica SmartFunkos

Revisado em 2026-08-07.

## Legado V1

O codigo ainda contem modulos da primeira versao:

- estoque;
- lotes;
- fornecedores antigos;
- pagamentos/caixa separados;
- Smart Clube/rewards;
- checkout assistido antigo;
- pedidos V1.

Eles nao devem voltar para a navegacao principal sem decisao explicita. Antes de reaproveitar qualquer parte, revisar se conflita com Pedidos V2, Produtos 2.0, Pre-vendas ou Acervo Raro.

## Pedidos V2

Pendencias:

- criar suite automatizada para status de aprovacao, pagamento e operacao;
- testar pagamento parcial com concorrencia;
- testar webhook duplicado em sessao com varios pedidos;
- testar fluxo de recebimento por produto, numero e SKU;
- criar tela/rotina para revisar `manual_review`;
- documentar playbook de reembolso manual;
- decidir quando e como remover rotas V1 do uso operacional.

## Produtos 2.0

Pendencias:

- reforcar no backend que produto de collab nao aparece no catalogo geral;
- reforcar que Acervo Raro nao entra em Produtos gerais;
- revisar migracao/limpeza de produtos criados no pedido;
- padronizar upload de imagem em vez de depender de URL externa;
- criar validacoes contra duplicidade por SKU/nome quando fizer sentido.

## Pre-vendas

Pendencias:

- testar idempotencia de pagamento criando pedido V2 uma unica vez;
- tratar cancelamento admin com reembolso manual;
- exibir historico completo de reservas pagas;
- decidir prazo/expiracao de pre-venda;
- automatizar notificacao ao cliente quando pedido V2 for criado.

## Acervo Raro

Pendencias:

- revisar exclusao fisica vs arquivamento;
- melhorar upload/ordem de multiplas imagens;
- criar auditoria de mudanca de status;
- separar com clareza itens publicados, reservados, vendidos e arquivados;
- validar SEO/OG das pecas mais importantes.

## Rifas

Pendencias antes de uso promocional amplo:

- revisao juridica/compliance;
- termos e aceite;
- auditoria do sorteio;
- logs fortes de ganhadores;
- rotina de reembolso/cancelamento;
- testes de concorrencia em reserva de cotas;
- revisao de eventos InfinitePay em `manual_review`.

## Relatorios

Pendencias:

- exportacao CSV/PDF se voltar a ser necessario;
- integracao oficial de envio WhatsApp, caso a operacao queira envio automatico real;
- conciliacao financeira automatica;
- filtros adicionais sem abandonar competencia como filtro principal;
- testes de agregacao por competencia.

## InfinitePay

Pendencias:

- confirmar formato real de assinatura HMAC na conta;
- revisar todos os status reais enviados pelo provedor;
- rotina admin de reprocessamento seguro;
- observabilidade de falhas de link/webhook;
- expiracao/recriacao controlada de links antigos.

## Responsividade

Pendencias:

- Playwright visual para desktop/mobile;
- checagem automatica de overflow horizontal;
- padrao reutilizavel para tabelas admin responsivas;
- revisao completa nos dois temas.

## Mobile

O mobile e secundario na versao atual.

Pendencias:

- alinhar app Flutter aos Pedidos V2;
- alinhar app Flutter a Pre-vendas e Acervo Raro se o mobile voltar ao escopo;
- remover referencias a fluxos V1 quando forem substituidos;
- testar Auth/token com ambiente real.

## Proximas boas melhorias

- testes de services criticos;
- seed/demo controlada para Preview;
- script de sanity check de migrations;
- rotina de limpeza de dados de teste;
- observabilidade minima para erros Supabase/InfinitePay;
- documentar processo de deploy/rollback.
