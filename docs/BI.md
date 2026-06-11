# BI SmartFunko

## Fontes

- `cash_entries`
- `orders`
- `order_items`
- `payments`
- `raffle_orders`
- `monthly_order_rankings`
- `monthly_order_ranking_entries`

## Regras

- receita confirmada usa vendas pagas e validas;
- pedidos `under_review`, `rejected`, `cancelled` e `refunded` ficam fora da receita confirmada;
- receita pendente considera apenas pedidos cobraveis com valor em aberto;
- rifas usam `raffle_orders` pagas como fonte unica do BI;
- caixa continua vindo de `cash_entries`;
- o BI nao soma a mesma rifa em duas fontes ao mesmo tempo;
- pedidos com pagamento manual aparecem como `Manual`;
- InfinitePay e separado quando o metodo permitir, com Pix e Cartao agrupados.

## Filtros

- periodo;
- vendedor;
- origem;
- metodo.

## Telas

- `/admin/relatorios`
- `/admin/bi`
- `/admin/relatorios/financeiro`

## Limites

- agregacoes no servidor;
- top lists limitadas;
- sem exportacao avancada nesta sprint;
- sem previsao com IA;
- sem contabilidade fiscal.
