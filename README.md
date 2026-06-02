# SmartFunko

Projeto da Smart Funkos.

## Objetivo

Construir uma operacao assistida por tecnologia para vendas de colecionaveis.

Na V1, as vendas continuam pelo WhatsApp, mas o sistema passa a controlar:

- catalogo;
- clientes;
- pedidos;
- estoque;
- pagamentos manuais;
- caixa;
- acompanhamento do cliente.

## Documentacao inicial

- [MVP Operacional V1](./MVP_OPERACIONAL_V1.md)
- [Documento Tecnico Inicial](./Smart%20Funkos%20-%20Documento%20T%C3%A9cnico%20Inicial.pdf)

## Estrutura

- `web/`: site publico, area do cliente, admin e API Next.js.
- `supabase/`: migrations, seed e policies.
- `MVP_OPERACIONAL_V1.md`: escopo validado da primeira versao.

## Direcao da V1

Cliente escolhe no site, compra pelo WhatsApp, acompanha pela conta e a Smart Funkos controla tudo pelo admin.
