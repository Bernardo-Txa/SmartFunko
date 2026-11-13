# Lançamento mobile — base técnica e de segurança

Data-alvo do MVP Flutter: **15/12/2026**
Branch de preparação: `mobile-release-2026-12-15`
Escopo deste documento: diagnóstico, migrations locais de segurança e planejamento.
Fora desta etapa: aplicação em produção, migração de código Flutter e redesign do site.

## 1. Estado inicial do Git

- A branch foi criada a partir de `main` no commit `0340850`.
- O working tree estava limpo antes da criação das migrations.
- Nenhuma alteração preexistente foi sobrescrita.
- Nenhum comando de push/reset/repair de banco foi executado.

## 2. Inventário e divergência das migrations

Foram encontradas 48 migrations locais antes desta etapa e 49 migrations
registradas no Supabase de produção. Há 43 versões com correspondência exata.

| Migration lógica | Versão local | Versão em produção | Classificação após comparar conteúdo |
| --- | --- | --- | --- |
| `legal_acceptances` | `20261029120000` | `20261029154505` | Equivalente: SQL canônico idêntico |
| `monthly_customer_nfe` | `20261029143000` | `20261029155812` + `20261029155840` | Parcial no histórico, equivalente no estado final: os dois índices da segunda migration remota estão embutidos na local |
| `customer_address_fields` | `20261112120000` | `20261112210137` | Equivalente no efeito: diferença apenas em `IF NOT EXISTS` nos índices |
| `secure_signup_trigger_function` | `20261112121500` | `20261112210210` | Equivalente: SQL canônico idêntico |
| `ready_stock_module` | `20261112150000` | `20261112212336` | Equivalente: SQL canônico idêntico |

Não há objeto local ausente em produção. A migration remota
`monthly_customer_nfe_indexes` representa conteúdo já presente na migration
local `monthly_customer_nfe`. Enquanto esse drift
não for reconciliado, `supabase db push` não deve ser usado: ele pode interpretar
as versões locais como migrations pendentes e tentar reaplicar objetos existentes.

As migrations novas desta branch foram criadas pela CLI Supabase 2.104.0:

1. `20261112220637_preorder_rls_hardening.sql`
2. `20261112220803_catalog_views_security_invoker.sql`
3. `20261112220943_security_definer_function_privileges.sql`

Elas estão apenas no repositório local e não foram aplicadas em nenhum banco.

## 3. Mapa de acesso às tabelas de pré-venda

### 3.1 Estado observado em produção

As quatro tabelas estão no schema exposto `public`, com RLS desativada e nenhuma
policy. `anon`, `authenticated` e `service_role` têm atualmente `SELECT`,
`INSERT`, `UPDATE`, `DELETE`, `TRUNCATE`, `REFERENCES` e `TRIGGER`.

- `preorder_items`
- `preorder_item_images`
- `preorder_reservations`
- `preorder_reservation_items`

Isso permite que a Data API contorne as verificações de propriedade que hoje
existem apenas nas rotas e serviços do Next.js.

### 3.2 Componentes e rotas consumidoras

| Entrada | Serviço/operação | Papel do banco |
| --- | --- | --- |
| `/pre-vendas` | Lista itens abertos | `service_role` no servidor |
| `/admin/pre-vendas` | Lista, cria e edita itens/imagens | `service_role` no servidor |
| `/admin/pre-vendas/[id]` | Detalhe administrativo | `service_role` no servidor |
| `/conta/pedidos-v2` | Lista reservas pendentes do cliente | `service_role` no servidor |
| `POST /api/v1/me/preorders` | Cria reserva e checkout | `service_role` no servidor |
| `POST /api/v1/me/preorders/[id]/cancel` | Cancela reserva própria | `service_role` no servidor |
| `/api/v1/admin/preorders` | CRUD administrativo | `service_role` no servidor |
| `/api/v1/webhooks/infinitepay` | Confirma pagamento e cria pedido V2 | `service_role` no servidor |

O Flutter não acessa essas tabelas e pré-vendas nativas permanecem fora do MVP.

### 3.3 Operações por tabela

| Tabela | Leitura | Escrita |
| --- | --- | --- |
| `preorder_items` | Vitrine, admin, validação e estatísticas | Criação, edição e exclusão administrativa |
| `preorder_item_images` | Galeria aninhada | Substituição administrativa por delete/insert |
| `preorder_reservations` | Cliente, webhook e admin | Criação, cancelamento e estados de pagamento |
| `preorder_reservation_items` | Detalhe, estatísticas e pagamento | Inserção junto da reserva; exclusão por cascade |

## 4. Modelo RLS preparado

### 4.1 Leitura pública

`preorder_items` e `preorder_item_images` permitem `SELECT` a `anon` e
`authenticated` somente quando:

- o item está com `status = 'open'`;
- `order_deadline` está vazio ou ainda não venceu em `America/Sao_Paulo`;
- no caso da imagem, o item-pai satisfaz as mesmas condições.

Nenhuma escrita pública é permitida.

### 4.2 Cliente autenticado

O cliente pode ler uma reserva somente quando:

```sql
customers.id = preorder_reservations.customer_id
and customers.profile_id = (select public.current_profile_id())
```

Os itens usam a mesma propriedade por meio da reserva-pai. O cliente não recebe
policies de `INSERT`, `UPDATE` ou `DELETE`; criação e cancelamento continuam nas
APIs autenticadas, preservando validação de preço, status e pagamento.

### 4.3 Administração

As quatro tabelas possuem policy administrativa `FOR ALL TO authenticated`, com:

```sql
using ((select public.is_admin()))
with check ((select public.is_admin()))
```

Isso permite operações diretas apenas a perfis owner, sem substituir as
verificações `requireAdmin()` das APIs existentes.

### 4.4 Backend

`service_role` mantém somente `SELECT`, `INSERT`, `UPDATE` e `DELETE`. Os grants
de `TRUNCATE`, `REFERENCES` e `TRIGGER` são removidos. Como `service_role` possui
`BYPASSRLS`, as operações internas atuais continuam funcionando.

Foram adicionados índices que cobrem as FKs usadas pelas policies:

- `preorder_item_images(preorder_item_id)`;
- `preorder_reservation_items(reservation_id)`.

## 5. Views de catálogo

### 5.1 Risco observado

`catalog_category_options` e `catalog_product_cards` são views do owner
`postgres`, sem `security_invoker`, concedidas a `anon` e `authenticated`. Elas
podem executar com os privilégios do criador e ignorar RLS das tabelas-base.

As duas views também tinham grants DML-like desnecessários; são modelos somente
de leitura.

### 5.2 Correção preparada

- ambas são recriadas com `WITH (security_invoker = true)`;
- os grants são reduzidos a `SELECT`;
- todas as relações-base já possuem RLS;
- `catalog_category_options` passa a respeitar a policy de produtos ativos.

`catalog_product_cards` tinha uma dependência especial: o `LEFT JOIN` em
`rare_collectibles` excluía todo Acervo Raro do catálogo comum porque a view
antiga ignorava RLS. Com `security_invoker`, um raro oculto poderia desaparecer
do join e o produto reaparecer no catálogo.

Para preservar o comportamento foi preparada a view privada
`private.rare_collectible_product_ids`. Ela é `security_barrier`, executa com os
direitos de seu owner e revela somente `product_id` à view pública invoker. Não
existe função/RPC privada chamável por `anon` ou `authenticated`.

O schema `private` precisa permanecer fora de `pgrst.db_schemas`. Esse é um
pré-requisito bloqueador para aplicação: deve ser confirmado no preview e em
produção antes da migration. O catálogo exclui pela existência da linha em
`rare_collectibles`, sem filtrar estado; portanto raros ocultos, vendidos e
arquivados continuam fora do catálogo comum.

## 6. Funções privilegiadas

### 6.1 Inventário

Foram observadas 11 funções `SECURITY DEFINER` no schema `public`. Oito estavam
executáveis por `anon` e `authenticated`.

| Função | Dependência | Tratamento preparado |
| --- | --- | --- |
| `current_profile_id()` | Muitas policies | Mantida; `search_path=''`; grants explícitos |
| `current_profile_role()` | Muitas policies | Mantida; `search_path=''`; grants explícitos |
| `is_admin()` | Muitas policies | Mantida; `search_path=''`; grants explícitos |
| `is_owner()` | Muitas policies | Mantida; `search_path=''`; grants explícitos |
| `expire_raffle_reservations()` | `RaffleService` backend | Somente `service_role` |
| `reserve_raffle_numbers(...)` | `RaffleService` backend | Somente `service_role` |
| `handle_new_auth_user()` | Trigger de `auth.users` | Somente `service_role` |
| `handle_new_user()` | Trigger/helper de cadastro seguro | Somente `service_role` |
| `v2_recalculate_order_totals(uuid)` | Trigger de itens V2 | Convertida para `SECURITY INVOKER` |
| `record_manual_payment(...)` | Backend financeiro | Já era somente `service_role`; sem alteração |
| `refund_manual_payment(...)` | Backend financeiro | Já era somente `service_role`; sem alteração |

### 6.2 Helpers de RLS

Não foi removido acesso de helpers usados por policies. `anon` ainda precisa
avaliar `is_admin()`/`is_owner()` como ramo falso em policies públicas. Os
helpers expõem somente identidade/papel do próprio token e não fazem mutação.

Mover esses helpers para schema privado exigiria reescrever dezenas de policies;
isso deve ser uma etapa posterior, separada e com testes de regressão completos.

### 6.3 Recálculo de pedido V2

Revogar simplesmente `EXECUTE` de `authenticated` quebraria o trigger
`recalculate_v2_order_items_total` em operações administrativas autenticadas.
Por isso a função passa a `SECURITY INVOKER`: uma chamada direta só consegue
alterar `v2_orders` se grants e RLS do chamador já autorizarem a alteração.

## 7. Contratos Flutter: Pedidos V1 para V2

Nenhum código Flutter foi alterado nesta etapa.

### 7.1 Consumo atual V1

- `GET /api/v1/me/orders`
- `GET /api/v1/me/orders/[orderNumber]`
- `POST /api/v1/me/orders`

O app espera `status`, `reviewStatus`, `payments` e um DTO resumido na criação.

### 7.2 Contratos V2 existentes

#### Criar e listar

`GET /api/v1/me/orders-v2` retorna pedidos completos com campos em `snake_case`.

`POST /api/v1/me/orders-v2` aceita:

```json
{
  "items": [
    { "variantId": "uuid", "quantity": 1 }
  ],
  "couponCode": "opcional",
  "notes": "opcional"
}
```

Estados V2 independentes:

- `approval_status`: `aguardando_aprovacao`, `aprovado`, `recusado`;
- `payment_status`: `nao_pago`, `checkout_gerado`, `pago`,
  `reembolso_pendente`, `reembolsado`, `cancelado`;
- `fulfillment_status`: `aguardando_fechamento`, `solicitado`, `recebido`,
  `enviado`, `cancelado`.

#### Pagamento

`POST /api/v1/me/orders-v2/payment-sessions` aceita:

```json
{ "orderIds": ["uuid"] }
```

Todos os pedidos devem pertencer ao cliente, estar aprovados, ser pagáveis e
pertencer à mesma competência. A resposta contém `payment_link_url` para abertura
externa na InfinitePay.

Existe também:

```text
POST /api/v1/me/orders-v2/payment-sessions/[id]/sync
```

Esse endpoint deve ser usado no retorno ao app para sincronização, sem marcar
pagamento como confirmado apenas com base no navegador/deep link.

### 7.3 Lacunas antes da migração Flutter

- criar endpoint V2 de detalhe por ID ou número;
- definir DTO público estável em vez de expor o select completo do banco;
- adaptar modelos para os três estados V2;
- modelar `v2_payment_session_orders` e sessões de pagamento;
- implementar retorno/deep link e sincronização InfinitePay;
- invalidar caches de lista e detalhe após criação/pagamento.

## 8. Backlog priorizado do MVP mobile

Recursos explicitamente fora do MVP: rifas, Smart Clube, wishlist, PopFlix,
pré-vendas nativas, Acervo Raro nativo e Pronta Entrega.

### P0 — Banco e contratos

1. Revisar e aprovar as três migrations desta branch.
2. Reconciliar o histórico local/remoto em tarefa separada.
3. Aplicar migrations em janela controlada após autorização explícita.
4. Criar DTO e endpoint de detalhe de Pedidos V2.

Critérios de aceite:

- advisors sem RLS desativada nas quatro tabelas;
- cliente A não lê reservas do cliente B;
- público não lê rascunhos;
- funções mutáveis não são RPCs públicas;
- catálogo comum não inclui nenhum produto do Acervo Raro.

### P1 — Login e recuperação

- login por e-mail/senha;
- restauração e expiração de sessão;
- recuperação por deep link;
- mensagens de erro sem expor detalhes internos.

Critério: sessão inválida nunca abre checkout, perfil ou pedidos.

### P1 — Catálogo e produto

- listagem, busca, paginação e filtros mínimos;
- detalhe, imagens, variante, preço e disponibilidade;
- exclusão visual/funcional dos módulos fora do MVP.

Critério: apenas produtos do catálogo nativo podem ir ao carrinho.

### P1 — Carrinho

- persistência local por usuário/visitante;
- alteração de quantidade e remoção;
- validação de variante antes do envio;
- limpeza somente após pedido V2 criado.

### P1 — Pedidos V2

- criação, listagem e detalhe;
- apresentação dos três estados;
- atualização e tratamento de pedido recusado/cancelado.

Critério: novo pedido aparece na listagem e somente seu dono o acessa.

### P1 — InfinitePay externo

- seleção de pedidos aprovados da mesma competência;
- criação de payment session;
- abertura externa segura;
- retorno ao app e chamada de `sync`;
- atualização da lista/detalhe após confirmação do backend.

Critério: retorno do navegador nunca confirma pagamento localmente.

### P1 — Perfil e logout

- dados básicos do usuário;
- logout;
- limpeza de caches e carrinho vinculados à sessão;
- remoção dos atalhos de funcionalidades fora do MVP.

## 9. Consultas de validação somente leitura

Estas consultas devem ser executadas **depois da aplicação autorizada**, primeiro
em ambiente de teste/preview e depois em produção. Elas não alteram dados.

### 9.1 RLS e policies

```sql
select
  c.relname as table_name,
  c.relrowsecurity as rls_enabled,
  c.relforcerowsecurity as force_rls
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relname in (
    'preorder_items',
    'preorder_item_images',
    'preorder_reservations',
    'preorder_reservation_items'
  )
order by c.relname;

select schemaname, tablename, policyname, roles, cmd, qual, with_check
from pg_policies
where schemaname = 'public'
  and tablename like 'preorder_%'
order by tablename, policyname;
```

### 9.2 Grants mínimos

```sql
select table_name, grantee, array_agg(privilege_type order by privilege_type) as privileges
from information_schema.role_table_grants
where table_schema = 'public'
  and table_name in (
    'preorder_items',
    'preorder_item_images',
    'preorder_reservations',
    'preorder_reservation_items',
    'catalog_category_options',
    'catalog_product_cards'
  )
  and grantee in ('anon', 'authenticated', 'service_role')
group by table_name, grantee
order by table_name, grantee;

select table_name, column_name, grantee, privilege_type
from information_schema.role_column_grants
where table_schema = 'public'
  and table_name like 'preorder_%'
  and grantee in ('anon', 'authenticated')
order by table_name, grantee, column_name;
```

### 9.3 Views invoker e Acervo Raro

```sql
select c.relname, c.reloptions
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relname in ('catalog_category_options', 'catalog_product_cards');

select count(*) as rare_products_leaked_to_standard_catalog
from public.catalog_product_cards cards
join public.rare_collectibles rare on rare.product_id = cards.id;
-- Esperado para service_role: 0.

select current_setting('pgrst.db_schemas', true) as exposed_schemas;
-- Esperado: não conter "private". Confirmar também pela configuração da API.

select c.relname, c.reloptions,
       has_table_privilege('anon', c.oid, 'select') as anon_select,
       has_table_privilege('authenticated', c.oid, 'select') as authenticated_select
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'private'
  and c.relname = 'rare_collectible_product_ids';
```

### 9.4 Funções privilegiadas

```sql
select
  p.proname,
  pg_get_function_identity_arguments(p.oid) as arguments,
  p.prosecdef as security_definer,
  p.proconfig as config,
  has_function_privilege('anon', p.oid, 'execute') as anon_execute,
  has_function_privilege('authenticated', p.oid, 'execute') as authenticated_execute,
  has_function_privilege('service_role', p.oid, 'execute') as service_role_execute
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in (
    'current_profile_id',
    'current_profile_role',
    'is_admin',
    'is_owner',
    'expire_raffle_reservations',
    'reserve_raffle_numbers',
    'handle_new_auth_user',
    'handle_new_user',
    'v2_recalculate_order_totals'
  )
order by n.nspname, p.proname;
```

### 9.5 Testes comportamentais recomendados

Executar com tokens de teste distintos, nunca com dados reais sensíveis:

1. `anon`: lista item aberto e não lista draft/encerrado.
2. Cliente A: lista sua reserva e seus itens.
3. Cliente A: não lista reserva do cliente B.
4. Cliente comum: tentativa de insert/update/delete retorna autorização negada.
5. Owner autenticado: CRUD administrativo continua funcionando.
6. Backend: criação, cancelamento e webhook continuam funcionando.
7. RPC anônima de rifa/expiração retorna permissão negada.
8. Inserção/edição de item V2 recalcula o total via trigger.
9. Catálogo público mantém ocultos produtos e variantes não publicados.
10. Nenhum Acervo Raro aparece em `catalog_product_cards`.
11. A Data API não resolve `/rest/v1/rare_collectible_product_ids`.
12. Raros nos estados oculto, vendido e arquivado também permanecem ausentes.

## 10. Ordem proposta de aplicação futura

Não executar enquanto o histórico de migrations estiver divergente e sem uma
autorização explícita para produção.

1. Criar ambiente de preview/branch de banco.
2. Reconciliar o histórico de migrations em tarefa separada.
3. Aplicar `preorder_rls_hardening`.
4. Executar testes de pré-venda e advisors.
5. Aplicar `catalog_views_security_invoker`.
6. Executar testes de catálogo/Acervo Raro e advisors.
7. Aplicar `security_definer_function_privileges`.
8. Executar testes de cadastro, rifa, Pedidos V2 e advisors.
9. Somente então planejar a mesma sequência em produção, com rollback revisado.

## 11. Riscos restantes

- O histórico local/remoto continua divergente por decisão de escopo.
- Os helpers de identidade continuam como RPCs executáveis porque policies
  públicas dependem deles; a migração para schema privado permanece futura.
- O helper privado de Acervo Raro precisa de teste com os estados draft,
  available, reserved, sold e archived.
- O recálculo V2 como invoker precisa de teste de trigger com `service_role` e
  owner autenticado antes de produção.
- Não há ainda endpoint público estável de detalhe de Pedido V2 para o Flutter.
- Leaked Password Protection está desabilitado no projeto e deve ser tratado em
  uma tarefa de configuração separada.

## 12. Rollback e segurança operacional

Cada migration contém comentários de propósito e rollback. Como rollback de
segurança pode reabrir exposição, ele não deve ser automatizado sem diagnóstico.

Nenhuma migration desta branch deve ser aplicada com `db push` enquanto houver
drift. A aplicação futura deve usar um plano explícito, migration por migration,
com advisors e consultas acima executados entre as etapas.

## 13. Revisão técnica das três migrations

### 13.1 Achados por severidade

**Bloqueador**

- Nenhum defeito SQL bloqueador permaneceu nos arquivos. A aplicação, porém,
  fica bloqueada até confirmar que `private` não integra os schemas expostos do
  PostgREST. Expor esse schema tornaria o read model raro consultável pela API.

**Alto — corrigidos localmente**

- A primeira versão concedia `SELECT` de tabela inteira em reservas e expunha
  payloads/identificadores internos do provedor. A migration agora usa grants
  por coluna para `authenticated` e não concede DML a `anon`/`authenticated`.
- A primeira versão usava uma função `SECURITY DEFINER` rara executável por
  papéis da API. Ela foi substituída por uma view privada não chamável como RPC,
  preservando a exclusão de todo produto presente em `rare_collectibles`.

**Médio — mitigados, exigem preview**

- `v2_recalculate_order_totals(uuid)` como invoker depende das grants e policies
  de `v2_orders`/`v2_order_items` no contexto real do trigger. A análise estática
  não substitui testes com owner e `service_role`.
- As trigger functions de cadastro perderão execução direta pela Data API. O
  trigger existente continua associado a `handle_new_auth_user()`, mas o fluxo
  real de criação em `auth.users` deve ser exercitado no preview.
- As policies administrativas existem, porém as tabelas não concedem DML a
  `authenticated`; isso é intencional. O admin atual opera pelo backend
  `service_role`. Conceder DML direto no futuro ativaria as policies sem
  necessidade de recriá-las.

**Baixo**

- Os índices usam `IF NOT EXISTS`: se houver um objeto homônimo incompatível, a
  migration não o corrige. A consulta de catálogo deve confirmar definição e
  colunas antes da aplicação.
- Os helpers `current_profile_*`, `is_admin` e `is_owner` continuam RPCs
  executáveis porque policies existentes dependem deles. Eles não mutam dados,
  têm `search_path=''` e relações qualificadas.

### 13.2 Matriz de dependências afetadas

| Objeto alterado | Dependentes confirmados | Garantia preparada | Validação em preview |
| --- | --- | --- | --- |
| Quatro tabelas `preorder_*` | Vitrine, conta, admin, APIs, webhook InfinitePay | leitura pública só de `open` vigente; cliente só da própria reserva; escrita somente backend | anon, dois clientes, owner e backend |
| `catalog_category_options` | catálogo e filtros públicos | invoker + `SELECT` apenas | comparar categorias antes/depois |
| `catalog_product_cards` | cards, busca e produto | invoker + exclusão pela view privada | comparar IDs e testar todos estados raros |
| `private.rare_collectible_product_ids` | somente `catalog_product_cards` | schema privado, `security_barrier`, uma coluna | confirmar schema não exposto e endpoint inexistente |
| `current_profile_id/role`, `is_admin/is_owner` | dezenas de policies públicas | assinatura preservada, `search_path=''`, grants mantidos | matriz anon/cliente/owner |
| `expire_raffle_reservations`, `reserve_raffle_numbers` | `RaffleService` | execução somente `service_role` | RPC negada ao cliente e aceita no backend |
| `handle_new_auth_user` | trigger `on_auth_user_created` em `auth.users` | execução direta somente `service_role`; vínculo não alterado | criar usuário de teste e conferir perfil |
| `handle_new_user` | helper/trigger legado de cadastro | execução direta somente `service_role` | inspecionar vínculos e cadastro seguro |
| `v2_recalculate_order_totals` | trigger `recalculate_v2_order_items_total` | invoker; assinatura preservada | insert/update/delete de item por contextos autorizados |

Não foi encontrada chamada do Flutter às quatro tabelas de pré-venda. As RPCs
financeiras `record_manual_payment` e `refund_manual_payment` já eram exclusivas
de `service_role` e não são modificadas.

## 14. Comparação de conteúdo e checksums

Os SHA-256 abaixo são dos arquivos locais brutos. Para produção, onde o histórico
armazena statements e não arquivos, foi calculado MD5 do statement armazenado e
também uma forma canônica sem comentários/espaços para comparação semântica.

| Lógica | SHA-256 local | MD5 canônico local | Versão remota | MD5 bruto remoto | Resultado |
| --- | --- | --- | --- | --- | --- |
| legal | `708f5a70277e403f4541a82167529846aa33ac5e60eceb00e317524b90707941` | `f12de268379f18ff0f3a00c8e895fe1c` | `20261029154505` | `ce5589f03e2ea005557503d0f047adb2` | canônico idêntico |
| NFe mensal | `58e451b5a383e6a875805af3f94113fe45cdce7a5a41b3cb40e0a13f280f8c36` | `48efa68dec2fca394d8bc61c71c9ce4e` | `20261029155812` + `20261029155840` | `505e411bb43f314c614322f44c89f319` + `f82e7d0ba13c2d6bcecd6a229b5c53d5` | estado final equivalente; divisão histórica diferente |
| endereço | `6d1334d43d1c790a19064e0a5da956b42925d8c344a3bca62fe5ceef196ff0bd` | `f8d7d150cea60522cae13d5d39778f98` | `20261112210137` | `4849d2f091d808980198a0e0d7f5b35b` | equivalente após normalizar `IF NOT EXISTS` |
| signup seguro | `c1962d810d586d96b2d546a5a3d8e038495edf02a7277147a6bff593243d8cd4` | `de334984609e0d8c3f8e2a062e200ee1` | `20261112210210` | `3d7921b86d05f48028215dd210f5d03e` | canônico idêntico |
| pronta entrega | `350b2cbdd9dc5672004f5e312f36e07ee26025c5902cfc00c36336c5469f4f29` | `0645880fe6bbff019a98d2379bf2fb11` | `20261112212336` | `4d775a85f3c1c93ebef7029af12b8307` | canônico idêntico |

As outras 43 migrations possuem versão/nome coincidentes. Nenhuma migration
antiga deve ser renomeada ou reescrita para resolver esse histórico.

## 15. Plano reversível de reconciliação (não executado)

Pré-condições: backup do histórico, exportação somente leitura de
`supabase_migrations.schema_migrations`, nova comparação de definições e janela
aprovada. O procedimento altera somente o registro de histórico, não reaplica SQL:

```sh
# FUTURO — não executar sem autorização explícita.
npx supabase migration repair --linked --status reverted \
  20261029154505 20261029155812 20261029155840 \
  20261112210137 20261112210210 20261112212336

npx supabase migration repair --linked --status applied \
  20261029120000 20261029143000 20261112120000 \
  20261112121500 20261112150000
```

Depois, executar apenas `supabase migration list --linked` e confirmar que as
três migrations novas aparecem pendentes, sem `db push`. Se qualquer verificação
divergir, interromper. Reversão do reparo: marcar as cinco versões locais como
`reverted` e as seis versões remotas originais como `applied`, na ordem inversa,
usando o snapshot como fonte de verdade. O reparo não deve ocorrer antes do
preview aprovado demonstrar equivalência de schema e comportamento.

## 16. Rollback detalhado das migrations novas

- **Pré-venda:** remover as oito policies pelos nomes declarados; revogar os
  grants por coluna e os grants DML de `service_role`; remover os dois índices.
  Desabilitar RLS e restaurar grants amplos somente como último recurso, pois
  isso reabre a falha original. Rollback preferido: corrigir a policy por nova
  migration mantendo RLS ativo.
- **Views:** restaurar as definições capturadas das duas views, restaurar apenas
  `SELECT` necessário e remover `private.rare_collectible_product_ids`. Remover o
  schema `private` apenas se estiver vazio. Voltar a definer-rights reabre bypass
  de RLS e não é o rollback preferido.
- **Funções:** restaurar corpos anteriores a partir do snapshot, mantendo
  assinaturas. Regrants devem ser nominativos; não restaurar `PUBLIC`. Se somente
  o recálculo V2 regredir, reverter apenas essa função, sem reabrir RPCs de rifa
  ou cadastro.

Todo rollback deve ser uma migration compensatória revisada; não editar nem
apagar as migrations já aplicadas.

## 17. Checklist obrigatório do banco de preview

1. Confirmar schemas expostos e negar acesso REST ao schema `private`.
2. Capturar catálogo, grants, policies, funções, triggers e dependências antes.
3. Aplicar uma migration por vez; executar consultas da seção 9 entre elas.
4. Testar anon, cliente A, cliente B, owner e `service_role` separadamente.
5. Provar ausência de leitura cruzada e de DML direto de cliente.
6. Provar CRUD admin via backend e todos os fluxos de webhook/cancelamento.
7. Comparar conjuntos de IDs das views antes/depois e testar raros ocultos,
   vendidos e arquivados.
8. Criar usuário de teste e validar trigger/perfil, recuperação e login.
9. Exercitar trigger de totais V2 em insert/update/delete e tentativa BOLA.
10. Executar advisors de segurança/performance e registrar diferenças.
11. Ensaiar migrations compensatórias de rollback em ambiente descartável.
12. Somente com evidências aprovadas elaborar o plano de produção.

## 18. Arquivos e validações desta revisão

Arquivos alterados, todos novos nesta branch:

- `supabase/migrations/20261112220637_preorder_rls_hardening.sql`;
- `supabase/migrations/20261112220803_catalog_views_security_invoker.sql`;
- `supabase/migrations/20261112220943_security_definer_function_privileges.sql`;
- `supabase/migrations/20261112235807_preorder_rls_customer_lookup_grant.sql`;
- `supabase/migrations/20261113000103_catalog_views_public_base_column_grants.sql`;
- `supabase/migrations/20261113000158_catalog_category_options_exclude_rare_collectibles.sql`;
- `supabase/migrations/20261113000439_v2_backend_explicit_table_grants.sql`;
- `docs/MOBILE_RELEASE_2026-12-15.md`.

Resultados em 12/11/2026:

| Validação | Resultado |
| --- | --- |
| Branch e escopo do Git | branch correta; somente o documento e as sete migrations desta etapa estão novos |
| `git diff --check` | sem erro de whitespace nos oito arquivos novos |
| ESLint (`web`) | passou |
| TypeScript `tsc --noEmit` (`web`) | passou |
| `flutter test` (`mobile`) | passou, 1 teste |
| `flutter analyze` (`mobile`) | sem erros; 2 avisos `info` preexistentes em `catalog_repository.dart:71` e `product_models.dart:164` |
| Varredura SQL estática | nenhum grant DML a `anon`/`authenticated`; funções mutáveis apenas `service_role`; `search_path` explícito nos helpers reescritos |

Não foram executados `db push`, `migration repair`, `db reset`, banco local ou
alteração em produção. As aplicações SQL descritas a seguir ocorreram somente no
preview isolado autorizado.

## 19. Validação no Supabase Preview

### 19.1 Identificação e custo

- Parent/produção: `SmartFunko`, ref `sufppaxdxmxdcfkuvanm`.
- Preview: `mobile-release-2026-12-15-preview`.
- Preview project ref: `upindxqerxiduhtlviby`.
- Branch id: `28e740c0-4b44-4b34-aed2-2625b06c71cd`.
- Estado: `ACTIVE_HEALTHY`, `persistent=false`, `with_data=false`.
- Custo cotado e autorizado: USD 0,01344/h, além de uso de disco, egress e
  storage da organização. O branch foi excluído após a validação; não acumula
  novas horas de Branching Compute, embora o uso já incorrido possa aparecer na
  fatura da organização.

Nenhum dado de produção foi copiado. Todos os registros usados têm UUIDs
determinísticos e e-mails `@example.invalid`.

### 19.2 Evidência de isolamento da Data API

Antes da migration de views e novamente depois de criar a view privada, a
requisição com `Accept-Profile: private` retornou:

```text
HTTP 406 / PGRST106
Only the following schemas are exposed: public, graphql_public
Invalid schema: private
```

O teste equivalente em `public` alcançou a relação, comprovando que não foi um
falso negativo de rede. `private.rare_collectible_product_ids` não está exposta.

### 19.3 Resultado por migration

| Ordem | Migration | Aplicação | Resultado |
| --- | --- | --- | --- |
| 1 | `20261112220637_preorder_rls_hardening.sql` | sucesso | anon e backend passaram; leitura do próprio cliente falhou por ausência de grant em `customers` no branch |
| 1a | `20261112235807_preorder_rls_customer_lookup_grant.sql` | corretiva, sucesso | Cliente A/B passaram isoladamente; owner e backend preservados |
| 2 | `20261112220803_catalog_views_security_invoker.sql` | sucesso | views invoker corretas, mas grants das tabelas-base ausentes no branch |
| 2a | `20261113000103_catalog_views_public_base_column_grants.sql` | corretiva, sucesso | views públicas funcionaram sem liberar `estimated_cost` |
| 2b | `20261113000158_catalog_category_options_exclude_rare_collectibles.sql` | corretiva, sucesso | categorias deixaram de contar raros ausentes dos cards |
| 3 | `20261112220943_security_definer_function_privileges.sql` | sucesso | RPCs mutáveis bloqueadas; recálculo legítimo falhou sem grants explícitos de backend |
| 3a | `20261113000439_v2_backend_explicit_table_grants.sql` | corretiva, sucesso | chamada e triggers V2 passaram em `service_role`; BOLA continuou bloqueada |

As migrations originais aplicadas no preview não foram editadas para ocultar as
falhas. Cada correção foi criada separadamente com a CLI Supabase.

### 19.4 Testes comportamentais

| Teste | Resultado |
| --- | --- |
| Anon vê somente pré-venda `open` dentro do prazo | passou por SQL e Data API; somente o item aberto e vigente |
| Anon não lê reservas/pagamentos | passou; `permission denied` |
| Payloads internos não são públicos | passou; `provider_reference` negado a cliente |
| Cliente A/B vê somente a própria reserva e itens | passou após corretiva; A e B mutuamente isolados |
| Cliente não insere/atualiza/exclui reserva | passou; três operações negadas por grant |
| Owner lê e administra pelo fluxo previsto | leitura RLS passou; escrita permanece pelo backend `service_role` |
| Backend de pré-venda | passou; leitura e update sintético com rollback |
| Raros oculto/draft, vendido e arquivado fora dos cards | passou por SQL e Data API; somente produto normal retornou |
| Filtros/categorias coerentes com cards | passou após corretiva; contagem mudou de 4 para 1 |
| Coluna sensível `estimated_cost` | passou; acesso anon negado |
| Schema/view privada fora da Data API | passou antes/depois; HTTP 406 PGRST106 |
| RPCs de rifa/expiração por anon/authenticated | passou; execução negada |
| Trigger de cadastro após revokes | passou em insert sintético de `auth.users`; criou profile/customer |
| Cadastro completo via Auth HTTP | bloqueado pelo SMTP placeholder do preview; três tentativas retornaram `Error sending confirmation email` sem usuário gravado |
| Recálculo V2 direto pelo backend | passou; subtotal/total 50 |
| Trigger V2 em insert/update/delete | passou; resultados 30, 75 e 0 |
| Cliente recalcula pedido arbitrário | passou como teste negativo; acesso à tabela negado |

Uma consulta inicial de cards tentou `LIKE` sobre UUID e recebeu erro de operador;
o teste foi corrigido para `IN` e retornou HTTP 200. Não houve alteração de schema
para contornar esse erro de teste.

### 19.5 Advisors antes e depois

| Advisor | Antes | Depois | Avaliação |
| --- | ---: | ---: | --- |
| `security_definer_view` | 2 ERROR | 0 | resolvido |
| `anon_security_definer_function_executable` | 8 WARN | 4 WARN | funções mutáveis removidas; quatro helpers de RLS intencionais permanecem |
| `authenticated_security_definer_function_executable` | 8 WARN | 4 WARN | mesmo comportamento intencional |
| `function_search_path_mutable` | 3 WARN | 3 WARN | preexistente, fora do escopo das funções reescritas |
| `extension_in_public` | 1 WARN | 1 WARN | preexistente |
| `unindexed_foreign_keys` | 55 INFO | 61 INFO | aumento ocorreu enquanto o schema-base do branch terminava de materializar migrations posteriores; os dois FKs usados pelas policies receberam índices |
| `multiple_permissive_policies` | 160 WARN | presente | padrão preexistente; policies admin + cliente adicionam combinações esperadas |

O advisor final também lista cinco tabelas preexistentes com RLS sem policy e
Leaked Password Protection desabilitada. Nenhuma pertence às quatro tabelas de
pré-venda desta etapa. Links de remediação oficiais:

- https://supabase.com/docs/guides/database/database-linter?lint=0010_security_definer_view
- https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable
- https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable

### 19.6 Recomendação

**Aprovado com ressalvas para planejamento de produção; ainda não autorizado
para produção.** As três migrations precisam ser aplicadas junto das quatro
corretivas e em ordem. Antes de produção, é necessário decidir como testar o
cadastro Auth completo: configurar SMTP exclusivamente em novo preview ou criar
outro método de confirmação de teste.

### 19.7 Encerramento do preview

Exclusão autorizada e executada em 12/11/2026:

- nome confirmado: `mobile-release-2026-12-15-preview`;
- project ref confirmado: `upindxqerxiduhtlviby`;
- branch ID confirmado: `28e740c0-4b44-4b34-aed2-2625b06c71cd`;
- parent confirmado e preservado: `sufppaxdxmxdcfkuvanm`.

Após a exclusão, `list_branches` retornou somente `main`/produção e uma consulta
direta ao ref do preview retornou `Project not found`. Isso comprova que o branch
deixou de existir e, portanto, não acumula novo uso de compute. Custos já
incorridos continuam sujeitos ao ciclo normal de faturamento.

## 20. Premissas de compatibilidade mobile e web

- O aplicativo Flutter não é usado atualmente e não possui usuários em
  produção. Não é necessário preservar compatibilidade com sua implementação de
  Pedidos V1.
- O Flutter pode ser reestruturado diretamente para Pedidos V2, sem etapa de
  compatibilidade ou migração gradual do cliente V1.
- O sistema web Next.js está em uso e não pode sofrer regressões.
- Alterações em APIs, banco, autenticação, pagamentos, webhooks ou contratos
  compartilhados devem preservar integralmente o comportamento do Next.js.
- Endpoints específicos para mobile são preferíveis a alterar respostas já
  consumidas pelo web.
- Antes de qualquer mudança compartilhada, devem ser mapeados todos os
  consumidores Next.js e criados testes de regressão para os contratos atuais.
- Nenhuma alteração em produção está autorizada. Alterações futuras continuam
  limitadas à branch e a ambientes isolados aprovados explicitamente.
