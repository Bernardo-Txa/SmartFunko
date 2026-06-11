# SmartFunko Web

Aplicacao Next.js da V1.

## Scripts

```bash
npm run dev
npm run lint
npm run build
```

## Variaveis

Copie `.env.example` para `.env.local` e preencha:

- `NEXT_PUBLIC_SITE_URL`
- `NEXT_PUBLIC_WHATSAPP_NUMBER`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

`NEXT_PUBLIC_SITE_URL` deve apontar para o dominio publico do ambiente em Vercel, sem barra final, por exemplo `https://seu-dominio.com`. Em desenvolvimento o app usa `http://localhost:3000` para canonical e compartilhamento.

## Rotas iniciais

- `/`
- `/catalogo` com busca, vitrine, categoria, linha, fornecedor e ordenacao premium
- `/pronta-entrega`
- `/pre-venda`
- `/specials`
- `/novidades`
- `/encomendas`
- `/produto/[slug]`
- `/rifas`
- `/rifas/[slug]`
- `/carrinho`
- `/login`
- `/cadastro`
- `/conta`
- `/conta/pedidos`
- `/conta/wishlist`
- `/admin/dashboard`
- `/admin/demanda`
- `/api/v1/health`
- `/api/v1/public/products`

## Premium Pack

O Premium Pack estabilizado mantém descoberta comercial sem checkout completo:

- cards com favorito e carrinho local em ações compactas;
- vitrines comerciais reaproveitando filtros por busca, categoria, fornecedor e ordenação;
- `/catalogo` usando a mesma experiência visual das vitrines, com filtro de vitrine e linha;
- carrinho assistido persistido no navegador e finalizado por WhatsApp.

Não há Pix, reserva automática, frete, pedido automático, Flutter ou leilão nesta etapa.

## SEO & Open Graph

- metadata global com fallback `/og/smart-funkos-og.png`;
- metadata dinamica para produto, rifa e fornecedor;
- `/sitemap.xml` e `/robots.txt` gerados pelo App Router;
- `/admin`, `/conta`, `/api` e `/pedido/*` ficam fora de indexacao.

Detalhes operacionais em `../docs/SEO.md`.
