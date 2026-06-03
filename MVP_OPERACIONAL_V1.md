# Smart Funkos - MVP Operacional V1

## 1. Decisao principal

A primeira versao da Smart Funkos nao sera um e-commerce completo.

O objetivo da V1 e criar uma operacao assistida por tecnologia, mantendo as vendas pelo WhatsApp no primeiro momento, mas tirando do WhatsApp a responsabilidade de controlar estoque, pedidos, pagamentos, clientes e caixa.

O WhatsApp continua sendo o canal de conversa e fechamento.

O sistema passa a ser a fonte oficial da operacao.

## 2. Objetivo da V1

Criar uma base operacional para que a Smart Funkos consiga:

- publicar produtos em um catalogo online;
- direcionar interessados para o WhatsApp com contexto do produto;
- permitir cadastro e login de clientes;
- cadastrar clientes;
- criar pedidos vindos do WhatsApp;
- vincular pedidos ao cliente autenticado;
- reservar estoque;
- registrar pagamentos manuais;
- acompanhar status de pedido e item;
- manter historico de pedidos na conta do cliente;
- controlar entradas de caixa;
- permitir que o cliente acompanhe o pedido por link;
- reduzir controle manual em conversa, anotacao solta ou planilha.

## 3. Frase guia do MVP

Cliente escolhe no site, compra pelo WhatsApp, acompanha pela conta e a Smart Funkos controla tudo pelo admin.

## 4. Fluxo principal

1. Cliente acessa o site da Smart Funkos.
2. Cliente navega pelo catalogo.
3. Cliente abre a pagina de um produto.
4. Cliente pode criar conta ou fazer login.
5. Cliente clica em "Comprar pelo WhatsApp".
6. O WhatsApp abre com mensagem pronta contendo:
   - nome do produto;
   - SKU ou codigo interno;
   - preco;
   - link do produto;
   - interesse em comprar ou consultar disponibilidade.
7. Atendente conversa com o cliente no WhatsApp.
8. Admin cadastra, atualiza ou vincula o cliente existente.
9. Admin cria o pedido.
10. Admin adiciona itens ao pedido.
11. Sistema reserva estoque quando o item for pronta-entrega.
12. Admin registra pagamento manual quando receber.
13. Sistema atualiza status do pedido.
14. Sistema gera entrada no caixa.
15. Pedido aparece na conta do cliente, se houver login vinculado.
16. Cliente tambem pode receber link para acompanhar o pedido pelo WhatsApp.

## 5. Escopo da V1

### 5.1 Site publico

O site publico deve conter:

- home simples com destaques;
- catalogo de produtos;
- busca por texto;
- filtro por franquia/categoria;
- filtro por disponibilidade;
- pagina de produto;
- galeria de imagens;
- preco;
- condicao do item;
- tipo do item;
- disponibilidade;
- botao de WhatsApp inteligente;
- entrada para login/cadastro;
- acesso para "Minha conta";
- link para Instagram;
- paginas institucionais basicas.

Paginas publicas minimas:

- `/`
- `/catalogo`
- `/produto/[slug]`
- `/login`
- `/cadastro`
- `/conta`
- `/conta/pedidos`
- `/conta/pedidos/[orderNumber]`
- `/sobre`
- `/politica-de-envio`
- `/trocas-e-devolucoes`
- `/privacidade`
- `/pre-venda-e-encomendas`

### 5.2 WhatsApp inteligente

Cada produto deve ter um botao de WhatsApp com mensagem pre-preenchida.

Exemplo de mensagem:

```text
Oi! Tenho interesse neste produto da Smart Funkos:

Produto: Funko Pop! One Piece Luffy Gear Five
Codigo: SF-OP-0001
Preco: R$ 199,90
Link: https://smartfunko.com.br/produto/funko-pop-one-piece-luffy-gear-five

Pode me confirmar disponibilidade?
```

Regras:

- o numero oficial deve ficar configurado por variavel de ambiente;
- a mensagem deve ser gerada com dados reais do produto;
- produtos indisponiveis podem usar CTA de consulta ou wishlist;
- o clique deve ser rastreavel no futuro.

### 5.3 Admin

O admin deve permitir:

- login de administradores;
- visao geral da operacao;
- cadastro de produtos;
- cadastro de franquias/categorias;
- upload de imagens;
- cadastro de variantes;
- controle de estoque;
- cadastro de clientes;
- criacao de pedidos manuais;
- adicao de itens no pedido;
- alteracao de status do pedido;
- alteracao de status do item;
- registro de pagamento manual;
- visualizacao de caixa basico;
- logs administrativos.

Rotas administrativas minimas:

- `/admin`
- `/admin/login`
- `/admin/dashboard`
- `/admin/produtos`
- `/admin/produtos/novo`
- `/admin/produtos/[id]`
- `/admin/clientes`
- `/admin/clientes/[id]`
- `/admin/pedidos`
- `/admin/pedidos/novo`
- `/admin/pedidos/[id]`
- `/admin/estoque`
- `/admin/pagamentos`
- `/admin/caixa`

### 5.4 Area do cliente

A V1 deve ter cadastro e login de cliente.

O cliente autenticado deve conseguir:

- criar conta com nome, e-mail, telefone e senha;
- fazer login;
- sair da conta;
- ver dados basicos do proprio perfil;
- ver lista de pedidos vinculados ao cadastro;
- abrir detalhe de pedido;
- acompanhar status geral do pedido;
- acompanhar status de cada item;
- ver pagamentos registrados;
- ver pendencias;
- alterar dados basicos de contato, quando permitido.

Rotas minimas da area do cliente:

- `/login`
- `/cadastro`
- `/conta`
- `/conta/pedidos`
- `/conta/pedidos/[orderNumber]`

Regras:

- cliente autenticado so pode ver os proprios pedidos;
- admin pode vincular um pedido manual a um cliente ja cadastrado;
- telefone e e-mail devem ajudar a evitar cadastro duplicado;
- pedido criado pelo admin deve aparecer na conta do cliente quando houver vinculo;
- conta do cliente nao substitui o WhatsApp na V1, apenas organiza historico e acompanhamento.
- link publico de pedido deve exigir token e nao deve depender de login.

### 5.5 Link de acompanhamento do pedido

O cliente deve poder acompanhar o pedido por um link enviado pelo WhatsApp.

Esse link existe mesmo para clientes que ainda nao criaram conta.

Exemplo:

```text
https://smartfunko.com.br/pedido/SF-2026-000123?token=...
```

A pagina deve mostrar:

- numero do pedido;
- nome do cliente;
- itens do pedido;
- status geral do pedido;
- status de cada item;
- valores;
- pagamentos registrados;
- pendencias;
- observacoes publicas;
- data de atualizacao.

Essa pagina nao deve expor dados sensiveis.

## 6. Fora do escopo da V1

Na V1, nao implementar:

- carrinho;
- checkout automatico;
- Pix automatico;
- cartao de credito;
- frete automatico;
- app Flutter;
- leiloes;
- cashback;
- clube de vantagens;
- integracao oficial com WhatsApp Business API;
- nota fiscal;
- BI avancado;
- sistema de afiliados;
- marketplace;
- multi-loja.

Esses itens entram depois que o core operacional estiver funcionando.

## 7. Modelo de dados minimo

### 7.1 profiles

Usuarios autenticados do sistema.

Campos minimos:

- `id`
- `auth_user_id`
- `name`
- `email`
- `role`
- `created_at`
- `updated_at`

Roles:

- `customer`
- `owner`

Observacao: `admin` pode existir como valor legado/reservado no banco. A V1 operacional usa `owner` para novos usuarios internos, e `admin` permanece aceito apenas por compatibilidade temporaria.

### 7.2 customers

Clientes atendidos pelo WhatsApp ou site.

Campos minimos:

- `id`
- `profile_id`
- `name`
- `email`
- `phone`
- `cpf`
- `instagram`
- `status`
- `notes`
- `created_at`
- `updated_at`

Status:

- `active`
- `vip`
- `blocked`

### 7.3 franchises

Franquias, linhas ou categorias principais.

Campos minimos:

- `id`
- `name`
- `slug`
- `image_url`
- `status`
- `created_at`
- `updated_at`

### 7.4 products

Produto base publicado no catalogo.

Campos minimos:

- `id`
- `name`
- `slug`
- `franchise_id`
- `funko_number`
- `description`
- `main_image_url`
- `status`
- `seo_title`
- `seo_description`
- `created_at`
- `updated_at`

Status:

- `active`
- `inactive`
- `archived`

### 7.5 product_variants

Variacoes vendaveis do produto.

Campos minimos:

- `id`
- `product_id`
- `sku`
- `condition`
- `type`
- `source`
- `sale_price`
- `market_price`
- `estimated_cost`
- `status`
- `created_at`
- `updated_at`

Condition:

- `new`
- `used`
- `damaged_box`

Type:

- `common`
- `exclusive`
- `chase`
- `glow`
- `special`

Source:

- `own_stock`
- `national`
- `international`
- `preorder`

Status:

- `available`
- `order_only`
- `preorder`
- `sold_out`
- `hidden`

### 7.6 product_images

Imagens extras do produto.

Campos minimos:

- `id`
- `product_id`
- `image_url`
- `sort_order`
- `created_at`

### 7.7 inventory_items

Controle de estoque por unidade.

Campos minimos:

- `id`
- `product_variant_id`
- `sku`
- `status`
- `location`
- `purchase_cost`
- `landed_cost`
- `reserved_for_order_item_id`
- `notes`
- `created_at`
- `updated_at`

Status:

- `available`
- `reserved`
- `sold`
- `in_transit`
- `damaged`
- `unavailable`

### 7.8 orders

Pedido criado pelo admin a partir de atendimento.

Campos minimos:

- `id`
- `order_number`
- `customer_id`
- `channel`
- `status`
- `subtotal`
- `discount`
- `shipping_amount`
- `total`
- `public_token`
- `notes`
- `internal_notes`
- `created_by`
- `created_at`
- `updated_at`

Channel:

- `whatsapp`
- `website`
- `admin`
- `preorder`

Status:

- `draft`
- `pending_payment`
- `partially_paid`
- `paid`
- `processing`
- `ready_to_ship`
- `shipped`
- `delivered`
- `cancelled`
- `refunded`

### 7.9 order_items

Itens do pedido com status proprio.

Campos minimos:

- `id`
- `order_id`
- `product_variant_id`
- `inventory_item_id`
- `quantity`
- `unit_price`
- `total_price`
- `cost_estimate`
- `final_cost`
- `source`
- `status`
- `created_at`
- `updated_at`

Source:

- `stock`
- `national_order`
- `international_order`
- `preorder`

Status:

- `requested`
- `reserved`
- `waiting_payment`
- `paid`
- `waiting_purchase`
- `purchased`
- `in_transit`
- `received`
- `ready_to_ship`
- `shipped`
- `delivered`
- `cancelled`

### 7.10 payments

Pagamentos registrados manualmente.

Campos minimos:

- `id`
- `order_id`
- `customer_id`
- `method`
- `amount`
- `fee_amount`
- `net_amount`
- `status`
- `paid_at`
- `created_by`
- `created_at`

Method:

- `pix`
- `credit_card`
- `debit_card`
- `cash`
- `manual`

Status:

- `pending`
- `paid`
- `failed`
- `cancelled`
- `refunded`

### 7.11 cash_entries

Entradas e saidas basicas de caixa.

Campos minimos:

- `id`
- `type`
- `category`
- `order_id`
- `payment_id`
- `amount`
- `description`
- `occurred_at`
- `created_by`
- `created_at`

Type:

- `income`
- `expense`
- `adjustment`

Category:

- `sale`
- `supplier_purchase`
- `shipping`
- `payment_fee`
- `refund`
- `manual_adjustment`

### 7.12 admin_action_logs

Historico de acoes relevantes.

Campos minimos:

- `id`
- `admin_id`
- `action`
- `entity_type`
- `entity_id`
- `old_value`
- `new_value`
- `created_at`

## 8. Regras de negocio da V1

### 8.1 Produto

- Produto ativo aparece no catalogo.
- Produto inativo nao aparece no catalogo.
- Produto arquivado nao deve ser usado em novos pedidos.
- Produto pode ter mais de uma variante.
- Variante define preco e disponibilidade comercial.

### 8.2 Estoque

- Item disponivel pode ser reservado.
- Item reservado nao aparece como disponivel.
- Item vendido nao pode ser vendido novamente.
- Cancelamento de pedido deve liberar item reservado, se aplicavel.
- Toda alteracao manual de estoque deve gerar log.

### 8.3 Pedido

- Todo pedido deve ter cliente.
- Todo pedido deve ter pelo menos um item para sair de rascunho.
- Pedido pode ter pagamento parcial.
- Pedido pago deve gerar entrada no caixa.
- Pedido cancelado deve liberar estoque reservado.
- Status do pedido e status dos itens podem evoluir separadamente.

### 8.4 Pagamento

- Pagamento manual exige acesso interno; novos usuarios internos devem usar `owner`, com `admin` aceito apenas por compatibilidade legada.
- Pagamento confirmado gera `cash_entry`.
- Pagamento parcial atualiza pedido para `partially_paid`.
- Pagamento total atualiza pedido para `paid`.
- Estorno deve gerar lancamento negativo no caixa.

### 8.5 Cliente

- Cliente pode criar conta no site.
- Cliente autenticado deve ter um `profile`.
- Cliente pode ter um registro em `customers` vinculado ao `profile`.
- Cliente autenticado so pode ver os proprios pedidos.
- Admin pode vincular pedido manual a cliente cadastrado.
- Cliente bloqueado nao deve ter novo pedido criado.
- Cliente pode ter historico de pedidos.
- E-mail e telefone devem ser usados para reduzir duplicidade de cadastro.
- Dados sensiveis nao devem aparecer no link publico de acompanhamento.

## 9. API inicial

A API deve ser versionada em `/api/v1`.

Endpoints minimos:

### Auth

- `POST /api/v1/auth/register`
- `POST /api/v1/auth/session`
- `GET /api/v1/auth/me`
- `POST /api/v1/auth/logout`
- `POST /api/v1/auth/password-reset`

### Public catalog

- `GET /api/v1/public/products`
- `GET /api/v1/public/products/:slug`
- `GET /api/v1/public/franchises`

### Customers

- `GET /api/v1/customers`
- `GET /api/v1/customers/:id`
- `POST /api/v1/customers`
- `PATCH /api/v1/customers/:id`

### Customer account

- `GET /api/v1/me`
- `PATCH /api/v1/me`
- `GET /api/v1/me/orders`
- `GET /api/v1/me/orders/:orderNumber`
- `GET /api/v1/me/payments`

### Products

- `GET /api/v1/products`
- `GET /api/v1/products/:id`
- `POST /api/v1/products`
- `PATCH /api/v1/products/:id`

### Inventory

- `GET /api/v1/inventory`
- `POST /api/v1/inventory`
- `POST /api/v1/inventory/:id/reserve`
- `POST /api/v1/inventory/:id/release`
- `POST /api/v1/inventory/:id/mark-sold`

### Orders

- `GET /api/v1/orders`
- `GET /api/v1/orders/:id`
- `POST /api/v1/orders`
- `PATCH /api/v1/orders/:id`
- `POST /api/v1/orders/:id/cancel`
- `POST /api/v1/orders/:id/items`
- `PATCH /api/v1/order-items/:id/status`
- `GET /api/v1/public/orders/:orderNumber`

### Payments

- `GET /api/v1/payments`
- `POST /api/v1/payments/manual`

### Cashflow

- `GET /api/v1/cashflow`
- `GET /api/v1/cashflow/summary`

## 10. Dashboard V1

O dashboard admin deve mostrar:

- vendas do dia;
- recebido no dia;
- pendente a receber;
- pedidos novos;
- pedidos aguardando pagamento;
- pedidos pagos;
- pedidos em andamento;
- produtos disponiveis;
- produtos reservados;
- produtos vendidos no mes.

## 11. Stack recomendada

### Web, admin e API

- Next.js
- TypeScript
- App Router
- Route Handlers
- Server Actions quando fizer sentido
- Tailwind CSS ou outro design system escolhido no inicio

### Banco, auth e storage

- Supabase Postgres
- Supabase Auth
- Supabase Storage
- Supabase RLS

### Hospedagem

- Vercel para Next.js
- Supabase para banco, auth e storage

## 12. Estrutura inicial de repositorio

```text
smartfunko/
  web/
    src/
      app/
        page.tsx
        catalogo/
        produto/[slug]/
        login/
        cadastro/
        conta/
          page.tsx
          pedidos/
        pedido/[orderNumber]/
        admin/
        api/
          v1/
      components/
      lib/
      modules/
      types/

  supabase/
    migrations/
    seed/
    policies/

  docs/
    MVP_OPERACIONAL_V1.md
    database.md
    api.md
    business-rules.md
```

## 13. Ordem de implementacao

### Sprint 1 - Fundacao

- Criar projeto Next.js.
- Configurar TypeScript.
- Configurar estilo base.
- Criar projeto Supabase.
- Configurar variaveis de ambiente.
- Criar migrations iniciais.
- Configurar Supabase Auth.
- Criar roles customer e owner.
- Criar cadastro e login base.
- Criar layout publico.
- Criar layout admin.
- Criar layout da area do cliente.

### Sprint 2 - Catalogo

- Criar tabelas de franquias.
- Criar tabelas de produtos.
- Criar variantes.
- Criar imagens.
- Criar admin de produtos.
- Criar catalogo publico.
- Criar pagina de produto.
- Criar botao WhatsApp inteligente.

### Sprint 3 - Clientes e pedidos

- Criar cadastro de clientes.
- Criar listagem de clientes.
- Criar area "Minha conta".
- Criar listagem "Meus pedidos".
- Criar pedido manual.
- Vincular pedido a cliente cadastrado.
- Adicionar itens ao pedido.
- Calcular subtotal, desconto, frete e total.
- Gerar numero de pedido.
- Gerar token publico de acompanhamento.

### Sprint 4 - Estoque

- Criar controle de unidades.
- Reservar item em pedido.
- Liberar reserva.
- Marcar item como vendido.
- Bloquear venda duplicada.
- Registrar logs de estoque.

### Sprint 5 - Pagamentos e caixa

- Registrar pagamento manual.
- Permitir pagamento parcial.
- Atualizar status financeiro do pedido.
- Gerar entrada de caixa automatica.
- Criar tela de caixa basico.
- Criar resumo do dashboard.

### Sprint 6 - Area do cliente e acompanhamento

- Criar pagina publica de pedido com token.
- Criar detalhe autenticado do pedido em "Minha conta".
- Mostrar status geral.
- Mostrar status por item.
- Mostrar pagamentos.
- Mostrar pendencias.
- Preparar texto de envio por WhatsApp.
- Garantir que cliente autenticado veja somente os proprios pedidos.

## 14. Criterios de sucesso da V1

A V1 estara pronta quando:

- admin conseguir cadastrar produto com imagem e preco;
- produto ativo aparecer no catalogo publico;
- cliente conseguir criar conta e fazer login;
- cliente conseguir abrir WhatsApp com mensagem pronta do produto;
- admin conseguir cadastrar cliente;
- admin conseguir criar pedido vindo do WhatsApp;
- admin conseguir vincular pedido ao cliente cadastrado;
- admin conseguir adicionar itens ao pedido;
- sistema conseguir reservar estoque;
- sistema impedir venda duplicada de item reservado ou vendido;
- admin conseguir registrar pagamento manual;
- pagamento confirmado gerar caixa;
- cliente conseguir ver historico de pedidos na propria conta;
- cliente conseguir acompanhar pedido por link;
- dashboard mostrar indicadores basicos;
- WhatsApp deixar de ser o controle oficial da operacao.

## 15. Decisao para etapas futuras

Depois da V1, a evolucao natural deve seguir esta ordem:

1. Wishlist.
2. Perfil completo do cliente com enderecos.
3. Pre-venda e encomenda internacional com lote.
4. Carrinho e checkout.
5. Pix automatico.
6. Frete automatico.
7. Cupons.
8. App Flutter.
9. Leiloes.
10. Cashback e clube.

## 16. Riscos principais

- Escopo crescer antes do core operacional estar pronto.
- Tentar copiar um e-commerce completo logo no primeiro corte.
- Criar fluxo bonito no site, mas continuar controlando pedido por conversa.
- Nao controlar estoque por unidade e vender o mesmo item duas vezes.
- Nao registrar pagamento e caixa de forma consistente.
- Deixar logs administrativos para depois.

## 17. Proxima acao

Antes de codar, validar este documento e transformar em tarefas tecnicas.

Primeiras tarefas recomendadas:

1. Criar repositorio/projeto Next.js.
2. Criar projeto Supabase.
3. Escrever migrations do modelo minimo.
4. Criar layout publico.
5. Criar layout admin.
6. Implementar produtos e catalogo.
