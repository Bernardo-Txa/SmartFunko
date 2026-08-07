# Checklist de seguranca SmartFunkos

Revisado em 2026-08-07.

## Autenticacao e autorizacao

Admin:

- `/admin/*` exige admin/owner.
- `/api/v1/admin/*` exige `requireAdmin()` ou `requireOwner()`.
- Operacoes de pedidos, produtos, pre-vendas, acervo raro, rifas, cupons e relatorios nao devem aceitar acesso customer.

Cliente:

- `/conta/*` exige login.
- `/api/v1/me/*` exige usuario autenticado.
- Cliente so pode ler dados proprios.
- Cliente nao pode cancelar pre-venda pelo front.
- Cliente nao pode marcar pagamento, reembolso, envio ou sorteio.

Publico:

- `/api/v1/public/*` retorna somente dados publicos.
- Catalogo nao retorna custo, margem, CPF, telefone de outros clientes ou dados internos.
- Pedido publico com token, se usado, deve limitar informacoes sensiveis.

## Secrets

Nunca expor no browser:

- `SUPABASE_SERVICE_ROLE_KEY`;
- `INFINITEPAY_API_KEY`;
- `INFINITEPAY_WEBHOOK_SECRET`;
- qualquer chave privada de banco/gateway.

Nunca registrar secrets em logs.

## RLS Supabase

Tabelas que precisam de RLS coerente com o produto atual:

- `customers`;
- `profiles`;
- `v2_orders`;
- `v2_order_items`;
- `v2_payment_sessions`;
- `v2_payment_session_orders`;
- `v2_order_events`;
- `v2_payment_provider_events`;
- `preorder_items`;
- `preorder_item_images`;
- `preorder_reservations`;
- `preorder_reservation_items`;
- `rare_collectibles`;
- `rare_collectible_images`;
- `products` e imagens/variantes relacionadas;
- `raffle_campaigns`;
- `raffle_numbers`;
- `raffle_orders`;
- `payments`;
- `cash_entries`;
- `admin_action_logs`.

Leitura publica deve ficar limitada a produtos/collabs/pre-vendas/acervo/rifas publicos.

Mutacoes sensiveis devem passar por API server-side com validacao de usuario e service role, nunca direto do client anonimo.

## InfinitePay

- Webhook nao exige login, mas valida assinatura quando `INFINITEPAY_WEBHOOK_SECRET` estiver configurado.
- Eventos devem ser idempotentes.
- Redirect nao confirma pagamento sozinho.
- Pagamento com valor menor, ausente ou estado inesperado vai para `manual_review`.
- Pedido/sessao ja pago nao pode gerar baixa duplicada.
- Pre-venda so cria pedido V2 depois de pagamento confirmado.
- Rifa so confirma cotas depois de pagamento confirmado.

## Rifas

Pendencias antes de uso promocional amplo:

- revisao juridica/compliance;
- termos claros;
- auditoria de sorteio;
- logs de participantes e ganhadores;
- politica de reembolso/cancelamento.

Sorteio interno deve impedir comprador repetido entre posicoes premiadas.

## Uploads e imagens

- Escrita em storage deve ser admin/owner.
- Leitura publica apenas para buckets/arquivos destinados a exibicao.
- Proxy de imagem publica deve manter allowlist e bloquear SSRF.
- Validar tipo de conteudo quando buscar imagens externas.

## Checklist manual

- Visitante nao acessa `/admin`.
- Customer nao acessa `/admin`.
- Customer ve apenas seus pedidos/rifas/pre-vendas.
- Produto de collab nao aparece no catalogo geral.
- Acervo Raro nao aparece no catalogo geral/produtos gerais.
- Item livre WhatsApp nao cadastra produto.
- Evento InfinitePay duplicado nao duplica baixa.
- Cancelamento de pedido pago marca reembolso pendente.
- Admin consegue tratar status manualmente.

## Pendencias tecnicas

- Testes automatizados de autorizacao para rotas admin/customer.
- Testes automatizados de webhook duplicado e valor divergente.
- Tela/rotina completa para revisar `manual_review`.
- Rate limiting em endpoints sensiveis.
- Auditoria periodica de logs para CPF/telefone.
