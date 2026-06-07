# Divida tecnica SmartFunko

## Registro de pagamento manual ainda nao transacional

Hoje o fluxo de pagamento manual cria `payments`, `cash_entries`, atualiza status do pedido e registra log em etapas separadas.

Risco:

- pagamento criado e caixa nao criado;
- caixa criado e status nao atualizado;
- historico incompleto em caso de erro intermediario.

Solucao futura:

Criar uma RPC Postgres `record_manual_payment(...)` para executar o fluxo inteiro em uma unica transacao.

## Movimentos de estoque ainda nao transacionais

O Estoque 2.0 registra `inventory_movements` a partir dos services Next.js depois das mutacoes em `inventory_items` e, em alguns fluxos, depois do vinculo com `order_items`.

Risco:

- estoque alterado e movimento nao registrado em caso de erro intermediario;
- reserva/liberacao de estoque e item de pedido ficarem temporariamente divergentes em falha de rede ou concorrencia;
- auditoria administrativa e movimento de estoque nao serem gravados no mesmo commit.

Solucao futura:

Criar RPCs Postgres para `reserve_inventory_item`, `release_inventory_item`, `adjust_inventory_item` e `mark_inventory_item_sold`, garantindo estoque, pedido, movimento e log administrativo em uma unica transacao.

## Proxima sprint

- Remover tambem o arquivo fisico do Supabase Storage quando uma imagem for removida da galeria. Hoje a remocao apaga o registro de `product_images` e preserva o objeto no bucket para evitar inconsistencias fora de transacao.
- Evoluir BI de estoque com aging detalhado, margem por linha, giro por fornecedor e alertas configuraveis.
- Melhorar editor de produto com upload, historico visual de alteracoes e validacoes de SEO.
- Evoluir imagens com alt text, compressao/resize server-side e validacao de dimensoes quando o volume justificar.
- Transformar carrinho assistido em checkout real somente quando frete, pagamento, reserva temporaria e regras de estoque estiverem definidos.
- Criar pedido `draft` a partir do carrinho apenas depois de validar que nao reserva estoque automaticamente.
- Evoluir `/admin/demanda` com notificacoes manuais/automaticas para interessados e criacao controlada de encomendas.
- Automatizar Pix e baixa de pagamento.
- Criar checkout proprio apenas depois do fluxo WhatsApp estabilizar.
- Melhorar wishlist com prioridade/preco desejado editaveis pelo cliente.
- Preparar Flutter mobile depois da V1 web/admin.
- Manter Gamificacao / Clube Smart Funkos no radar como modulo futuro.
- Planejar leilao, rifa/campanha e notificacoes automaticas fora do MVP operacional.
- Enriquecer metadados de marcas no importador quando cada parceiro exigir campos proprios alem de `supplier_id`.
