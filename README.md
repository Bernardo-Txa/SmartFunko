# SmartFunko

Projeto da Smart Funkos.

## Objetivo

Construir uma operacao assistida por tecnologia para vendas de colecionaveis.

Na V1, as vendas continuam pelo WhatsApp, mas o sistema passa a controlar:

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
- [Divida tecnica](./docs/TECH_DEBT.md)
- [Documento Tecnico Inicial](./Smart%20Funkos%20-%20Documento%20T%C3%A9cnico%20Inicial.pdf)

## Estrutura

- `web/`: site publico, area do cliente, admin e API Next.js.
- `supabase/`: migrations, seed e policies.
- `MVP_OPERACIONAL_V1.md`: escopo validado da primeira versao.

## Direcao da V1

Cliente escolhe no site, compra pelo WhatsApp, acompanha pela conta e a Smart Funkos controla tudo pelo admin.

## Camada premium de loja

A camada publica agora organiza descoberta e intencao de compra por cima do core operacional:

- home premium com hero, vitrines comerciais, universos, fornecedores/collabs, fluxo assistido e bloco de confianca;
- mega menu por universos/categorias e links diretos para vitrines comerciais;
- paginas publicas `/pronta-entrega`, `/pre-venda`, `/specials`, `/novidades` e `/encomendas`;
- `/catalogo` unificado com a experiencia premium de busca, vitrine, categoria, linha, fornecedor e ordenacao;
- pagina de produto com galeria, badges comerciais, CTA "Tenho interesse", favoritos, carrinho assistido e relacionados;
- cards de produto com favoritos e carrinho em acoes compactas, sem transformar o card em checkout;
- favoritos reais em cards, produto e `/conta/wishlist`, usando `/api/v1/me/wishlist`;
- carrinho assistido em `/carrinho`, persistido no navegador e finalizado por mensagem de WhatsApp;
- admin de demanda em `/admin/demanda`, restrito a owner, com ranking real de wishlist.

O carrinho assistido nao e checkout: nao reserva estoque automaticamente, nao calcula frete, nao cobra pagamento, nao cria pedido sozinho e nao inclui Pix nesta fase.

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

## Como rodar localmente

```bash
cd web
npm install
npm run dev
```

Variaveis esperadas em `web/.env.local`:

- `NEXT_PUBLIC_SITE_URL`
- `NEXT_PUBLIC_WHATSAPP_NUMBER`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

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
- adicionar item;
- reservar estoque;
- registrar pagamento manual;
- gerar entrada de caixa;
- acompanhar pedido por link publico com token.
- manter fornecedores/marcas em `/admin/fornecedores`;
- manter produtos e variantes em `/admin/produtos/[id]`.
- analisar demanda de wishlist em `/admin/demanda`.
- auditar estoque por unidade em `/admin/estoque` e `/admin/estoque/[id]`.

Fornecedores/collabs ficam em `suppliers`. Piticas, Copag e Panini sao seedados por migration e aparecem em `/fornecedores`, `/fornecedores/piticas`, `/fornecedores/copag` e `/fornecedores/panini`. `/collabs` redireciona para fornecedores, e `/marcas` permanece como vitrine especial compativel. Para vincular um produto, edite `Fornecedor/marca` em `/admin/produtos/[id]` ou use uma coluna CSV opcional.

Status continuam em ingles no banco. A apresentacao em portugues fica centralizada em `web/src/lib/status-labels.ts`.

Area do cliente:

- `/conta` mostra perfil e resumo real do customer vinculado;
- `/conta/pedidos` lista apenas pedidos reais do proprio customer;
- `/conta/pedidos/[orderNumber]` mostra itens, status, pagamentos e observacoes publicas;
- `/conta/wishlist` lista e remove favoritos do proprio customer;
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
4. Registrar pagamento manual.
5. Conferir `cash_entries`, dashboard, `/conta/pedidos` e link publico por token.
6. Testar token errado no link publico.

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

Gamificacao / Clube Smart Funkos permanece no radar, mas nao foi implementado na
sprint Imagens Profissionais 1.0.
