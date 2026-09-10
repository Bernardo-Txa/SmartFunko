# SmartFunkos Web

Aplicacao Next.js do site publico, area do cliente, painel admin e APIs.

## Como rodar

```bash
npm install
npm run dev
```

Validar:

```bash
npm run lint
npm run build
```

Migrations Supabase sao aplicadas a partir da raiz:

```bash
npm run supabase:push
```

## Rotas principais

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
- `/carrinho`
- `/login`
- `/cadastro`
- `/redefinir-senha`

Cliente:

- `/conta`
- `/conta/pedidos-v2`
- `/conta/rifas`
- `/conta/popflix`, se PopFlix estiver ativo

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

## Modulos atuais

- Pedidos V2: fluxo principal de pedidos, competencias e pagamento parcial.
- Produtos 2.0: catalogo geral e collabs separadas.
- Pre-vendas: pagamento antes de criar pedido V2.
- Acervo Raro: cadastro especial separado do catalogo.
- Recebimento: conferencia de carga por produto e mudanca para recebido.
- Rifas: cotas, pagamento e sorteio interno.
- Relatorios: fechamento mensal, BI e financeiro por competencia.
- PopFlix: oculto por `NEXT_PUBLIC_POPFLIX_ENABLED=false`.

## Variaveis

Copie `.env.example` para `.env.local` e configure as variaveis descritas em `../docs/ENV_VARS.md`.

Principais:

- `NEXT_PUBLIC_SITE_URL`
- `NEXT_PUBLIC_WHATSAPP_NUMBER`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `INFINITEPAY_API_BASE_URL`
- `INFINITEPAY_HANDLE`
- `INFINITEPAY_API_KEY`
- `INFINITEPAY_WEBHOOK_SECRET`
- `BLING_ACCESS_TOKEN`
- `BLING_NFE_NATUREZA_OPERACAO_ID`
- `NEXT_PUBLIC_ENABLE_RAFFLES`
- `NEXT_PUBLIC_POPFLIX_ENABLED`

## Docs relacionadas

- `../docs/ESTADO_ATUAL.md`
- `../docs/OPERACAO_MVP.md`
- `../docs/PAYMENTS.md`
- `../docs/INFINITEPAY.md`
- `../docs/PRODUCTION_CHECKLIST.md`
- `../docs/RESPONSIVE_QA.md`
