# Divida tecnica SmartFunko

## Movimentos de estoque ainda nao transacionais

O Estoque 2.0 registra `inventory_movements` a partir dos services Next.js depois das mutacoes em `inventory_items` e, em alguns fluxos, depois do vinculo com `order_items`.

Risco:

- estoque alterado e movimento nao registrado em caso de erro intermediario;
- reserva/liberacao de estoque e item de pedido ficarem temporariamente divergentes em falha de rede ou concorrencia;
- auditoria administrativa e movimento de estoque nao serem gravados no mesmo commit.

Solucao futura:

Criar RPCs Postgres para `reserve_inventory_item`, `release_inventory_item`, `adjust_inventory_item` e `mark_inventory_item_sold`, garantindo estoque, pedido, movimento e log administrativo em uma unica transacao.

## Financeiro futuro

Financeiro 2.0 cobre baixa manual transacional, estorno manual total, caixa e relatorio basico. Permanecem fora do MVP:

- estorno parcial manual;
- idempotency key para pagamentos manuais duplicados;
- conciliacao financeira;
- tratamento produtivo de todos os status/eventos reais da InfinitePay alem do webhook aprovado;
- assinatura de webhook dependente do header real disponibilizado pela conta InfinitePay;
- nota fiscal;
- checkout completo.
- BI avancado;
- multi-moeda, rateio complexo e tracking automatico para lotes/importacao.

## Lotes / Importacao futuro

Lotes 1.0 organiza compras e encomendas, mas ainda evita automacoes de alto risco.

Pendencias:

- criar `inventory_items` automaticamente no recebimento quando houver SKU/localizacao por unidade;
- registrar `inventory_movements` de recebimento junto com a criacao automatica de estoque;
- ratear frete, imposto e custos gerais por item;
- multi-moeda e cotacao por lote;
- imposto automatico;
- tracking externo;
- integracao com fornecedor;
- baixa financeira automatica para despesas do lote;
- RPC transacional para recebimento de lote, itens, pedido, estoque e logs.

## Rifas DEV 1.1 nao produtivas

Rifas DEV 1.1 existe atras de `NEXT_PUBLIC_ENABLE_RAFFLES` para validacao academica/interna de telas e fluxo operacional. O fluxo principal nao exige autorizacao governamental, codigo/link de autorizacao ou aceite legal para criar/abrir campanha em ambiente dev. Permanecem pendentes antes de qualquer uso produtivo:

- revisao juridica/compliance por jurisdicao e tipo de promocao;
- processo regulatorio real quando aplicavel, fora do contexto academico/dev;
- gateway/Pix e conciliacao automatica;
- idempotencia forte para reserva, confirmacao de pagamento e cancelamento;
- reembolso de pedido de rifa pago;
- notificacoes de reserva, expiracao, pagamento e resultado;
- sorteio certificado/auditavel ou integracao externa confiavel;
- logs transacionais para todos os passos de reserva, pagamento, cancelamento e sorteio;
- rotina operacional agendada para expiracao de reservas;
- testes automatizados de concorrencia para reserva de numeros.

## Tema claro/escuro futuro

O Light Mode usa as variaveis globais e cobre a navegacao, base visual e formularios principais. Pendencias:

- refinamento visual completo de componentes muito customizados com classes escuras fixas; a sprint atual usa overrides globais de Light Mode para manter legibilidade;
- revisao fina de contraste de todos os badges/status em Light Mode;
- cobertura visual automatizada de paginas publicas e admin nos dois temas.

## Produto rapido no pedido futuro

O produto rapido cria produto ativo e variante `national/order_only`, sem estoque automatico. Pendencias:

- upload direto de imagem no modal, alem de URL;
- campo realmente interno para observacao quando houver coluna propria;
- testes automatizados do endpoint e do combobox;
- UX de reaproveitamento de produto parecido antes de criar duplicado.

## Proxima sprint

- Remover tambem o arquivo fisico do Supabase Storage quando uma imagem for removida da galeria. Hoje a remocao apaga o registro de `product_images` e preserva o objeto no bucket para evitar inconsistencias fora de transacao.
- Evoluir BI de estoque com aging detalhado, margem por linha, giro por fornecedor e alertas configuraveis.
- Melhorar editor de produto com upload, historico visual de alteracoes e validacoes de SEO.
- Evoluir imagens com alt text, compressao/resize server-side e validacao de dimensoes quando o volume justificar.
- Refinar Light Mode em componentes comerciais muito customizados.
- Evoluir produto rapido no pedido com upload de imagem direto.
- Transformar carrinho assistido em checkout real somente quando frete, pagamento, reserva temporaria e regras de estoque estiverem definidos.
- Evoluir Checkout Assistido 1.0 com expiracao de links, observabilidade, conciliacao periodica e testes automatizados de webhook/payment_check.
- Evoluir `/admin/demanda` com notificacoes manuais/automaticas para interessados e criacao controlada de encomendas.
- Automatizar Pix/cartao apenas pelo fluxo aprovado de gateway e webhook; manter redirect como informativo, nao confirmatorio.
- Criar checkout proprio interno apenas depois do fluxo de carrinho assistido, cupons e pagamento por link estabilizar.
- Tornar o incremento de uso de cupom totalmente transacional via RPC se houver alto volume ou concorrencia real.
- Preparar Flutter mobile depois da V1 web/admin.
- Manter Gamificacao / Clube Smart Funkos no radar como modulo futuro.
- Evoluir Rifas DEV 1.1 apenas depois de resolver compliance, pagamento automatico, notificacoes, sorteio auditavel e reembolso.
- Planejar leilao e notificacoes automaticas fora do MVP operacional.
- Enriquecer metadados de marcas no importador quando cada parceiro exigir campos proprios alem de `supplier_id`.
