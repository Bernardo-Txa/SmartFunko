# QA responsivo SmartFunko

Use este roteiro antes de liberar Preview ou Production com foco em navegador mobile.

## Viewports minimos

- 360px: celular pequeno.
- 390px e 430px: celulares comuns.
- 768px: tablet portrait.
- 1024px: tablet landscape ou desktop pequeno.
- Desktop normal.

## Publico e cliente

- Home sem overflow horizontal, hero legivel e CTAs empilhados quando necessario.
- Catalogo com filtros, paginacao e cards usaveis em 360px.
- Produto com galeria, thumbnails, preco, status e CTAs sem sobreposicao.
- Rifas com cards legiveis, compartilhamento visivel e seletor de numeros com toque confortavel.
- Carrinho assistido com quantidade, remover, cupom, total, WhatsApp e envio para analise acessiveis.
- Login/cadastro com inputs grandes, mensagens de erro legiveis e sem overflow.
- Conta, pedidos, detalhe de pedido, wishlist e clube usando cards ou grids confortaveis.
- Tema claro e escuro em todas as rotas acima.

## Admin e BI

- Admin abre em tablet e celular sem quebrar a viewport geral.
- Navegacao admin rola horizontalmente no mobile e vira sidebar em desktop.
- Filtros de pedidos, estoque, pagamentos, caixa, lotes e rifas empilham ou rolam sem cortar controles.
- Tabelas criticas usam scroll horizontal controlado.
- Modais e formularios longos cabem na tela com scroll interno quando aplicavel.
- BI empilha cards, contem graficos Recharts e permite ler tabelas por scroll horizontal.

## Tecnico

- Sem overflow horizontal global em `body`.
- Sem erro de hydration no console.
- Botoes e links principais com area de toque minima proxima de 44px.
- Imagens preservam proporcao e fallback visual.
- SEO, JSON-LD, sitemap, robots e Open Graph sem regressao.
- `npm run lint` passa.
- `npm run build` passa.
