# Divida tecnica SmartFunko

## Registro de pagamento manual ainda nao transacional

Hoje o fluxo de pagamento manual cria `payments`, `cash_entries`, atualiza status do pedido e registra log em etapas separadas.

Risco:

- pagamento criado e caixa nao criado;
- caixa criado e status nao atualizado;
- historico incompleto em caso de erro intermediario.

Solucao futura:

Criar uma RPC Postgres `record_manual_payment(...)` para executar o fluxo inteiro em uma unica transacao.

## Proxima sprint

- Remover tambem o arquivo fisico do Supabase Storage quando uma imagem for removida da galeria. Hoje a remocao apaga o registro de `product_images` e preserva o objeto no bucket para evitar inconsistencias fora de transacao.
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
