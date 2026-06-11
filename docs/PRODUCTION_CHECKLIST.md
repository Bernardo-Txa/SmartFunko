# Checklist de producao SmartFunko

Use antes de liberar um ambiente Production ou Preview para teste controlado.

## 1. Vercel

- Configurar dominio publico e confirmar que abre no navegador.
- Configurar env vars em Production e Preview.
- Fazer redeploy depois de alterar qualquer `NEXT_PUBLIC_*`.
- Conferir logs de build e runtime apos o deploy.
- Confirmar que `NEXT_PUBLIC_SITE_URL` aponta para o dominio do ambiente, sem barra final.

## 2. Supabase

- Aplicar migrations com `npm run supabase:push` na raiz do repo.
- Conferir RLS habilitado nas tabelas principais.
- Confirmar bucket `product-images` publico para leitura e restrito para escrita admin.
- Confirmar backups e acesso ao painel Supabase.
- Validar que `SUPABASE_SERVICE_ROLE_KEY` existe somente como secret server-side.

## 3. InfinitePay

- Configurar `INFINITEPAY_API_BASE_URL=https://api.checkout.infinitepay.io`.
- Configurar `INFINITEPAY_HANDLE`.
- Configurar `INFINITEPAY_API_KEY`, se a conta exigir.
- Configurar `INFINITEPAY_WEBHOOK_SECRET`, se a conta/provedor fornecer assinatura.
- Cadastrar webhook:

```txt
https://seu-dominio.com/api/v1/webhooks/infinitepay
```

- Testar pagamento de pedido assistido.
- Testar pagamento de rifa.
- Reenviar webhook duplicado e confirmar que nao duplica caixa, pagamento ou pontos.
- Validar que pagamento divergente entra em revisao manual.

## 4. SEO

- Abrir `/sitemap.xml`.
- Abrir `/robots.txt`.
- Abrir `/og/smart-funkos-og.png`.
- Compartilhar produto no WhatsApp.
- Compartilhar rifa no WhatsApp.
- Validar com Facebook Sharing Debugger.
- Validar produto no Rich Results Test.

## 5. Seguranca

- Visitante nao acessa `/admin`.
- Customer nao acessa `/admin`.
- Customer so ve os proprios pedidos, rifas, wishlist, clube e dados.
- `/api/v1/admin/*` exige owner/admin.
- `/api/v1/me/*` exige login.
- `/api/v1/public/*` nao retorna CPF, dados financeiros internos, margem, custo ou dados de outros clientes.
- Service role nao aparece em client components.
- Admin e conta ficam `noindex`.

## 6. Fluxos criticos

- Cliente cria pedido pelo carrinho assistido.
- Admin aprova pedido e gera link InfinitePay.
- Webhook confirma pagamento e atualiza caixa/payment.
- Admin recusa pedido e cliente ve estado correto.
- Cliente reserva rifa e paga via InfinitePay.
- Rifa expirada com webhook atrasado entra em revisao manual.
- Conta mostra pedidos, wishlist, rifas e clube quando flags ligadas.
- BI nao inclui pedido recusado, cancelado ou em analise na receita.

## 7. Responsividade

- Executar o roteiro em `docs/RESPONSIVE_QA.md`.
- Validar 360px, 390px/430px, 768px, 1024px e desktop.
- Validar tema claro e escuro nas rotas publicas, conta e admin.
- Confirmar que tabelas criticas do admin e BI usam scroll horizontal controlado.
- Confirmar que botoes principais e acoes de icone possuem area de toque confortavel.

## 8. Build

Na pasta `web`:

```bash
npm run lint
npm run build
```

Na raiz do repo, quando houver migration nova:

```bash
npm run supabase:push
```
