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

- Criar upload real de imagens no painel; hoje o MVP usa URL externa em `main_image_url`.
- Completar tela de edicao detalhada de produto/variante.
- Automatizar Pix e baixa de pagamento.
- Criar checkout proprio apenas depois do fluxo WhatsApp estabilizar.
- Preparar Flutter mobile depois da V1 web/admin.
- Planejar leilao, rifa/campanha e notificacoes automaticas fora do MVP operacional.
