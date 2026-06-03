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

## Validacao

```bash
cd web
npm run lint
npm run build
```

## APIs V1

A V1 possui endpoints publicos de catalogo, endpoints `/me` para cliente autenticado e endpoints `/api/v1/admin/*` protegidos por role `owner`.

Principais fluxos:

- criar cliente;
- criar pedido manual;
- adicionar item;
- reservar estoque;
- registrar pagamento manual;
- gerar entrada de caixa;
- acompanhar pedido por link publico com token.

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
