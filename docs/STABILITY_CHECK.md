# Stability Check

Revisado em 2026-08-07.

Use este roteiro quando uma tela critica quebrar em dev/preview/producao.

## Rotas criticas

Publico:

- `/`
- `/catalogo`
- `/produto/[slug]`
- `/collabs`
- `/collabs/[slug]`
- `/pre-vendas`
- `/acervo-raro`
- `/acervo-raro/[slug]`
- `/rifas`
- `/rifas/[slug]`

Cliente:

- `/conta`
- `/conta/pedidos-v2`
- `/conta/rifas`
- `/conta/popflix`, apenas se PopFlix estiver ativo

Admin:

- `/admin/dashboard`
- `/admin/clientes`
- `/admin/produtos`
- `/admin/pre-vendas`
- `/admin/acervo-raro`
- `/admin/recebimento`
- `/admin/v2/pedidos`
- `/admin/cupons`
- `/admin/rifas`
- `/admin/relatorios`
- `/admin/relatorios/financeiro`

Webhooks/APIs:

- `POST /api/v1/webhooks/infinitepay`
- `POST /webhook-infinitepay`
- `POST /api/webhook-infinitepay`
- `/api/v1/admin/orders-v2/*`
- `/api/v1/me/orders-v2/*`
- `/api/v1/admin/preorders/*`
- `/api/v1/me/preorders/*`
- `/api/v1/admin/rare-collectibles/*`
- `/api/v1/admin/raffles/*`

## Logs a capturar

Para falha em Vercel/Supabase:

- request id;
- rota e metodo;
- status HTTP;
- mensagem server-side;
- stack trace;
- `code`, `details` e `hint` do Supabase;
- payload resumido, sem CPF/token/secret.

Nunca logar:

- service role key;
- token de usuario;
- segredo InfinitePay;
- payload completo com dados sensiveis;
- numero completo de cartao/Pix, se algum provedor retornar dado sensivel.

## Schema critico

Pedidos V2:

- `v2_order_competencies`
- `v2_orders`
- `v2_order_items`
- `v2_payment_sessions`
- `v2_payment_session_orders`
- `v2_order_events`
- `v2_payment_provider_events`
- `v2_shipments`

Pre-vendas:

- `preorder_items`
- `preorder_item_images`
- `preorder_reservations`
- `preorder_reservation_items`

Acervo Raro:

- `rare_collectibles`
- `rare_collectible_images`

Rifas:

- campanhas;
- numeros;
- pedidos/reservas;
- ganhadores/sorteio, conforme migrations atuais.

## Validacao de pedidos V2

1. Abrir `/admin/v2/pedidos`.
2. Confirmar que formulario nao corta na tela.
3. Criar pedido WhatsApp com vendedor.
4. Confirmar que item livre nao cria produto.
5. Abrir `/conta/pedidos-v2`.
6. Confirmar competencia agrupada.
7. Confirmar checkbox de mes selecionando pedidos nao pagos.
8. Confirmar que pedidos pagos nao sao selecionaveis.
9. Gerar link InfinitePay.
10. Confirmar pagamento por webhook/status em ambiente controlado.

## Validacao de produtos

1. Abrir `/admin/produtos`.
2. Alternar Produtos gerais, Piticas, NBA Brasil, Copag e Panini.
3. Confirmar layout sem redimensionamento estranho.
4. Confirmar que collab nao aparece em `/catalogo`.
5. Confirmar que Acervo Raro nao aparece em Produtos gerais.

## Validacao de recebimento

1. Abrir `/admin/recebimento`.
2. Buscar um produto solicitado por nome, numero do Funko, SKU ou codigo.
3. Confirmar resumo por produto com clientes e unidades.
4. Selecionar pedidos solicitados de um produto.
5. Marcar como recebido.
6. Confirmar que pedidos recebidos continuam visiveis no filtro correspondente.

## Validacao de pre-vendas

1. Abrir `/admin/pre-vendas`.
2. Cadastrar item com imagem e preco.
3. Abrir `/pre-vendas`.
4. Criar checkout.
5. Confirmar que pedido V2 so nasce depois do pagamento.
6. Conferir agregado admin de unidades pagas a pedir.

## Validacao de acervo raro

1. Abrir `/admin/acervo-raro`.
2. Criar/editar peca.
3. Controlar status.
4. Colocar/remover do slideshow.
5. Confirmar que exclusao/arquivamento funciona.
6. Abrir `/acervo-raro` e detalhe publico.

## Validacao de rifas

1. Abrir `/admin/rifas`.
2. Confirmar metricas do mes.
3. Confirmar ranking por comprador/cotas.
4. Reservar/pagar cotas em ambiente controlado.
5. Rodar sorteio interno.
6. Confirmar que comprador repetido nao ganha duas posicoes.

## Comandos

```bash
cd web
npm run lint
npm run build
```

Se `npm run build` falhar por timeout Supabase em pagina estatica, verificar primeiro consultas/dados remotos. Falhas de TypeScript continuam bloqueantes.
