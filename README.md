# SmartFunkos

Sistema web/admin da Smart Funkos para catalogo, pedidos, pre-vendas, acervo raro, rifas, cobranca por InfinitePay e acompanhamento do cliente.

Este repositorio ja passou da ideia inicial de MVP com estoque/lote. A operacao atual usa Pedidos V2, Produtos 2.0 e modulos separados para Pre-vendas, Acervo Raro, Rifas e Relatorios.

## Estado atual

- Site publico: home, catalogo, collabs, pre-vendas, acervo raro, rifas, produto, carrinho, login e conta.
- Area do cliente: dados da conta, pedidos V2 agrupados por competencia, pagamento parcial por InfinitePay, rifas e pre-vendas.
- Painel admin: Dashboard, Clientes, Produtos, Pre-vendas, Acervo Raro, Recebimento, Pedidos, Cupons, Rifas e Relatorios.
- PopFlix existe no codigo, mas fica oculto por feature flag enquanto nao for relancado.
- Estoque, lotes, fornecedores antigos, pagamentos/caixa antigos e Smart Clube ficaram como legado ou base tecnica; nao sao o fluxo operacional principal.

Leia o resumo completo em [docs/ESTADO_ATUAL.md](./docs/ESTADO_ATUAL.md).

## Documentacao

- [Estado atual](./docs/ESTADO_ATUAL.md): fonte principal da versao atual.
- [Operacao](./docs/OPERACAO_MVP.md): rotina diaria por modulo.
- [Pagamentos](./docs/PAYMENTS.md): regras InfinitePay, checkout e cobrancas.
- [InfinitePay](./docs/INFINITEPAY.md): integracao tecnica com link, redirect e webhook.
- [Relatorios e BI](./docs/BI.md): fechamento mensal, BI e financeiro.
- [Variaveis de ambiente](./docs/ENV_VARS.md): `.env.local`, Vercel e feature flags.
- [Checklist de producao](./docs/PRODUCTION_CHECKLIST.md): roteiro antes de subir/revisar ambiente.
- [Checklist de seguranca](./docs/SECURITY_CHECKLIST.md): auth, RLS, secrets e webhooks.
- [QA responsivo](./docs/RESPONSIVE_QA.md): roteiro visual mobile/desktop.
- [SEO](./docs/SEO.md): sitemap, robots, metadata e Open Graph.
- [Estabilidade](./docs/STABILITY_CHECK.md): pontos criticos de manutencao.
- [Divida tecnica](./docs/TECH_DEBT.md): pendencias reais para proximos ciclos.
- [MVP V1 historico](./MVP_OPERACIONAL_V1.md): registro da primeira visao, nao a fonte atual.

## Estrutura

- `web/`: aplicacao Next.js, App Router, API routes, server services e UI.
- `supabase/`: migrations, seeds, RLS e funcoes de banco.
- `mobile/`: app Flutter cliente em estado secundario; a fonte de verdade atual e o web/admin.
- `scripts/`: scripts operacionais de importacao/exportacao.
- `docs/`: documentacao operacional e tecnica.

## Como rodar localmente

```bash
cd web
npm install
npm run dev
```

O app abre em:

```txt
http://localhost:3000
```

Validacoes principais:

```bash
cd web
npm run lint
npm run build
```

Aplicar migrations Supabase:

```bash
npm run supabase:push
```

## Variaveis essenciais

Copie `web/.env.example` para `web/.env.local` e configure:

- `NEXT_PUBLIC_SITE_URL`
- `NEXT_PUBLIC_WHATSAPP_NUMBER`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `INFINITEPAY_API_BASE_URL`
- `INFINITEPAY_HANDLE`
- `INFINITEPAY_API_KEY`, se a conta exigir
- `INFINITEPAY_WEBHOOK_SECRET`, se a conta fornecer assinatura
- `INFINITEPAY_WEBHOOK_ENABLED`
- `NEXT_PUBLIC_ENABLE_RAFFLES`
- `NEXT_PUBLIC_ENABLE_ASSISTED_CHECKOUT`
- `NEXT_PUBLIC_POPFLIX_ENABLED`

`SUPABASE_SERVICE_ROLE_KEY`, `INFINITEPAY_API_KEY` e `INFINITEPAY_WEBHOOK_SECRET` nunca devem ser expostos como `NEXT_PUBLIC_*`.

## Fluxo operacional resumido

Pedidos V2 sao a fonte atual para pedidos comuns, pedidos de WhatsApp, pedidos aprovados do site e pedidos gerados por pre-venda paga. Todo pedido recebe uma competencia comercial cadastrada em tabela, e o cliente pode pagar pedidos liberados de forma parcial, selecionando apenas parte dos itens daquele mes. Quando a carga chega do fornecedor, o admin usa Recebimento para localizar pedidos pagos e solicitados por produto, numero ou SKU e marcar como recebido.

Produtos gerais e produtos de collab sao mantidos em areas separadas. Itens livres usados em pedidos WhatsApp nao entram no catalogo. Acervo Raro e Pre-vendas tambem possuem cadastro proprio, pois tem regra comercial diferente do catalogo principal.

Pagamentos automatizados passam pela InfinitePay. O webhook e a consulta server-side sao a fonte de verdade para marcar pagamento como confirmado.

## Status de legado

O codigo ainda contem partes da V1 porque elas foram importantes para migracao e compatibilidade. Antes de reutilizar uma rota, tabela ou service antigo, confira [docs/ESTADO_ATUAL.md](./docs/ESTADO_ATUAL.md) e [docs/TECH_DEBT.md](./docs/TECH_DEBT.md).
