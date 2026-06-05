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

Fornecedores/collabs ficam em `suppliers`. Piticas, Copag e Panini sao seedados por migration e aparecem em `/fornecedores`, `/fornecedores/piticas`, `/fornecedores/copag` e `/fornecedores/panini`. `/collabs` redireciona para fornecedores, e `/marcas` permanece como vitrine especial compativel. Para vincular um produto, edite `Fornecedor/marca` em `/admin/produtos/[id]` ou use uma coluna CSV opcional.

Status continuam em ingles no banco. A apresentacao em portugues fica centralizada em `web/src/lib/status-labels.ts`.

Area do cliente:

- `/conta` mostra perfil e resumo real do customer vinculado;
- `/conta/pedidos` lista apenas pedidos reais do proprio customer;
- `/conta/pedidos/[orderNumber]` mostra itens, status, pagamentos e observacoes publicas;
- `/pedido/[orderNumber]?token=...` continua publico por token e sem login.

Admin de produto:

- `/admin/produtos` lista produtos reais e permite busca;
- `/admin/produtos/novo` cria produto com primeira variante;
- `/admin/produtos/[id]` edita dados, imagem por URL, fornecedor, status e variantes;
- alteracoes de produto/variante registram `admin_action_logs`;
- upload direto via Supabase Storage ainda nao faz parte desta sprint.

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
- `GET /api/v1/public/products`: publico; aceita `q`, `category`, `subcategory`, `franchise`, `supplier`, `filter`, `page`, `pageSize`.
- `GET /api/v1/public/products/[slug]`: publico; detalhe de produto ativo.
- `GET /api/v1/public/suppliers`: publico; lista suppliers ativos.
- `GET /api/v1/public/suppliers/[slug]`: publico; detalhe de supplier ativo.

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
