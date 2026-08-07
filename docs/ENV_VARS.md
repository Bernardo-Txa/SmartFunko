# Variaveis de ambiente

Revisado em 2026-08-07.

## Publicas

- `NEXT_PUBLIC_SITE_URL`: URL base do app, sem barra final. Usada em canonical, sitemap, redirects, links de pagamento e mensagens.
- `NEXT_PUBLIC_WHATSAPP_NUMBER`: numero usado nos CTAs de WhatsApp.
- `NEXT_PUBLIC_SUPABASE_URL`: URL publica do Supabase.
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: anon key publica do Supabase.
- `NEXT_PUBLIC_ENABLE_RAFFLES`: ativa links, paginas e APIs de rifas quando `true`.
- `NEXT_PUBLIC_ENABLE_ASSISTED_CHECKOUT`: ativa carrinho/envio de pedido pelo site quando diferente de `false`.
- `NEXT_PUBLIC_POPFLIX_ENABLED`: ativa PopFlix quando `true`. Padrao atual recomendado: `false`.
- `NEXT_PUBLIC_ENABLE_REWARDS`: legado Smart Clube; manter desligado salvo reativacao planejada.

## Server-only

- `SUPABASE_SERVICE_ROLE_KEY`: service role usada somente no backend.
- `CORS_ALLOWED_ORIGINS`: origens extras autorizadas para APIs publicas e `/api/v1/me/*`, separadas por virgula.
- `INFINITEPAY_API_BASE_URL`: base da API InfinitePay. Use `https://api.checkout.infinitepay.io`.
- `INFINITEPAY_API_KEY`: chave privada da InfinitePay, se a conta exigir autenticacao por header.
- `INFINITEPAY_HANDLE`: InfiniteTag da conta. Exemplo: `smartfunko`. Se vier como `@smartfunko`, o backend remove o `@`.
- `INFINITEPAY_WEBHOOK_SECRET`: segredo HMAC para validar webhook, se a conta/provedor fornecer assinatura.
- `INFINITEPAY_WEBHOOK_ENABLED`: controla processamento de webhook. Padrao esperado: `true`.

## Exemplo local

```txt
NEXT_PUBLIC_SITE_URL=http://localhost:3000
NEXT_PUBLIC_WHATSAPP_NUMBER=5511999999999
NEXT_PUBLIC_POPFLIX_ENABLED=false
NEXT_PUBLIC_ENABLE_RAFFLES=true
NEXT_PUBLIC_ENABLE_ASSISTED_CHECKOUT=true

INFINITEPAY_API_BASE_URL=https://api.checkout.infinitepay.io
INFINITEPAY_API_KEY=
INFINITEPAY_HANDLE=smartfunko
INFINITEPAY_WEBHOOK_SECRET=
INFINITEPAY_WEBHOOK_ENABLED=true

NEXT_PUBLIC_SUPABASE_URL=https://project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=replace-with-anon-key
SUPABASE_SERVICE_ROLE_KEY=replace-with-service-role-key
```

## Vercel

Configure as variaveis em Production e Preview conforme o ambiente.

Depois de alterar qualquer `NEXT_PUBLIC_*`, faca redeploy para atualizar bundle, navegacao, SEO e feature flags publicas.

Para producao SmartFunkos:

```txt
NEXT_PUBLIC_SITE_URL=https://smartfunko.com.br
```

Secrets nunca devem usar prefixo `NEXT_PUBLIC_*`.

## Supabase Auth URLs

Em Supabase -> Authentication -> URL Configuration:

```txt
Site URL:
https://smartfunko.com.br

Redirect URLs:
https://smartfunko.com.br/**
```

Templates de e-mail devem manter `{{ .ConfirmationURL }}`.

Fluxos web:

- cadastro e confirmacao: `/auth/confirmado`;
- recuperacao de senha: `/redefinir-senha`;
- magic link: `/conta`;
- troca de senha/e-mail usa Supabase Auth com sessao do usuario.

## Feature flags

`NEXT_PUBLIC_ENABLE_RAFFLES=true`:

- mostra Rifas na navegacao;
- libera paginas publicas/customer/admin;
- permite reservas e pagamentos.

`NEXT_PUBLIC_POPFLIX_ENABLED=false`:

- oculta PopFlix da navegacao;
- mantem codigo e rotas preservados para reativacao futura;
- evita publicar assinatura antes de validacao final.

`NEXT_PUBLIC_ENABLE_ASSISTED_CHECKOUT`:

- padrao: ativo;
- com `false`, cliente nao cria pedido pelo carrinho;
- pedidos admin continuam funcionando.

`NEXT_PUBLIC_ENABLE_REWARDS`:

- legado do Smart Clube;
- manter desligado ate o modulo ser redesenhado.

## Webhook InfinitePay

URL principal:

```txt
https://seu-dominio.com/api/v1/webhooks/infinitepay
```

Aliases aceitos para configuracoes antigas:

```txt
https://seu-dominio.com/webhook-infinitepay
https://seu-dominio.com/api/webhook-infinitepay
```

Tipos de checkout tratados pelo webhook:

- `order_v2`;
- `preorder`;
- `raffle`;
- `popflix`, se ativo;
- `order`, legado.

## Regras de seguranca

- Service role e secrets InfinitePay ficam somente no servidor.
- Client/browser usa apenas Supabase URL e anon key.
- Nao registrar secrets em logs.
- CORS nao substitui autenticacao.
- `/api/v1/admin/*` exige admin/owner.
- `/api/v1/me/*` exige usuario autenticado.
