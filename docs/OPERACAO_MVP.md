# Operacao MVP SmartFunko

## Fluxo principal

1. Cliente escolhe um produto no catalogo.
2. Cliente pode favoritar produtos, montar carrinho assistido, aplicar cupom e chamar a Smart Funkos pelo WhatsApp para suporte.
3. Admin entra no painel e cadastra ou seleciona o cliente.
4. Admin cria um pedido manual.
5. Admin seleciona o vendedor responsavel pela venda: Daniel ou Allana.
6. Admin adiciona itens ao pedido, escolhendo origem: pronta-entrega, encomenda nacional, importado, pre-venda ou leilao.
7. Se o produto ainda nao existe, admin usa `Criar novo produto` no combobox do pedido; o sistema cria produto + variante sob encomenda e ja seleciona o item.
8. Se o item for pronta-entrega, admin vincula uma unidade de estoque disponivel.
9. Sistema reserva a unidade de estoque.
10. Admin registra pagamento manual.
11. RPC `record_manual_payment` cria `payments`, cria `cash_entries`, atualiza status do pedido, registra historico e log no mesmo fluxo transacional.
12. Admin envia o link publico `/pedido/[orderNumber]?token=...` para o cliente.

## Tema

O tema escuro e o padrao. O toggle no header alterna para Light Mode, persiste a preferencia no navegador e aplica a classe `light`/`dark` no `html` antes da hidratacao. A troca usa as variaveis globais de design e nao altera regras operacionais.

## Checkout Assistido 1.0 — Aprovacao Admin + InfinitePay

Fluxo cliente:

1. Cliente monta o carrinho em `/carrinho`.
2. Clica em `Enviar pedido para análise`.
3. `POST /api/v1/me/orders` cria pedido `status = draft` e `review_status = under_review`.
4. Cliente e redirecionado para `/conta/pedidos/[orderNumber]`.
5. Enquanto estiver em analise, nao existe botao de pagamento.
6. Se recusado, o cliente ve `review_status = rejected` e o motivo informado pelo admin.
7. Se aprovado, o cliente ve `Pagar agora`, abrindo `payment_link_url` da InfinitePay.
8. A InfinitePay redireciona para o link publico `/pedido/[orderNumber]?token=...`.
9. Se o webhook ou a consulta server-side `payment_check` confirmar pagamento, o cliente ve pagamento confirmado.

Fluxo admin:

1. Admin acompanha pedidos em `/admin/pedidos`, com filtro `Análise`.
2. Pedidos em `under_review` aparecem destacados.
3. Em `/admin/pedidos/[id]`, o bloco `Análise do pedido` mostra status, motivo de recusa e link InfinitePay quando existir.
4. `Aprovar e gerar link` chama `POST /api/v1/admin/orders/[id]/approve-payment`.
5. `Recusar` chama `POST /api/v1/admin/orders/[id]/reject` e exige motivo.
6. `Regenerar link` chama `POST /api/v1/admin/orders/[id]/regenerate-payment-link`.
7. `Verificar pagamento` chama `POST /api/v1/admin/orders/[id]/check-payment` e consulta `payment_check` na InfinitePay.

Webhook:

- endpoint publico: `POST /api/v1/webhooks/infinitepay`;
- aliases aceitos: `POST /webhook-infinitepay` e `POST /api/webhook-infinitepay`;
- nao exige login;
- valida HMAC SHA-256 se `INFINITEPAY_WEBHOOK_SECRET` estiver configurado e o provedor enviar assinatura em header compatível;
- salva payload bruto em `payment_provider_events`;
- usa `order_nsu`, `invoice_slug` ou `transaction_nsu` para localizar o pedido;
- eventos duplicados sao ignorados por `unique(provider, event_id)`;
- pagamento aprovado chama a RPC `record_manual_payment` com metodo `pix`, `credit_card`, `debit_card` ou `infinitepay`;
- o financeiro/caixa continuam sendo atualizados pelo fluxo transacional existente.

Status de analise:

- `under_review`: Em análise;
- `approved_for_payment`: Aprovado;
- `awaiting_payment`: Aguardando pagamento;
- `rejected`: Recusado;
- `paid`: Pago;
- `cancelled`: Cancelado.

Configuracao InfinitePay:

- `INFINITEPAY_API_BASE_URL=https://api.checkout.infinitepay.io`;
- `INFINITEPAY_HANDLE=smartfunko`; se preenchido como `@smartfunko`, o backend remove o `@` antes de chamar a InfinitePay;
- `INFINITEPAY_API_KEY` fica somente server-side, se a conta exigir header de autenticacao;
- `INFINITEPAY_WEBHOOK_SECRET` fica somente server-side;
- `NEXT_PUBLIC_ENABLE_ASSISTED_CHECKOUT=true` controla o envio do carrinho;
- em Vercel, configurar as envs em Production/Preview e fazer redeploy.

Na InfinitePay, configure a webhook URL como:

```txt
https://seu-dominio.com/api/v1/webhooks/infinitepay
```

Para testar webhook em dev, envie um POST JSON para o endpoint com payload semelhante ao webhook aprovado documentado pela InfinitePay:

```json
{
  "invoice_slug": "abc123",
  "amount": 1000,
  "paid_amount": 1000,
  "capture_method": "pix",
  "transaction_nsu": "txn-dev-1",
  "order_nsu": "SF-20260610-120000-TEST",
  "receipt_url": "https://comprovante.example/test"
}
```

Para consulta manual, o backend usa:

```txt
POST https://api.checkout.infinitepay.io/payment_check
```

Com `handle = smartfunko`, `order_nsu = order_number` e `slug = payment_provider_reference` quando a fatura retornou `invoice_slug`.

Limitacoes:

- o redirect da InfinitePay nao confirma pagamento sozinho; ele apenas dispara consulta server-side se vier com `slug`, `transaction_nsu` ou `receipt_url`;
- nao ha checkout interno, captura de cartao, nota fiscal, frete automatico, split ou antifraude avancado;
- admin precisa aprovar antes de gerar cobranca;
- pagamentos manuais existentes continuam funcionando.

## Lotes / Importacao 1.0

Lotes agrupam itens de pedidos para compra nacional, importacao, collab ou outro agrupamento operacional. O modulo fica em `/admin/lotes` e e restrito a owner.

Fluxo:

1. Criar lote em `/admin/lotes/novo` informando nome, tipo, fornecedor opcional, descricao, custos estimados e notas.
2. Abrir o lote no detalhe.
3. Listar itens elegiveis por busca de pedido, cliente, produto ou SKU.
4. Adicionar o item de pedido ao lote.
5. Atualizar custo/status do item quando necessario.
6. Mudar status do lote conforme o fluxo operacional.
7. Receber o lote quando a compra chegar.

Status do lote:

- `draft`: rascunho;
- `open`: aberto para adicionar/organizar itens;
- `closed`: fechado para compra;
- `purchased`: comprado;
- `in_transit`: em transito;
- `received`: recebido;
- `cancelled`: cancelado.

Transicoes permitidas na UI: `draft -> open`, `open -> closed`, `closed -> purchased`, `purchased -> in_transit`, `in_transit -> received` e cancelamento em `draft/open/closed`.

Recebimento:

- `POST /api/v1/admin/purchase-batches/[id]/receive` marca o lote como `received`;
- itens do lote viram `received`;
- `order_items` vinculados tambem viram `received`;
- o fluxo grava `admin_action_logs`;
- nao cria `inventory_items` automaticamente nesta versao, porque o estoque por unidade exige SKU/localizacao por item fisico.

Custos:

- custos gerais do lote sao informativos;
- custos por item sao preenchidos manualmente;
- margem estimada simples = preco vendido - custo estimado;
- margem real simples = preco vendido - custo real;
- nao ha rateio complexo, multi-moeda ou imposto automatico nesta sprint.

## Rifas DEV 1.1

Rifas estao disponiveis somente quando `NEXT_PUBLIC_ENABLE_RAFFLES=true`. Com a flag desligada, links somem da navegacao, paginas publicas/customer mostram modulo desativado e APIs de rifa ficam bloqueadas. Com a flag ligada, as telas exibem aviso experimental de nao producao.

Fluxo admin:

1. Criar campanha em `/admin/rifas/nova`.
2. Conferir dados e numeros em `/admin/rifas/[id]`.
3. Abrir a campanha para reservas.
4. Pausar, fechar ou cancelar manualmente quando necessario.
5. Ver pedidos da campanha no detalhe admin.
6. Confirmar pagamento manual de reserva; o sistema marca numeros como comprados e cria entrada de caixa `category = raffle`.
7. Cancelar reserva nao paga ou expirar reservas vencidas para liberar numeros.
8. Fechar campanha e registrar ganhador manualmente informando numero comprado.

Fluxo cliente/publico:

1. Cliente acessa `/rifas` ou `/rifas/[slug]`.
2. Escolhe numeros disponiveis no `RaffleNumberPicker`.
3. Sistema cria reserva temporaria vinculada ao customer autenticado.
4. Cliente ve instrucoes de pagamento manual e acompanha em `/conta/rifas` e `/conta/rifas/[id]`, vendo numeros, status, total, reservado ate, pago em e resultado.

Limites da DEV 1.1:

- o fluxo academico/dev nao exige codigo de autorizacao, link de autorizacao, aceite legal ou integracao governamental para criar/abrir campanha;
- reserva expira por RPC acionada em listagens/reserva ou pelo endpoint/botao manual;
- confirmacao de pagamento e sempre manual;
- sorteio e resultado sao manuais;
- nao ha Pix automatico, cartao, gateway, checkout, cron real, notificacao, validacao legal automatizada, sorteio certificado ou reembolso de pedido pago de rifa nesta versao;
- nao usar em producao.

## APIs principais

- `GET /api/v1/admin/dashboard`
- `/admin/demanda` usa wishlist para ranking operacional de demanda, restrito a owner.
- `GET|POST /api/v1/admin/customers`
- `GET|PATCH /api/v1/admin/customers/[id]`
- `GET|POST /api/v1/admin/products`
- `POST /api/v1/admin/products/quick-create`
- `GET|PATCH /api/v1/admin/products/[id]`
- `POST /api/v1/admin/products/[id]/images`
- `PATCH /api/v1/admin/products/[id]/images/reorder`
- `PATCH /api/v1/admin/products/[id]/images/[imageId]/main`
- `DELETE /api/v1/admin/products/[id]/images/[imageId]`
- `POST /api/v1/admin/products/[id]/variants`
- `PATCH /api/v1/admin/product-variants/[id]`
- `GET|POST /api/v1/admin/suppliers`
- `GET|PATCH /api/v1/admin/suppliers/[id]`
- `GET|POST /api/v1/admin/inventory`
- `GET|PATCH /api/v1/admin/inventory/[id]`
- `POST /api/v1/admin/inventory/[id]/adjust`
- `GET /api/v1/admin/inventory/[id]/movements`
- `POST /api/v1/admin/inventory/[id]/reserve`
- `POST /api/v1/admin/inventory/[id]/release`
- `POST /api/v1/admin/inventory/[id]/mark-sold`
- `POST /api/v1/admin/inventory/[id]/mark-damaged`
- `POST /api/v1/admin/orders`
- `POST /api/v1/admin/orders/[id]/approve-payment`
- `POST /api/v1/admin/orders/[id]/check-payment`
- `POST /api/v1/admin/orders/[id]/reject`
- `POST /api/v1/admin/orders/[id]/regenerate-payment-link`
- `POST /api/v1/admin/orders/[id]/items`
- `GET /api/v1/admin/payments`
- `POST /api/v1/admin/payments/manual`
- `POST /api/v1/admin/payments/[id]/refund`
- `GET /api/v1/admin/cashflow`
- `GET /api/v1/admin/cashflow/summary`
- `GET /api/v1/admin/cashflow/pending`
- `POST /api/v1/admin/cashflow/manual-entry`
- `GET|POST /api/v1/admin/purchase-batches`
- `GET|PATCH /api/v1/admin/purchase-batches/[id]`
- `POST /api/v1/admin/purchase-batches/[id]/status`
- `GET|POST /api/v1/admin/purchase-batches/[id]/items`
- `PATCH|DELETE /api/v1/admin/purchase-batches/[id]/items/[itemId]`
- `GET /api/v1/admin/purchase-batches/eligible-items`
- `POST /api/v1/admin/purchase-batches/[id]/receive`
- `GET /api/v1/me`
- `GET|POST /api/v1/me/orders`
- `GET /api/v1/me/orders/[orderNumber]`
- `GET /api/v1/me/wishlist`
- `POST /api/v1/me/wishlist`
- `DELETE /api/v1/me/wishlist/[id]`
- `GET /api/v1/public/products`
- `GET /api/v1/public/products/[slug]`
- `GET /api/v1/public/orders/[orderNumber]?token=...`
- `GET /api/v1/public/suppliers`
- `GET /api/v1/public/suppliers/[slug]`
- `POST /api/v1/webhooks/infinitepay`
- `GET|POST /api/v1/admin/raffles`
- `GET|PATCH /api/v1/admin/raffles/[id]`
- `POST /api/v1/admin/raffles/[id]/open`
- `POST /api/v1/admin/raffles/[id]/publish` (alias legado de `/open`)
- `POST /api/v1/admin/raffles/[id]/pause`
- `POST /api/v1/admin/raffles/[id]/close`
- `POST /api/v1/admin/raffles/[id]/cancel`
- `GET /api/v1/admin/raffles/[id]/orders`
- `POST /api/v1/admin/raffles/[id]/draw`
- `POST /api/v1/admin/raffles/orders/[orderId]/confirm-payment`
- `POST /api/v1/admin/raffles/orders/[orderId]/cancel`
- `POST /api/v1/admin/raffles/expire-reservations`
- `GET /api/v1/public/raffles`
- `GET /api/v1/public/raffles/[slug]`
- `GET /api/v1/public/raffles/[slug]/numbers`
- `POST /api/v1/me/raffles/[slug]/reserve`
- `GET /api/v1/me/raffles/orders`
- `GET /api/v1/me/raffles/orders/[id]`

## Rotas publicas comerciais

- `/`: home premium com hero, atalhos para o catalogo unico, universos, fornecedores, fluxo assistido e confianca.
- `/catalogo`: catalogo principal unico da Smart Funkos, com busca, categoria, linha, franquia e ordenacao.
- `/pronta-entrega`, `/pre-venda`, `/specials`, `/novidades` e `/encomendas`: redirects para `/catalogo` para preservar links antigos sem criar catalogos concorrentes.
- `/fornecedores`: lista collabs/fornecedores ativos.
- `/fornecedores/[slug]`: catalogo separado de uma collab/fornecedor, com filtro implicito pelo slug.
- `/carrinho`: carrinho local para intencao de compra assistida, com cupom de desconto, envio de pedido para analise e WhatsApp como atendimento.
- `/conta/wishlist`: favoritos do cliente autenticado.
- `/conta/clube`: Clube Smart Funkos com pontos, niveis longos, extrato e ranking mensal quando `NEXT_PUBLIC_ENABLE_REWARDS=true`.
- `/rifas` e `/rifas/[slug]`: rifas experimentais quando a flag esta ligada.
- `/conta/rifas` e `/conta/rifas/[id]`: acompanhamento de rifas do cliente quando a flag esta ligada.

## Regras implementadas

- Rotas internas usam `owner` como role operacional principal.
- A role `admin` fica reservada/legada; `requireAdmin()` e alias de `requireOwner()` na aplicacao.
- Login e unico em `/login`; `/admin/login` redireciona para `/login?next=/admin/dashboard`.
- A sessao Supabase SSR e renovada em `web/src/proxy.ts`, seguindo a convencao ativa do Next 16 no projeto.
- Rotas `/me` exigem usuario autenticado e cliente vinculado.
- Pagamento manual usa a RPC `record_manual_payment`, chamada somente pelo backend com service role.
- Pagamento manual gera pagamento, entrada de caixa, historico de status e log administrativo de forma transacional.
- A baixa manual bloqueia valor maior que o saldo pendente e bloqueia pedidos `cancelled` ou `refunded`.
- Estorno manual usa `refund_manual_payment`, exige justificativa, marca o pagamento como `refunded`, cria saida de caixa `refund`, atualiza status do pedido e grava log.
- Estorno parcial ainda nao esta disponivel; o fluxo atual cobre estorno total.
- `/admin/pagamentos` lista pagamentos reais, filtros, resumo do periodo, acao de copiar resumo e estorno quando permitido.
- `/admin/caixa` lista `cash_entries` reais, filtros, resumo, despesas e ajustes manuais restritos a owner.
- `/admin/relatorios/financeiro` mostra recebido por periodo, a receber, reembolsos, taxas, liquido, pedidos por situacao financeira, vendas por vendedor, vendas por origem, vendas por metodo e caixa por categoria.
- Reserva de estoque impede reservar unidade que nao esteja `available`.
- Cancelamento de pedido libera unidade reservada.
- Estoque 2.0 registra `inventory_movements` por unidade fisica para criacao, reserva, liberacao, venda, cancelamento, recebimento, avaria, indisponibilidade, ajuste de custo, mudanca de localizacao e ajuste manual.
- Ajuste manual de estoque e restrito a owner, exige justificativa e tambem grava `admin_action_logs`.
- Reserva de estoque exige `order_item_id`; a unidade fica com `status = reserved` e `reserved_for_order_item_id` preenchido.
- Liberacao de estoque limpa `reserved_for_order_item_id` e registra o pedido/item original no movimento.
- Unidades `sold`, `reserved`, `damaged` e `unavailable` nao aparecem como disponiveis para reserva.
- Item vendido nao volta para disponivel por fluxo automatico; qualquer retorno precisa de ajuste manual owner com justificativa.
- Link publico valida `order_number + public_token` e nao expoe dados internos.
- `/conta/pedidos` usa pedidos reais do cliente vinculado ao login e nao mostra pedidos de outros clientes.
- `/conta/pedidos/[orderNumber]` mostra dados seguros do pedido do proprio cliente, incluindo itens, status, pagamentos e observacoes publicas.
- `/api/v1/me/orders` e `/api/v1/me/orders/[orderNumber]` retornam pedidos sanitizados, sem `internal_notes`, custos, margem, logs ou token publico.
- `POST /api/v1/me/orders` cria pedido em analise para o proprio cliente autenticado; precos e variantes sao revalidados no servidor.
- `POST /api/v1/me/coupons/validate` valida cupom do carrinho com precos recalculados no servidor.
- `/admin/cupons` permite criar, ativar e desativar cupons; cupons aplicados gravam `orders.coupon_id`, `orders.coupon_code` e `orders.discount`.
- Clube Smart Funkos 1.0 fica atras de `NEXT_PUBLIC_ENABLE_REWARDS`.
- Pontos do clube sao registrados em `reward_point_ledger` quando um pagamento manual ou InfinitePay e confirmado; o calculo inicial e 1 ponto por R$ 1 pago.
- Estorno de pagamento gera lancamento `reverse` no extrato de pontos e nao reduz `lifetime_points`, portanto nao rebaixa nivel.
- Niveis longos usam `lifetime_points`: Visitante 0, Colecionador Iniciante 1.000, Caçador de Exclusivos 3.000, Mestre dos Funkos 7.500, Grail Hunter 15.000, Elite Smart 30.000, Lenda Smart 60.000 e Hall da Fama 100.000.
- `/admin/clube` lista clientes do clube, pontos atuais, lifetime e nivel.
- `/admin/clube/ranking` recalcula e acompanha o Ranking Mensal Top 3 Pedidos, baseado no valor de cada pedido individual pago no mes.
- Ganhadores do ranking possuem controle de brinde por status `pending`, `delivered` ou `cancelled`.
- Cliente nao consegue pagar antes da aprovacao admin, porque o link InfinitePay so e gerado em `awaiting_payment`.
- A consulta `payment_check` e server-side; se `paid = true`, gera pagamento e caixa pelo mesmo fluxo financeiro do webhook.
- `payment_provider_events` guarda eventos de gateway para auditoria e idempotencia; segredos da InfinitePay nunca sao enviados ao client.
- Status internos continuam em ingles no banco, mas badges e textos de UI usam `web/src/lib/status-labels.ts`.
- Fornecedores/collabs usam `suppliers`; publicos ativos aparecem em `/fornecedores` e `/fornecedores/[slug]`.
- O catalogo principal nao expoe filtro de fornecedor nem filtros principais de pronta-entrega/pre-venda/encomenda/specials.
- Pronta-entrega, pre-venda, encomenda e special sao atributos/badges do produto.
- Catálogos separados sao reservados para collabs/fornecedores, por exemplo `/fornecedores/piticas`, `/fornecedores/copag` e `/fornecedores/panini`.
- Produtos sao criados em `/admin/produtos/novo` e editados em `/admin/produtos/[id]`, incluindo fornecedor, imagem, descricao, status e variantes.
- Pedidos em `/admin/pedidos/novo` e `/admin/pedidos/[id]` permitem criar produto rapido no combobox de produto; a variante nasce `national/order_only`, sem criar ou reservar estoque automaticamente.
- Pedidos possuem vendedor (`daniel`/`allana`) e itens podem usar origem `auction` exibida como Leilao.
- `/admin/produtos/[id]` mostra resumo simples de estoque do produto por status e link para `/admin/estoque`.
- `/admin/estoque` mostra cards reais de total, disponiveis, reservadas, vendidas, em transito, avariadas, indisponiveis, valor estimado e valor disponivel, alem de filtros por produto/SKU/status/localizacao e links para detalhe por unidade.
- `/admin/estoque/[id]` mostra dados da unidade, custos, pedido reservado, historico de movimentos e acoes manuais permitidas para owner.
- `/admin/produtos/[id]` possui a secao "Imagens do produto" para upload real via Supabase Storage, preview, definicao de imagem principal, remocao da galeria e reordenacao por botoes.
- O bucket de imagens e `product-images`, publico para leitura e restrito a owner/admin para escrita.
- Upload aceita `image/jpeg`, `image/png`, `image/webp` e `image/avif`, com limite de 5MB por arquivo.
- `products.main_image_url` continua aceitando URL manual e tem prioridade sobre a primeira imagem de `product_images`.
- Catalogo, home, ProductCard e pagina de produto usam `main_image_url`, depois `product_images` ordenadas por `sort_order`, depois fallback visual.
- Mock do catalogo so e permitido fora de `production`.
- Carrinho assistido persiste apenas no navegador e nao grava pedido, pagamento, frete ou reserva de estoque.
- Wishlist exige login e customer vinculado; customer so ve/remove a propria lista.
- Admin de demanda usa dados reais de `wishlist_items` para ranking por produto, franquia, fornecedor e categoria.
- Lotes usam `purchase_batches` e `purchase_batch_items`; clientes e publico nao acessam esses dados.
- Item de pedido pode ser rastreado para lote na tela `/admin/pedidos/[id]`.
- Rifas DEV 1.1 ficam atras de `NEXT_PUBLIC_ENABLE_RAFFLES`.
- `/admin/rifas` permite listar, criar, abrir, pausar, fechar, cancelar, ver pedidos, confirmar pagamento, cancelar reserva e registrar ganhador manual.
- Rifas DEV 1.1 nao dependem de autorizacao governamental no fluxo principal academico/dev; campos legais existentes sao opcionais/legados.
- `/rifas/[slug]` mostra premio, preco, progresso, regras e seletor de numeros para campanhas abertas.
- Reserva de numeros e temporaria; pagamento confirmado manualmente muda os numeros para comprados.
- Sorteio manual exige campanha encerrada e numero comprado.

## Variaveis necessarias

No `web/.env.local`:

```bash
NEXT_PUBLIC_SITE_URL=http://localhost:3000
NEXT_PUBLIC_WHATSAPP_NUMBER=5511999999999
NEXT_PUBLIC_ENABLE_RAFFLES=true
NEXT_PUBLIC_SUPABASE_URL=https://project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
```

## Como testar o fluxo

1. Aplicar migrations do Supabase.
2. Criar um usuario pelo cadastro ou pelo Supabase Auth.
3. Ajustar o role do profile para `owner` no Supabase.
4. Entrar em `/login`; owners sao redirecionados para `/admin/dashboard`.
5. Criar cliente via `POST /api/v1/admin/customers`.
6. Criar pedido via `POST /api/v1/admin/orders`.
7. Selecionar vendedor Daniel ou Allana.
8. Criar produto rapido pelo combobox do pedido, confirmar selecao automatica e adicionar ao pedido.
9. Adicionar item com origem Leilao via `POST /api/v1/admin/orders/[id]/items`.
10. Registrar pagamento parcial via `POST /api/v1/admin/payments/manual`.
11. Conferir `payments`, `cash_entries`, `order_status_history` e `admin_action_logs`.
12. Registrar segundo pagamento ate quitar o pedido.
13. Tentar pagamento maior que saldo pendente e confirmar bloqueio.
14. Estornar pagamento via `POST /api/v1/admin/payments/[id]/refund` com justificativa.
15. Conferir saida de caixa `refund`, status do pedido e log administrativo.
16. Abrir `/admin/dashboard`, `/admin/pedidos`, `/admin/pagamentos`, `/admin/caixa` e `/admin/relatorios/financeiro`.
17. Abrir `/fornecedores`, `/fornecedores/piticas`, `/fornecedores/copag` e `/fornecedores/panini`.
18. Editar produto em `/admin/produtos/[id]`, trocar fornecedor/imagem/preco e conferir em `/fornecedores/piticas`.
19. Em `/admin/produtos/[id]`, enviar imagem valida na secao "Imagens do produto".
20. Testar rejeicao de arquivo acima de 5MB e de arquivo que nao seja imagem aceita.
21. Definir a imagem enviada como principal e conferir card no catalogo/home e galeria em `/produto/[slug]`.
22. Reordenar imagens e conferir a ordem da galeria publica.
23. Remover uma imagem e confirmar que o fallback por `main_image_url`, primeira imagem restante ou `ProductArtwork` continua funcionando.
24. Criar unidade de estoque e conferir movimento `created`.
25. Ajustar status, localizacao e custo com justificativa e conferir movimentos `manual_adjustment`, `location_change` e `cost_adjustment`.
26. Criar pedido com item pronta-entrega vinculado a uma unidade e conferir movimento `reserved`.
27. Cancelar pedido e conferir estoque liberado com movimento `cancelled`.
28. Marcar unidade como avariada e conferir movimento `damaged`.
29. Abrir `/admin/estoque` e `/admin/estoque/[id]`.
30. Confirmar que cliente nao acessa endpoints admin financeiros e de estoque.
31. Criar lote em `/admin/lotes/novo`.
32. Abrir `/admin/lotes`, filtrar e acessar o detalhe.
33. Listar itens elegiveis, adicionar item de pedido e tentar adicionar o mesmo item de novo para confirmar erro amigavel.
34. Atualizar custos/status do item do lote.
35. Mudar status `draft -> open -> closed -> purchased -> in_transit`.
36. Receber o lote e conferir itens como `received`.
37. Conferir `admin_action_logs`.
38. Abrir o pedido admin e conferir o link pedido -> lote.
39. Confirmar que cliente nao acessa endpoints/telas admin de lotes.
40. Com `NEXT_PUBLIC_ENABLE_RAFFLES=true`, criar rifa em `/admin/rifas/nova`.
41. Abrir a rifa, reservar numeros em `/rifas/[slug]` e conferir `/conta/rifas`.
42. Confirmar pagamento no detalhe admin e conferir caixa com categoria `raffle`.
43. Fechar a rifa, registrar ganhador manual e conferir resultado na conta do cliente.
44. Abrir `/pedido/[orderNumber]?token=...`.
45. Entrar como cliente e conferir `/conta/pedidos` e `/conta/pedidos/[orderNumber]`.
46. Testar token errado no link publico.

## Contratos para app futuro

O app Flutter nao faz parte desta V1. Estes contratos devem ser mantidos estaveis para uso futuro:

- `GET /api/v1/me`: exige login; resposta `{ data: { user, profile, customer } }`.
- `GET /api/v1/me/orders`: exige login e customer vinculado; resposta `{ data: Order[] }`, apenas pedidos do customer autenticado.
- `GET /api/v1/me/orders/[orderNumber]`: exige login e customer vinculado; resposta `{ data: Order }`, apenas se o pedido pertencer ao customer autenticado.
- `GET /api/v1/me/wishlist`: exige login e customer vinculado; resposta `{ data: WishlistItem[] }`.
- `POST /api/v1/me/wishlist`: exige login; body com produto/variante conforme service; resposta `{ data: WishlistItem }`.
- `DELETE /api/v1/me/wishlist/[id]`: exige login; remove item do proprio customer.
- `GET /api/v1/public/products`: publico; aceita `q`, `category`, `subcategory`, `franchise`, `supplier`, `filter`, `sort`, `page`, `pageSize`; resposta `{ data: Product[], meta }`.
- `GET /api/v1/public/products/[slug]`: publico; resposta `{ data: Product }` ou 404.
- `GET /api/v1/public/suppliers`: publico; resposta `{ data: Supplier[] }` somente com suppliers `active`.
- `GET /api/v1/public/suppliers/[slug]`: publico; resposta `{ data: Supplier }` somente se `active`.
- `GET /api/v1/public/raffles`: publico com flag ligada; resposta `{ data: RaffleCampaign[] }`.
- `GET /api/v1/public/raffles/[slug]`: publico com flag ligada; resposta `{ data: RaffleCampaign }`.
- `GET /api/v1/public/raffles/[slug]/numbers`: publico com flag ligada; resposta `{ data: RaffleNumber[] }`.
- `POST /api/v1/me/raffles/[slug]/reserve`: autenticado; body `{ numbers: number[] }`; cria reserva temporaria.
- `GET /api/v1/me/raffles/orders`: autenticado; lista pedidos de rifa do customer.
- `GET /api/v1/me/raffles/orders/[id]`: autenticado; detalhe de pedido de rifa do customer.

Pedidos retornados em `/me` sao sanitizados: podem conter numero, status, cliente, itens, pagamentos, totais e observacoes publicas; nao devem conter observacoes internas, custos, margem, logs administrativos, token publico ou IDs operacionais desnecessarios.

## Fora da V1

- Pix automatico.
- Checkout proprio.
- Lotes internacionais completos com multi-moeda, imposto automatico, frete/rateio complexo e tracking externo.
- Wishlist avancada.
- Notificacoes automaticas.
- Flutter mobile.
- Leiloes.
- BI avancado.
- Integracao fiscal/frete.
- Gamificacao / Clube Smart Funkos.
