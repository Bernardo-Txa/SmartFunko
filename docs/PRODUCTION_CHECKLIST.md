# Checklist de producao SmartFunkos

Revisado em 2026-08-07. Use antes de liberar Preview/Production ou antes de subir uma rodada grande para `main`.

## 1. Ambiente

- Confirmar dominio publico abrindo no navegador.
- Confirmar `NEXT_PUBLIC_SITE_URL` sem barra final.
- Confirmar env vars de Supabase.
- Confirmar env vars de InfinitePay.
- Confirmar `NEXT_PUBLIC_ENABLE_RAFFLES` conforme ambiente.
- Confirmar `NEXT_PUBLIC_POPFLIX_ENABLED=false` enquanto PopFlix estiver oculto.
- Fazer redeploy depois de qualquer alteracao em `NEXT_PUBLIC_*`.

## 2. Supabase

- Aplicar migrations com `npm run supabase:push`.
- Conferir se as migrations atuais existem no remoto:
  - Pedidos V2;
  - relacao V2 com legado;
  - seller em V2;
  - Produtos 2.0/contextos;
  - Acervo Raro;
  - Pre-vendas;
  - Pre-venda paga;
  - Rifas e InfinitePay;
  - PopFlix, mesmo oculto.
- Confirmar RLS nas tabelas publicas, customer e admin.
- Confirmar bucket de imagens publico para leitura e restrito para escrita admin.
- Confirmar backups.
- Confirmar que `SUPABASE_SERVICE_ROLE_KEY` existe apenas server-side.

## 3. Auth

- Site URL Supabase: `https://smartfunko.com.br`.
- Redirect URLs Supabase: `https://smartfunko.com.br/**`.
- Recuperacao de senha abre `/redefinir-senha`.
- Magic link abre `/conta`.
- Cliente nao acessa `/admin`.
- Admin acessa painel.
- Cliente ve apenas dados/pedidos proprios.

## 4. InfinitePay

- `INFINITEPAY_HANDLE` configurado.
- `INFINITEPAY_API_BASE_URL=https://api.checkout.infinitepay.io`.
- `INFINITEPAY_API_KEY` configurado se a conta exigir.
- Webhook configurado:

```txt
https://seu-dominio.com/api/v1/webhooks/infinitepay
```

- Testar pagamento de pedido V2.
- Testar pagamento parcial de pedido V2.
- Testar pre-venda paga gerando pedido V2.
- Testar rifa paga.
- Reenviar webhook duplicado e confirmar idempotencia.
- Testar evento divergente entrando em `manual_review`.

## 5. Fluxos publicos

- Home sem erros.
- Catalogo sem acervo raro e sem produtos de collab.
- Collabs listando Piticas, NBA Brasil, Copag e Panini.
- Produto geral abre detalhe.
- Pre-vendas listam itens temporarios e geram checkout.
- Acervo Raro abre slideshow, cards e detalhe.
- Rifas abrem quando flag esta ativa.
- PopFlix nao aparece quando flag esta falsa.

## 6. Fluxos admin

- Dashboard carrega sem overflow.
- Clientes listam sem chave duplicada.
- Produtos 2.0 alterna entre geral e collabs sem redimensionamento estranho.
- Acervo Raro cadastra, edita, arquiva, exclui e controla slideshow.
- Pre-vendas mostram reservas pagas e quantidade a pedir.
- Recebimento busca por produto/numero/SKU e marca solicitados como recebidos.
- Pedidos V2 cria pedido WhatsApp com vendedor e competencia.
- Pedidos V2 aprova/recusa pedido do site.
- Pedidos V2 muda operacao para solicitado, recebido e enviado.
- Rifas mostram metricas do mes e sorteio sem comprador repetido.
- Relatorios filtram por competencia em Fechamento, BI e Financeiro.

## 7. Cliente

- Cliente entra em `/conta`.
- Cliente ve pedidos V2 por competencia.
- Checkbox de competencia seleciona todos os pedidos disponiveis.
- Pedido pago nao aparece selecionavel.
- Cliente gera pagamento parcial.
- Cliente ve pedidos pagos, pendentes, enviados e rastreio quando existir.
- Cliente ve rifas/reservas proprias.
- Cliente consegue iniciar pre-venda pelo site.

## 8. SEO

- Abrir `/sitemap.xml`.
- Abrir `/robots.txt`.
- Abrir imagem OG fallback.
- Compartilhar produto no WhatsApp.
- Compartilhar acervo raro no WhatsApp.
- Compartilhar rifa no WhatsApp, se ativa.
- Confirmar que admin, conta, API e links privados estao `noindex`.

## 9. Responsividade

- Executar `docs/RESPONSIVE_QA.md`.
- Validar 360px, 390px, 430px, 768px, 1024px e desktop.
- Validar tema claro e escuro.
- Confirmar que admin nao corta conteudo horizontalmente.
- Confirmar que tabelas usam scroll horizontal controlado quando necessario.

## 10. Build

Na pasta `web`:

```bash
npm run lint
npm run build
```

Se o build falhar por timeout de consulta Supabase durante geracao estatica, validar se e problema de banco/dados remoto e nao de TypeScript. O build precisa passar em ambiente de producao antes do deploy final.
