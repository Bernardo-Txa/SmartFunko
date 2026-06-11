# Variaveis de ambiente

## Publicas

- `NEXT_PUBLIC_SITE_URL`: URL base do app, usada em links publicos, redirect e webhook.
- `NEXT_PUBLIC_WHATSAPP_NUMBER`: numero usado nos CTAs de WhatsApp.
- `NEXT_PUBLIC_SUPABASE_URL`: URL publica do Supabase.
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: anon key publica do Supabase.
- `NEXT_PUBLIC_ENABLE_RAFFLES`: ativa Rifas DEV 1.1 quando `true`.
- `NEXT_PUBLIC_ENABLE_ASSISTED_CHECKOUT`: ativa envio do carrinho para analise quando diferente de `false`.

## Server-only

- `SUPABASE_SERVICE_ROLE_KEY`: service role usada somente no backend.
- `INFINITEPAY_API_BASE_URL`: base da API InfinitePay. Use `https://api.checkout.infinitepay.io`.
- `INFINITEPAY_API_KEY`: chave privada da InfinitePay, se a conta exigir autenticacao por header.
- `INFINITEPAY_HANDLE`: InfiniteTag da conta. Para a SmartFunko use `smartfunko`. Se for preenchido como `@smartfunko`, o backend remove o `@` antes de enviar para a InfinitePay.
- `INFINITEPAY_WEBHOOK_SECRET`: segredo HMAC para validar webhook, se configurado no provedor/conta.
- `INFINITEPAY_WEBHOOK_ENABLED`: flag operacional para webhook. Padrao esperado: `true`.

## Vercel

Configure as variaveis em Production e Preview conforme o ambiente. Depois de alterar qualquer env, faca redeploy para o Next.js receber os novos valores.

`INFINITEPAY_API_KEY`, `INFINITEPAY_HANDLE`, `INFINITEPAY_WEBHOOK_SECRET` e `SUPABASE_SERVICE_ROLE_KEY` nunca devem ser expostas como `NEXT_PUBLIC_*`.

## Webhook InfinitePay

Antes de usar em producao/preview, confirme que a URL base abre no navegador. Se a Vercel responder `DEPLOYMENT_NOT_FOUND`, o dominio nao esta apontando para um deployment valido e nenhum redirect/webhook funcionara nesse host.

Configure na InfinitePay:

```txt
https://seu-dominio.com/api/v1/webhooks/infinitepay
```

Aliases aceitos para evitar 404 em configuracoes legadas:

```txt
https://seu-dominio.com/webhook-infinitepay
https://seu-dominio.com/api/webhook-infinitepay
```

O redirect_url enviado no link aponta para:

```txt
{NEXT_PUBLIC_SITE_URL}/pedido/{orderNumber}?token={publicToken}
```

O redirect nao confirma pagamento por si so. Quando a InfinitePay devolve `slug`, `transaction_nsu` ou `receipt_url`, a pagina publica consulta `payment_check` no servidor e baixa o pedido se a InfinitePay responder `paid: true`. O webhook continua sendo o caminho principal.

Os links gerados pelo painel admin usam o dominio real da requisicao admin como base. Ainda assim, mantenha `NEXT_PUBLIC_SITE_URL` apontando para o dominio valido do ambiente, por exemplo:

```txt
NEXT_PUBLIC_SITE_URL=https://dominio-valido.vercel.app
```

## Valores recomendados SmartFunko

```txt
NEXT_PUBLIC_ENABLE_ASSISTED_CHECKOUT=true
INFINITEPAY_API_BASE_URL=https://api.checkout.infinitepay.io
INFINITEPAY_HANDLE=smartfunko
INFINITEPAY_API_KEY=
INFINITEPAY_WEBHOOK_SECRET=
INFINITEPAY_WEBHOOK_ENABLED=true
```

`INFINITEPAY_API_KEY` e `INFINITEPAY_WEBHOOK_SECRET` ficam vazios se a conta/documentacao da InfinitePay nao fornecer chave ou assinatura. Caso a conta forneca, configure somente como variavel server-side.

## Consulta manual de status

O admin pode usar `Verificar pagamento` no detalhe do pedido. O backend chama:

```txt
POST https://api.checkout.infinitepay.io/payment_check
```

Com corpo:

```json
{
  "handle": "smartfunko",
  "order_nsu": "SF-...",
  "slug": "codigo-da-fatura"
}
```

Se a resposta vier com `success: true` e `paid: true`, o sistema registra pagamento e caixa pelo mesmo fluxo financeiro usado no webhook.
