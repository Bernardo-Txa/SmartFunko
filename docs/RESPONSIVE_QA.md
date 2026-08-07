# QA responsivo SmartFunkos

Revisado em 2026-08-07.

Use este roteiro antes de liberar Preview/Production.

## Viewports minimos

- 360px: celular pequeno.
- 390px e 430px: celulares comuns.
- 768px: tablet portrait.
- 1024px: tablet landscape/desktop pequeno.
- Desktop normal.

## Regras gerais

- Sem overflow horizontal global em `body`.
- Header nao deve quebrar nem cortar botoes.
- Botoes com area de toque confortavel.
- Textos nao podem sobrepor cards, imagens ou botoes.
- Cards devem manter dimensoes estaveis.
- Tabelas admin devem usar scroll horizontal controlado.
- Imagens preservam proporcao e exibem fallback.
- Tema claro e escuro precisam permanecer legiveis.

## Publico

- Home: hero, slideshow, CTAs e secoes abaixo sem corte.
- Catalogo: filtros, cards, paginacao e menu de catalogo.
- Produto: galeria, preco, badges e CTA.
- Collabs: cards de collab e catalogo exclusivo.
- Pre-vendas: cards, selecao, total e checkout.
- Acervo Raro: slideshow, cards, detalhe e imagens.
- Rifas: cards, grade de numeros e checkout.
- Login/cadastro/reset: formularios legiveis.

## Cliente

- `/conta`: resumo e dados.
- `/conta/pedidos-v2`: competencias como dropdown/agrupamento, selecao parcial e pagamento.
- Pedidos pagos sem checkbox.
- Mensagens de estado vazio/erro.
- Rifas do cliente.
- Pre-vendas/reservas quando aplicavel.

## Admin

- Sidebar nao deve ocupar espaco demais em desktop pequeno.
- Dashboard com cards sem valor quebrando.
- Clientes sem tabela cortada.
- Produtos 2.0 alternando catalogo/collab sem redimensionar pagina de forma estranha.
- Pre-vendas com cadastro e agregados visiveis.
- Acervo Raro com lista e manutencao sem cortar botoes.
- Recebimento com filtros, resumo por produto e lista de pedidos sem corte.
- Pedidos V2 com formulario e tabela dentro da largura disponivel.
- Rifas com metricas, ranking, sorteio e lista de compradores.
- Relatorios com Fechamento, BI e Financeiro filtrando por competencia.

## Validacao tecnica

```bash
cd web
npm run lint
npm run build
```

Tambem conferir console do navegador:

- sem erro de hydration;
- sem warnings de chave duplicada em listas;
- sem erro de HMR permanente;
- sem falha de API inesperada.
