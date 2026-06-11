# SEO & Open Graph 1.0

## Objetivo

Deixar links publicos da Smart Funkos com title, description, canonical e imagem de compartilhamento consistentes em Google, WhatsApp, Discord, Telegram e redes sociais.

## URL publica

Configure em Vercel, para Production e Preview:

```txt
NEXT_PUBLIC_SITE_URL=https://seu-dominio.com
```

O helper `getSiteUrl()` remove barra final. Em desenvolvimento, usa `http://localhost:3000`. Em producao, use sempre um dominio valido para canonical, sitemap, redirects e mensagens de WhatsApp.

## Paginas indexaveis

- `/`
- `/catalogo`
- `/produto/[slug]`
- `/rifas` e `/rifas/[slug]`, somente com `NEXT_PUBLIC_ENABLE_RAFFLES=true`
- `/fornecedores`
- `/fornecedores/[slug]`

## Paginas noindex

- `/admin`
- `/admin/*`
- `/conta`
- `/conta/*`
- `/api/*`
- `/pedido/*`
- URLs com parametro `token`

`/admin` e `/conta` tambem possuem layouts com `robots: noindex, nofollow`.

## Open Graph

Imagem fallback:

```txt
web/public/og/smart-funkos-og.png
```

Produtos usam imagem principal quando disponivel. Rifas usam imagem do premio. Fornecedores usam banner ou logo. Quando nao houver imagem propria, o fallback acima e usado.

## Metadata dinamica

Produtos:

- title: `{produto} — Smart Funkos`
- description do cadastro ou fallback seguro
- canonical `/produto/{slug}`
- `twitter: summary_large_image`
- JSON-LD `Product` com oferta apenas quando houver preco positivo

Rifas:

- title: `{rifa} — Rifa Smart Funkos`
- description muda entre rifa aberta e encerrada
- canonical `/rifas/{slug}`
- JSON-LD `WebPage`
- rifa cancelada fica fora do publico e noindex quando detectada

Fornecedores:

- title: `{fornecedor} na Smart Funkos`
- description do cadastro ou fallback seguro
- canonical `/fornecedores/{slug}`

## Sitemap e robots

- `web/src/app/sitemap.ts` gera `/sitemap.xml`.
- `web/src/app/robots.ts` gera `/robots.txt`.
- O sitemap inclui paginas estaticas, fornecedores ativos, ate 60 produtos publicos recentes e rifas publicas quando a feature flag estiver ativa.
- Se Supabase ou rifas falharem durante a geracao, o sitemap retorna pelo menos as paginas estaticas.

## Testes de preview

Depois do deploy:

1. Envie um link de produto no WhatsApp.
2. Envie um link de rifa no WhatsApp.
3. Abra `/sitemap.xml` e confirme que nao ha admin, conta, API ou pedido privado.
4. Abra `/robots.txt` e confira os bloqueios.
5. Use Facebook Sharing Debugger, LinkedIn Post Inspector e Rich Results Test quando precisar revalidar cache externo.

WhatsApp, Discord, Telegram e outras plataformas podem manter cache de OG por algum tempo. Alteracoes de title/image podem demorar ou exigir limpeza no inspetor da plataforma.
