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
- `INFINITEPAY_API_BASE_URL`: base da API InfinitePay. Padrao: `https://api.checkout.infinitepay.io`.
- `INFINITEPAY_API_KEY`: chave privada da InfinitePay, se a conta exigir autenticacao por header.
- `INFINITEPAY_HANDLE`: InfiniteTag/handle da conta, sem `$`. Obrigatoria para gerar links.
- `INFINITEPAY_WEBHOOK_SECRET`: segredo HMAC para validar webhook, se configurado no provedor/conta.
- `INFINITEPAY_WEBHOOK_ENABLED`: flag operacional para webhook. Padrao esperado: `true`.

## Vercel

Configure as variaveis em Production e Preview conforme o ambiente. Depois de alterar qualquer env, faca redeploy para o Next.js receber os novos valores.

`INFINITEPAY_API_KEY`, `INFINITEPAY_HANDLE`, `INFINITEPAY_WEBHOOK_SECRET` e `SUPABASE_SERVICE_ROLE_KEY` nunca devem ser expostas como `NEXT_PUBLIC_*`.

## Webhook InfinitePay

Configure na InfinitePay:

```txt
https://seu-dominio.com/api/v1/webhooks/infinitepay
```

O redirect_url enviado no link aponta para:

```txt
{NEXT_PUBLIC_SITE_URL}/conta/pedidos/{orderNumber}
```

O redirect nao confirma pagamento. A baixa financeira depende do webhook ou de uma acao server-side futura de consulta de status.
