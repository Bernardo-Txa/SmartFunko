# SmartFunko

Projeto da Smart Funkos.

## Objetivo

Construir uma operacao assistida por tecnologia para vendas de colecionaveis.

Na V1, as vendas sao assistidas pelo site/admin, com WhatsApp preservado como suporte, e o sistema controla:

- catalogo;
- clientes;
- pedidos;
- estoque;
- pagamentos manuais;
- caixa;
- acompanhamento do cliente.

## Documentacao inicial

- [MVP Operacional V1](./MVP_OPERACIONAL_V1.md)
- [Operacao do MVP](./docs/OPERACAO_MVP.md)
- [BI SmartFunko](./docs/BI.md)
- [Variaveis de ambiente](./docs/ENV_VARS.md)
- [Divida tecnica](./docs/TECH_DEBT.md)
- [Documento Tecnico Inicial](./Smart%20Funkos%20-%20Documento%20T%C3%A9cnico%20Inicial.pdf)

## Estrutura

- `web/`: site publico, area do cliente, admin e API Next.js.
- `supabase/`: migrations, seed e policies.
- `MVP_OPERACIONAL_V1.md`: escopo validado da primeira versao.

## Direcao da V1

Cliente escolhe no site, envia o carrinho para analise, paga por link apos aprovacao e acompanha pela conta. A Smart Funkos controla tudo pelo admin.

## Camada premium de loja

A camada publica agora organiza descoberta e intencao de compra por cima do core operacional:

- home premium com hero, vitrines comerciais, universos, fornecedores/collabs, fluxo assistido e bloco de confianca;
- mega menu por universos/categorias apontando para o catalogo principal;
- `/catalogo` como catalogo principal unico da Smart Funkos, com busca, categoria, linha, franquia e ordenacao;
- pronta-entrega, pre-venda, encomenda e special aparecem como atributos/badges do produto, nao como catalogos separados;
- catálogos separados ficam reservados para collabs/fornecedores em `/fornecedores` e `/fornecedores/[slug]`;
- pagina de produto com galeria, badges comerciais, CTA "Tenho interesse", favoritos, carrinho assistido e relacionados;
- cards de produto com favoritos e carrinho em acoes compactas, sem transformar o card em checkout;
- favoritos reais em cards, produto e `/conta/wishlist`, usando `/api/v1/me/wishlist`;
- carrinho assistido em `/carrinho`, persistido no navegador, com envio de pedido para análise, cupom de desconto e WhatsApp como atendimento;
- admin de demanda em `/admin/demanda`, restrito a owner, com ranking real de wishlist.
- Clube Smart Funkos em `/conta/clube` e `/admin/clube`, atras de `NEXT_PUBLIC_ENABLE_REWARDS`, com pontos, niveis longos e Ranking Mensal Top 3 Pedidos.
- BI gerencial em `/admin/relatorios` e `/admin/bi`, com cards, graficos, filtros e tabelas de vendas, caixa, rifas, cupons e ranking mensal.
- O ranking mensal aberto e calculado a partir dos pedidos pagos; ao fechar/awardar, passa a funcionar como snapshot salvo e so recalcula por acao explicita do admin.

O carrinho assistido nao reserva estoque automaticamente, nao calcula frete e nao cobra pagamento antes da aprovacao humana. Quando o cliente envia o carrinho, o sistema cria um pedido `review_status = under_review`; o admin aprova/recusa e, se aprovar, gera o link InfinitePay. Cupons criados em `/admin/cupons` podem ser aplicados antes do envio.

## Checkout Assistido 1.0 — InfinitePay

O Checkout Assistido 1.0 permite que o cliente envie um carrinho para analise. O pedido nasce em `review_status = under_review` e `status = draft`. O admin revisa em `/admin/pedidos/[id]` e pode:

- aprovar e gerar link InfinitePay;
- recusar com motivo visivel ao cliente;
- regenerar link quando o pedido esta aguardando pagamento.

Ao aprovar, o pedido passa para `review_status = awaiting_payment`, `status = pending_payment`, salva `payment_provider = infinitepay`, `payment_link_url` e `payment_provider_reference`. O cliente ve o botao `Pagar agora` em `/conta/pedidos/[orderNumber]`.

O webhook `POST /api/v1/webhooks/infinitepay` registra o payload bruto em `payment_provider_events`, processa de forma idempotente e, quando o pagamento e aprovado, chama a baixa financeira existente para criar `payments`, criar `cash_entries` e marcar o pedido como pago. O redirect da InfinitePay volta para o link publico `/pedido/[orderNumber]?token=...`, evitando depender da sessao do cliente, e tambem consulta `payment_check` quando recebe `slug`/`transaction_nsu`. O admin ainda pode consultar pelo botao `Verificar pagamento`.

Na area do cliente, pedidos recusados, cancelados, reembolsados ou ainda em analise nao entram no card `Pendente a pagar` e nao destacam link de pagamento. O saldo pendente considera apenas pedidos cobraveis e calcula somente o restante depois dos pagamentos pagos.

Limitacoes desta sprint:

- nao ha checkout interno com cartao;
- nao ha captura de cartao pela SmartFunko;
- nao ha frete automatico, nota fiscal, split, antifraude avancado ou parcelamento customizado;
- pagamentos manuais, atendimento por WhatsApp, caixa e financeiro existentes continuam preservados.

## Tema claro/escuro

O Dark Mode continua sendo o padrao da aplicacao. O header possui um toggle de tema que alterna entre Dark e Light, persiste a escolha no navegador com `localStorage` e aplica a classe no `html` antes da hidratacao para evitar flash visual.

O Light Mode usa as mesmas variaveis de design do tema escuro e cobre a base de layout, header, menus, cards e formularios principais. Refinos visuais pontuais podem continuar em sprints futuras sem alterar o fluxo operacional.

## Conta do Cliente 1.1

`/conta` mostra resumo do cadastro e permite que o cliente autenticado edite dados basicos do proprio customer:

- nome;
- telefone;
- CPF;
- Instagram.

O endpoint `PATCH /api/v1/me` usa o usuario logado para localizar o customer vinculado e nao aceita `customerId` vindo do cliente. O nome tambem atualiza `profiles.name` para manter o header/conta consistentes. O e-mail de login aparece como somente leitura; alteracao de e-mail ainda depende de atendimento/fluxo seguro futuro.

## Estoque 2.0

O estoque e rastreado por unidade fisica em `inventory_items` e cada mudanca relevante gera `inventory_movements`.

- criacao de unidade registra movimento `created`;
- reserva exige `order_item_id` e registra `reserved`;
- cancelamento de pedido libera unidade reservada e registra `cancelled`;
- liberacao manual registra `released`;
- venda, avaria, indisponibilidade, recebimento, mudanca de localizacao e ajuste de custo ficam no historico da unidade;
- ajuste manual exige owner e justificativa, e tambem grava `admin_action_logs`;
- custos e movimentos nao sao expostos em rotas publicas ou `/me`.

O admin operacional fica em `/admin/estoque` e o detalhe por unidade em `/admin/estoque/[id]`.

## Financeiro 2.0

O pagamento manual agora passa pela RPC Postgres `record_manual_payment`, chamada pelo backend com service role. A baixa cria `payments`, cria `cash_entries`, atualiza o status financeiro do pedido, registra `order_status_history` quando houver mudanca e grava `admin_action_logs` no mesmo fluxo transacional.

- pagamento maior que o saldo pendente e bloqueado;
- pedidos `cancelled` e `refunded` nao recebem nova baixa manual;
- `payments.amount` guarda valor bruto, `fee_amount` guarda taxa e `net_amount` guarda o liquido;
- `cash_entries` de venda usam `type = income`, `category = sale` e `amount = net_amount`;
- estorno manual usa `refund_manual_payment`, exige justificativa, marca o pagamento como `refunded`, cria saida de caixa `category = refund`, atualiza status do pedido e grava log;
- estorno parcial ainda nao esta disponivel;
- despesas e ajustes manuais de caixa sao restritos a owner e exigem descricao.

As telas principais sao `/admin/pagamentos`, `/admin/caixa` e `/admin/relatorios/financeiro`. O relatorio mostra recebido por periodo, a receber, reembolsos, taxas, liquido, pedidos por situacao financeira, vendas por metodo e caixa por categoria.

Financeiro 2.0 preserva baixa manual e tambem recebe pagamentos confirmados pelo Checkout Assistido InfinitePay. Frete automatico, nota fiscal e checkout proprio interno seguem fora do escopo.

## BI 1.1

O BI gerencial fica em `/admin/relatorios` e tem alias em `/admin/bi`.

Regras principais:

- receita confirmada vem de `cash_entries` de venda ligados a pedidos validos e pagos;
- pedidos `under_review`, `rejected`, `cancelled` e `refunded` ficam fora da receita confirmada;
- receita de rifas usa `raffle_orders` pagos como fonte unica do BI;
- caixa continua vindo de `cash_entries`;
- filtros cobrem periodo, vendedor, origem e metodo;
- graficos e tabelas usam agregados do servidor e Recharts no client.

## Lotes / Importacao 1.0

O modulo de lotes organiza compras nacionais, importacoes, collabs e outros agrupamentos operacionais em `/admin/lotes`.

- `purchase_batches` guarda codigo, nome, tipo, fornecedor, status, timestamps e custos estimados/reais simples;
- `purchase_batch_items` vincula itens de pedido ao lote sem alterar `order_items`;
- itens elegiveis excluem cancelados e itens ja vinculados a lotes ativos;
- status do lote seguem `draft -> open -> closed -> purchased -> in_transit -> received`, com cancelamento permitido em `draft/open/closed`;
- ao marcar recebido, o lote e os itens do lote viram `received`, e `order_items` vinculados tambem recebem status `received`;
- custos por item sao manuais e a margem simples e calculada como preco vendido menos custo estimado/real;
- a tela de pedido admin mostra o lote vinculado em cada item, com link para `/admin/lotes/[id]`.

Nesta versao nao ha multi-moeda, imposto automatico, rateio complexo de frete/taxa, integracao com fornecedor, tracking externo, nota fiscal, Pix, checkout ou baixa financeira automatica.

## Rifas DEV 1.2 — Pagamento InfinitePay

Rifas continuam como modulo experimental protegido por feature flag. Ative com:

```bash
NEXT_PUBLIC_ENABLE_RAFFLES=true
```

Quando a flag esta desligada, links somem da navegacao, paginas publicas/customer mostram modulo desativado e APIs de rifa retornam bloqueio. Quando ligada, as telas mostram aviso experimental academico/dev.

Fluxos disponiveis:

- admin em `/admin/rifas`, `/admin/rifas/nova` e `/admin/rifas/[id]`;
- publico em `/rifas` e `/rifas/[slug]`;
- cliente em `/conta/rifas` e `/conta/rifas/[id]`;
- criacao de campanha gera numeros no intervalo configurado;
- abertura, pausa, fechamento e cancelamento sao manuais pelo admin;
- abertura nao exige codigo/link de autorizacao, aceite legal ou integracao governamental no fluxo DEV;
- cliente reserva numeros temporariamente pela tela publica;
- reserva cria `raffle_order.status = pending_payment` e tenta gerar link InfinitePay automaticamente;
- o `order_nsu` enviado para a InfinitePay usa `RAFFLE-{raffle_order_id}`;
- cliente ve botao `Pagar agora` em `/rifas/[slug]`, `/conta/rifas` e `/conta/rifas/[id]` quando `payment_link_url` existir;
- se `INFINITEPAY_HANDLE`/base URL nao estiverem configurados ou a geracao falhar, a reserva continua pendente e o atendimento manual permanece como fallback;
- webhook `POST /api/v1/webhooks/infinitepay` identifica rifas pelo prefixo `RAFFLE-`, registra evento em `payment_provider_events` e confirma a rifa de forma idempotente;
- pagamento aprovado marca `raffle_orders.status = paid`, `payment_status = paid`, numeros como `sold`, cria entrada de caixa `category = raffle` e gera pontos no Clube via `source_type = raffle_order`;
- pagamento apos expiracao entra em `manual_review` e nao vende numeros liberados automaticamente;
- pagamento tambem pode ser confirmado manualmente pelo admin, gerando entrada de caixa `category = raffle`;
- reserva nao paga pode expirar ou ser cancelada manualmente, liberando os numeros;
- sorteio e registro de ganhador sao manuais, aceitando apenas numero comprado em campanha encerrada ou esgotada.

Endpoints admin adicionais:

- `POST /api/v1/admin/raffles/orders/[orderId]/generate-payment-link`;
- `POST /api/v1/admin/raffles/orders/[orderId]/sync-payment`.

Este modulo ainda nao esta pronto para producao: nao implementa validacao legal automatizada, cron real, antifraude, sorteio certificado, notificacoes automaticas, reembolso automatico, nota fiscal, frete ou checkout proprio interno.

Campos de autorizacao permanecem opcionais/legados no banco para uso futuro, mas nao bloqueiam criacao ou abertura no contexto academico/dev.

## Pedido com produto rapido

No admin de pedidos, o combobox de produto/variante permite buscar por nome ou SKU e mostra SKU, preco e status. Em `/admin/pedidos/novo` e no detalhe `/admin/pedidos/[id]`, a opcao `Criar novo produto` abre um modal simples para cadastrar nome, preco, SKU opcional, categoria, subcategoria, franquia, URL de imagem e observacao.

O endpoint `POST /api/v1/admin/products/quick-create` e restrito a admin/owner. Ele cria um produto ativo, gera slug seguro, cria ou reaproveita franquia por nome, cria uma variante `national` com status `order_only`, nao cria estoque, nao reserva estoque e retorna a opcao pronta para o dropdown selecionar automaticamente. O produto passa a aparecer tambem em `/admin/produtos`.

## Como rodar localmente

```bash
cd web
npm install
npm run dev
```

Variaveis esperadas em `web/.env.local`:

- `NEXT_PUBLIC_SITE_URL`
- `NEXT_PUBLIC_WHATSAPP_NUMBER`
- `NEXT_PUBLIC_ENABLE_RAFFLES`
- `NEXT_PUBLIC_ENABLE_ASSISTED_CHECKOUT`
- `INFINITEPAY_API_BASE_URL`
- `INFINITEPAY_API_KEY`
- `INFINITEPAY_HANDLE`
- `INFINITEPAY_WEBHOOK_SECRET`
- `INFINITEPAY_WEBHOOK_ENABLED`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

Para a conta SmartFunko, use `INFINITEPAY_HANDLE=smartfunko`. Se alguem configurar `@smartfunko`, o backend normaliza removendo `@` antes de chamar a InfinitePay.

## Supabase

```bash
npm install
npm run supabase:link
npm run supabase:push
```

As migrations ficam em `supabase/migrations` e o seed inicial em `supabase/seed`.
Em ambiente local, `supabase db reset` aplica migrations e seed. Em ambiente remoto,
aplique as migrations com `npm run supabase:push` e rode o seed conforme o fluxo do
projeto/ambiente.

### Storage de imagens de produto

A sprint Imagens Profissionais 1.0 cria o bucket publico `product-images` por
migration. Aplique as migrations para criar/atualizar:

- bucket `product-images`;
- limite de 5MB por arquivo;
- tipos aceitos: `image/jpeg`, `image/png`, `image/webp` e `image/avif`;
- leitura publica para catalogo, home e pagina de produto;
- escrita direta no Storage restrita a usuario autenticado com role owner/admin.

Produtos podem continuar usando uma URL manual em `products.main_image_url` ou receber imagens por upload na galeria do admin. A URL principal tem prioridade sobre a primeira imagem de `product_images`.

O upload usado pelo admin passa pela API server-side e usa `SUPABASE_SERVICE_ROLE_KEY`
somente no servidor. O cliente nunca recebe a service role.

As imagens sobem em:

```txt
products/{productId}/{timestamp}-{uuid}-{safeFilename}
```

O nome original e sanitizado antes de compor o caminho.

O owner local do seed usa:

- e-mail: `owner@smartfunko.local`
- senha: `SmartFunko@123`

Para promover outro usuario a owner, ajuste `profiles.role = 'owner'` no Supabase.

## Validacao

```bash
cd web
npm run lint
npm run build
```

## APIs V1

A V1 possui endpoints publicos de catalogo/marcas, endpoints `/me` para cliente autenticado e endpoints `/api/v1/admin/*` protegidos por role interna. A role operacional principal e `owner`; `admin` fica apenas como compatibilidade legada/reservada.

O login e unico em `/login`:

- visitante ve `Entrar` e nao ve `Painel`;
- cliente autenticado ve conta, pedidos e sair;
- `owner` ve a opcao `Painel`;
- cliente tentando `/admin` e redirecionado para `/conta/pedidos`.

Principais fluxos:

- criar cliente;
- criar pedido manual;
- selecionar vendedor do pedido entre Daniel e Allana;
- adicionar item;
- usar origem de item `Leilão` alem de pronta-entrega, encomendas e pre-venda;
- criar produto rapido dentro do pedido com `POST /api/v1/admin/products/quick-create`;
- reservar estoque;
- registrar pagamento manual;
- gerar entrada de caixa;
- acompanhar pedido por link publico com token.
- manter fornecedores/marcas em `/admin/fornecedores`;
- manter produtos e variantes em `/admin/produtos/[id]`.
- analisar demanda de wishlist em `/admin/demanda`.
- auditar estoque por unidade em `/admin/estoque` e `/admin/estoque/[id]`.
- consultar pagamentos, caixa e relatorio financeiro em `/admin/pagamentos`, `/admin/caixa` e `/admin/relatorios/financeiro`, incluindo visao por vendedor e origem do item.
- organizar compras e encomendas em `/admin/lotes`.
- operar rifas experimentais em `/admin/rifas` quando `NEXT_PUBLIC_ENABLE_RAFFLES=true`.

Fornecedores/collabs ficam em `suppliers`. Piticas, Copag e Panini sao seedados por migration e aparecem em `/fornecedores`, `/fornecedores/piticas`, `/fornecedores/copag` e `/fornecedores/panini`. `/collabs` redireciona para fornecedores, e `/marcas` permanece como vitrine especial compativel. O catalogo principal nao expoe filtro de fornecedor; a separacao por collab acontece no slug do fornecedor. Para vincular um produto, edite `Fornecedor/marca` em `/admin/produtos/[id]` ou use uma coluna CSV opcional.

Status continuam em ingles no banco. A apresentacao em portugues fica centralizada em `web/src/lib/status-labels.ts`.

Area do cliente:

- `/conta` mostra perfil, resumo real do customer vinculado, edicao de dados basicos e saldo pendente apenas de pedidos cobraveis;
- `/conta/pedidos` lista apenas pedidos reais do proprio customer;
- `/conta/pedidos/[orderNumber]` mostra itens, status, pagamentos e observacoes publicas;
- `/conta/wishlist` lista e remove favoritos do proprio customer;
- `/conta/rifas` lista reservas/compras de rifa, numeros, status e datas quando a flag esta ligada;
- `/conta/rifas/[id]` mostra detalhe, total, reservado ate, pago em e resultado;
- `/pedido/[orderNumber]?token=...` continua publico por token e sem login.

Admin de produto:

- `/admin/produtos` lista produtos reais e permite busca;
- `/admin/produtos/novo` cria produto com primeira variante;
- `/admin/produtos/[id]` edita dados, imagem por URL, fornecedor, status, variantes e galeria;
- imagem por URL em `products.main_image_url` continua valida como fallback/manual;
- a secao "Imagens do produto" permite upload real, preview, definir principal, remover da galeria e reordenar por botoes;
- alteracoes de produto/variante/imagem registram `admin_action_logs`.

Teste operacional manual:

1. Criar cliente.
2. Criar produto, variante e estoque.
3. Criar pedido e adicionar item.
4. Registrar pagamento manual parcial.
5. Conferir `payments`, `cash_entries`, `order_status_history`, dashboard, `/admin/pagamentos`, `/admin/caixa` e `/admin/relatorios/financeiro`.
6. Registrar segundo pagamento ate quitar o pedido.
7. Estornar um pagamento total com justificativa.
8. Conferir status do pedido, saida de caixa `refund` e `admin_action_logs`.
9. Conferir `/conta/pedidos` e link publico por token.
10. Testar token errado no link publico.

## Contratos para Flutter futuro

Nao ha app Flutter nesta V1. Os contratos web/API preparados sao:

- `GET /api/v1/me`: autenticado; retorna `{ data: { user, profile, customer } }`.
- `GET /api/v1/me/orders`: autenticado; retorna `{ data: Order[] }` sanitizado.
- `GET /api/v1/me/orders/[orderNumber]`: autenticado; retorna um pedido sanitizado do proprio cliente.
- `GET|POST /api/v1/me/wishlist`: autenticado; lista/cria wishlist.
- `DELETE /api/v1/me/wishlist/[id]`: autenticado; remove item do proprio cliente.
- `GET /api/v1/public/products`: publico; aceita `q`, `category`, `subcategory`, `franchise`, `supplier`, `filter`, `sort`, `page`, `pageSize`.
- `GET /api/v1/public/products/[slug]`: publico; detalhe de produto ativo.
- `GET /api/v1/public/suppliers`: publico; lista suppliers ativos.
- `GET /api/v1/public/suppliers/[slug]`: publico; detalhe de supplier ativo.
- `GET /api/v1/public/raffles`: publico com flag ligada; lista rifas abertas.
- `GET /api/v1/public/raffles/[slug]`: publico com flag ligada; detalhe da rifa.
- `GET /api/v1/public/raffles/[slug]/numbers`: publico com flag ligada; numeros e status.
- `POST /api/v1/me/raffles/[slug]/reserve`: autenticado; reserva numeros temporariamente.
- `GET /api/v1/me/raffles/orders`: autenticado; lista pedidos de rifa do customer.
- `GET /api/v1/me/raffles/orders/[id]`: autenticado; detalhe de pedido de rifa do customer.
- `POST /api/v1/admin/raffles/[id]/open`: owner; abre campanha para reservas.
- `POST /api/v1/admin/raffles/[id]/publish`: owner; alias legado de `/open`.
- `POST /api/v1/admin/products/[id]/images`: owner; upload multipart com `file` e `setAsMain`.
- `PATCH /api/v1/admin/products/[id]/images/reorder`: owner; reordena `product_images`.
- `PATCH /api/v1/admin/products/[id]/images/[imageId]/main`: owner; define a imagem como `main_image_url`.
- `DELETE /api/v1/admin/products/[id]/images/[imageId]`: owner; remove o registro da galeria.

## Importacao do catalogo CSV

Dry-run:

```bash
npm run catalog:import:dry-run
```

Importacao real:

```bash
npm run catalog:import -- --skip-invalid
```

O importador usa `Smartfunkos(Produtos).csv` por padrao, preserva metadados de categoria/especial, grava `main_image_url` e `product_images`, e e idempotente por slug de produto, SKU de variante e URL de imagem.

Colunas opcionais de marca/fornecedor: `fornecedor`, `marca`, `supplier`, `collab` ou `parceiro`. Valores conhecidos `Piticas`, `Copag` e `Panini` sao normalizados para os slugs oficiais; sem coluna, o produto entra sem `supplier_id`.

Produtos importados por CSV continuam usando URL externa em `main_image_url` e/ou
`product_images`. Upload pelo admin nao e obrigatorio para produtos antigos.

## Ordem de imagens no catalogo

Catalogo, home, cards e pagina de produto usam:

1. `products.main_image_url`;
2. primeira imagem de `product_images` ordenada por `sort_order`;
3. fallback visual `ProductArtwork`.

Na pagina de produto, a galeria usa todas as imagens disponiveis nessa ordem.

## Radar futuro

Evolucoes futuras continuam em BI de estoque, automacoes de lotes e refinamento visual de componentes muito customizados.
