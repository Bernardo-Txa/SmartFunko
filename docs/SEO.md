# SEO e Open Graph

Revisado em 2026-08-07.

## Objetivo

Manter links publicos da SmartFunkos com title, description, canonical e imagem de compartilhamento consistentes em Google, WhatsApp e redes sociais.

## URL publica

Configure:

```txt
NEXT_PUBLIC_SITE_URL=https://seu-dominio.com
```

Sem barra final. Em dev, o fallback e `http://localhost:3000`.

## Paginas indexaveis

- `/`
- `/catalogo`
- `/produto/[slug]`
- `/collabs`
- `/collabs/[slug]`
- `/pre-vendas`
- `/acervo-raro`
- `/acervo-raro/[slug]`
- `/rifas` e `/rifas/[slug]`, quando `NEXT_PUBLIC_ENABLE_RAFFLES=true`

PopFlix so deve ser indexavel quando `NEXT_PUBLIC_POPFLIX_ENABLED=true` e o modulo estiver aprovado para publicacao.

## Paginas noindex

- `/admin`
- `/admin/*`
- `/conta`
- `/conta/*`
- `/api/*`
- `/pedido/*`
- URLs com `token`
- rotas legadas que existirem apenas por compatibilidade

## Open Graph

Imagem fallback:

```txt
web/public/og/smart-funkos-og.png
```

Regras:

- Produto usa imagem principal do produto.
- Collab usa logo/banner da collab quando existir.
- Acervo Raro usa imagem principal da peca.
- Rifa usa imagem do premio.
- Quando nao houver imagem propria, usar fallback.

## Metadata dinamica

Produto:

- title: `{produto} - SmartFunkos`;
- canonical: `/produto/{slug}`;
- JSON-LD `Product` quando houver preco positivo.

Collab:

- title: `{collab} na SmartFunkos`;
- canonical: `/collabs/{slug}`.

Acervo Raro:

- title: `{peca} - Acervo Raro SmartFunkos`;
- canonical: `/acervo-raro/{slug}`;
- description destacando autenticidade, assinatura ou raridade quando houver.

Rifa:

- title: `{rifa} - Rifa SmartFunkos`;
- canonical: `/rifas/{slug}`;
- noindex quando cancelada/indisponivel.

## Sitemap e robots

- `web/src/app/sitemap.ts` gera `/sitemap.xml`.
- `web/src/app/robots.ts` gera `/robots.txt`.
- Sitemap deve incluir paginas publicas estaticas e itens publicos recentes.
- Admin, conta, API, pedido privado e parametros sensiveis devem ficar fora.
- Se Supabase falhar, sitemap deve retornar pelo menos paginas estaticas.

## Teste de preview

1. Abrir `/sitemap.xml`.
2. Abrir `/robots.txt`.
3. Abrir `/og/smart-funkos-og.png`.
4. Verificar title/description de produto.
5. Verificar title/description de acervo raro.
6. Verificar title/description de rifa, se ativa.
7. Confirmar que `/admin` e `/conta` estao `noindex`.
8. Enviar links no WhatsApp.
9. Validar cache com Facebook Sharing Debugger quando necessario.

WhatsApp e redes podem manter cache de imagem/title por algum tempo.
