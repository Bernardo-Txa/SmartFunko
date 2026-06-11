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
- BI de estoque, margem por linha e alertas configuraveis;
- multi-moeda, rateio complexo e tracking automatico para lotes/importacao.
- tela operacional para revisar `payment_provider_events.processing_status = manual_review`.

## Conta do cliente futuro

Conta do Cliente 1.1 permite edicao basica de nome, telefone, CPF e Instagram e corrige o saldo pendente para ignorar pedidos recusados, cancelados, reembolsados ou em analise. Permanecem fora desta sprint:

- fluxo seguro de alteracao de e-mail no Supabase Auth;
- historico/auditoria especifica para alteracoes feitas pelo proprio cliente;
- validacao completa de CPF com digito verificador;
- mascara visual persistente para telefone/CPF;
- edicao de endereco, data de nascimento ou preferencias, pois esses campos ainda nao existem no schema atual;
- testes automatizados cobrindo todos os cenarios de saldo pendente.

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

## Rifas DEV 1.2 nao produtivas

Rifas DEV 1.2 existe atras de `NEXT_PUBLIC_ENABLE_RAFFLES` para validacao academica/interna de telas e fluxo operacional. A sprint adiciona link InfinitePay, webhook e pontos, mas o fluxo principal ainda nao exige autorizacao governamental, codigo/link de autorizacao ou aceite legal para criar/abrir campanha em ambiente dev. Permanecem pendentes antes de qualquer uso produtivo:

- revisao juridica/compliance por jurisdicao e tipo de promocao;
- processo regulatorio real quando aplicavel, fora do contexto academico/dev;
- idempotencia transacional mais forte para reserva, confirmacao de pagamento, caixa e cancelamento;
- reconciliacao operacional de eventos InfinitePay em `manual_review`;
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

## SEO futuro

SEO/Open Graph 1.0 cobre metadata, fallback OG, sitemap controlado, robots e JSON-LD basico. Permanecem pendentes:

- sitemap paginado ou por fonte dedicada quando o catalogo ultrapassar o limite inicial de produtos recentes;
- validacao automatizada de dimensoes e acessibilidade publica das imagens externas de produto/rifa/fornecedor;
- imagem OG dinamica por produto/rifa se o volume justificar;
- schema mais rico para Organization, BreadcrumbList e colecoes;
- testes automatizados de metadata renderizada por rota.

## Hardening futuro

Validação + Hardening de Produção 1.0 cobriu auditoria de rotas, RLS, feature flags, service role, webhook e BI. Permanecem pendentes:

- testes automatizados de autorização para `/api/v1/admin/*` e `/api/v1/me/*`;
- testes automatizados para webhook InfinitePay duplicado, valor divergente e rifa expirada;
- rotina administrativa para tratar eventos `manual_review`;
- rate limiting para endpoints sensiveis de cliente e webhook;
- auditoria de logs para mascarar CPF/telefone em todas as telas futuras;
- playbook de incidentes para segredo vazado, webhook invalido e pagamento conciliado incorretamente.

## Responsividade futura

Responsividade Final / Mobile Browser 1.0 priorizou navegacao, toque, cards, tabelas e fluxos criticos em navegador mobile. Permanecem pendentes para um ciclo futuro:

- cobertura visual automatizada por viewport e tema;
- transformar tabelas admin de maior uso em cards mobile quando houver uso operacional frequente em celular;
- padrao reutilizavel para modais com rodape fixo e scroll interno;
- refinamento fino de graficos BI com datasets muito grandes em telas de 360px;
- auditoria manual periodica em dispositivos reais de WhatsApp/Instagram in-app browser.

## Produto rapido no pedido futuro

O produto rapido cria produto ativo e variante `national/order_only`, sem estoque automatico. Pendencias:

- upload direto de imagem no modal, alem de URL;
- campo realmente interno para observacao quando houver coluna propria;
- testes automatizados do endpoint e do combobox;
- UX de reaproveitamento de produto parecido antes de criar duplicado.

## Mobile futuro

Mobile MVP Cliente 0.2 conectou home, catalogo, produto e carrinho local aos endpoints publicos de produto do backend web. Permanecem pendentes:

- persistir carrinho local, se a experiencia exigir retomada apos fechar o app;
- conectar rifas, clube e perfil a APIs reais;
- revisar fluxo de reset/cadastro de senha no Supabase Auth;
- adicionar testes de widget para rotas autenticadas com mocks;
- configurar Android SDK, Chrome/Chromium e Xcode nos ambientes de build;
- criar icone, splash, screenshots, privacy policy e termos para lojas;
- revisar acessibilidade visual em dispositivos reais de 360px;
- preparar builds release Android/iOS somente depois da integracao de dados.

Mobile MVP Cliente 0.3 criou pedido real pelo carrinho e conectou Meus Pedidos. Permanecem pendentes:

- persistir carrinho entre sessoes;
- tratar renovacao/expiracao de sessao com fluxo dedicado;
- criar testes widget/integracao com repositorios mockados para checkout e pedidos;
- evoluir pagamento/link InfinitePay no app em etapa futura.

Mobile MVP Cliente 0.4 conectou rifas reais experimentais. Permanecem pendentes:

- revisar compliance/legal antes de qualquer uso produtivo;
- melhorar detalhe de minhas rifas com tela dedicada por reserva;
- testar concorrencia de reserva com casos automatizados;
- evoluir pagamento de rifa no app somente via backend/webhook;
- Clube real entra na 0.5.

## CORS mobile futuro

Mobile 0.2.1 adicionou allowlist de CORS para APIs publicas e `/api/v1/me/*`, preservando admin fora do escopo mobile. Permanecem pendentes:

- revisar origens finais quando houver dominio proprio fora da Vercel;
- decidir se apps nativos usarao somente HTTPS direto sem depender de CORS, mantendo Flutter Web como principal consumidor CORS;
- adicionar testes automatizados de OPTIONS/headers para rotas publicas e de cliente;
- revisar allowlist quando existir admin mobile explicito.

## Imagens externas mobile futuro

Mobile 0.2.2 adicionou proxy seguro para imagens externas que falham em Flutter Web por CORS de CDN. Permanecem pendentes:

- migrar imagens externas relevantes para Supabase Storage ou CDN proprio;
- padronizar upload/importacao no bucket `product-images`;
- adicionar testes automatizados para bloqueios SSRF do proxy;
- revisar a allowlist quando novos fornecedores/CDNs forem adicionados.

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
- Criar rotina admin de backfill de pontos para pagamentos antigos antes de ativar o Clube em producao real.
- Evoluir rewards para RPC transacional se pontos, badges e ranking virarem regra promocional sensivel.
- Criar fluxo financeiro completo de reembolso/cancelamento de rifa paga antes de liberar cancelamento produtivo de rifa já paga; hoje pontos de rifa paga sao concedidos e a reversao existe no service para quando houver fluxo operacional de reembolso.
- Preparar Flutter mobile depois da V1 web/admin.
- Manter Gamificacao / Clube Smart Funkos no radar como modulo futuro.
- Evoluir Rifas DEV 1.2 apenas depois de resolver compliance, notificacoes, sorteio auditavel, revisao manual de pagamentos atrasados e reembolso.
- Planejar leilao e notificacoes automaticas fora do MVP operacional.
- Enriquecer metadados de marcas no importador quando cada parceiro exigir campos proprios alem de `supplier_id`.
