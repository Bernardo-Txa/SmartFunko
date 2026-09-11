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
- `BLING_API_BASE_URL`: base da API Bling V3. Padrao: `https://api.bling.com.br/Api/v3`.
- `BLING_OAUTH_BASE_URL`: base OAuth do Bling V3. Padrao: `https://bling.com.br/Api/v3`.
- `BLING_CLIENT_ID`: Client ID do aplicativo privado Bling. Obrigatorio para conectar pelo painel.
- `BLING_CLIENT_SECRET`: Client Secret do aplicativo privado Bling. Obrigatorio para conectar pelo painel.
- `BLING_NFE_NATUREZA_OPERACAO_ID`: ID da natureza de operacao usada para criar NF-e.
- `BLING_NFE_LOJA_ID`: ID da loja no Bling, opcional.
- `BLING_NFE_LOJA_NUMERO`: override do numero de loja/pedido enviado ao Bling. Se vazio e `BLING_NFE_LOJA_ID` estiver definido, usa o numero do pedido V2.
- `BLING_NFE_PAYMENT_METHOD_ID`: ID da forma de pagamento usada na parcela da NF-e, opcional.
- `BLING_NFE_DEFAULT_CONTRIBUINTE`: indicador do destinatario: `1`, `2` ou `9`. Padrao: `9`.
- `BLING_NFE_DEFAULT_NCM`: NCM padrao para itens, opcional se os produtos/SKUs ja estiverem completos no Bling.
- `BLING_NFE_DEFAULT_ORIGEM`: origem fiscal padrao do item, de `0` a `8`. Padrao: `0`.

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

BLING_API_BASE_URL=https://api.bling.com.br/Api/v3
BLING_OAUTH_BASE_URL=https://bling.com.br/Api/v3
BLING_CLIENT_ID=
BLING_CLIENT_SECRET=
BLING_NFE_NATUREZA_OPERACAO_ID=
BLING_NFE_LOJA_ID=
BLING_NFE_LOJA_NUMERO=
BLING_NFE_PAYMENT_METHOD_ID=
BLING_NFE_DEFAULT_CONTRIBUINTE=9
BLING_NFE_DEFAULT_NCM=
BLING_NFE_DEFAULT_ORIGEM=0

NEXT_PUBLIC_SUPABASE_URL=https://project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=replace-with-anon-key
SUPABASE_SERVICE_ROLE_KEY=replace-with-service-role-key
```

## Bling OAuth

No Bling, cadastre estes redirects no aplicativo:

```txt
https://smartfunko.com.br/api/v1/admin/bling/oauth/callback
http://localhost:3000/api/v1/admin/bling/oauth/callback
```

No deploy, mantenha apenas `BLING_CLIENT_ID` e `BLING_CLIENT_SECRET` como credenciais OAuth. Depois, no admin do pedido, clique em `Conectar Bling`; a autorizacao volta para o app e o backend salva `access_token`/`refresh_token` em `integration_oauth_tokens` usando a service role do Supabase.

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
