# Checklist de seguranca SmartFunko

## Resultado da auditoria 1.0

- `/api/v1/admin/*`: auditado por busca automatizada; todas as rotas usam `requireAdmin()` ou `requireOwner()`.
- `/api/v1/me/*`: auditado por busca automatizada; todas as rotas usam `requireUser()`.
- `/api/v1/public/*`: rotas publicas usam services publicos ou token explicito e nao devem retornar CPF, margem, custo ou dados internos.
- Webhook InfinitePay nao exige login, mas valida HMAC quando `INFINITEPAY_WEBHOOK_SECRET` esta configurado.
- Service role esta concentrada em helpers server-side. O helper legado `lib/supabase/admin.ts` tambem usa `server-only`.
- `lib/supabase/client.ts` usa apenas `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
- `/admin` e `/conta` possuem layout com `robots: noindex, nofollow`.

## Autenticacao e autorizacao

Admin:

- `requireAdmin()` delega para `requireOwner()`.
- `requireOwner()` exige usuario autenticado com `profile.role = owner`.
- Financeiro, caixa, pagamentos, estoque, BI, produtos, pedidos, cupons, rifas e rewards admin passam por rotas admin.

Customer:

- `/api/v1/me/orders` usa customer autenticado do backend.
- `/api/v1/me/orders/[orderNumber]` filtra por `customer.id` autenticado.
- `/api/v1/me/raffles/orders/[id]` filtra por `customer.id` autenticado.
- `/api/v1/me/wishlist` usa customer autenticado.
- `/api/v1/me` nao aceita `customerId` do client para decidir acesso.
- Alteracao de senha/e-mail em `/conta` usa Supabase Auth client com a sessao do usuario, sem service role.
- Reenvio de confirmacao e magic link retornam mensagens genericas para nao revelar existencia ou estado de e-mail.

Publico:

- Catalogo/produtos/fornecedores retornam somente dados publicos.
- Rifas publicas retornam campanha e disponibilidade de numeros; compradores nao sao expostos.
- Pedido publico exige `token` e deve continuar sem dados sensiveis.

## RLS Supabase

Coberto nas migrations:

- `customers`: customer le proprio registro; admin gerencia.
- `orders`, `order_items`, `payments`: customer le somente registros proprios; admin gerencia.
- `wishlist_items`: customer gerencia propria lista; admin/owner ve demanda.
- `raffle_orders`: customer le proprias reservas/compras; owner gerencia.
- `raffle_numbers`: publico ve disponibilidade de campanhas publicas; owner gerencia.
- `reward_profiles`, `reward_point_ledger`, `reward_profile_badges`: customer le proprio clube; admin gerencia.
- `monthly_order_rankings` e entries visiveis: leitura publica/customer sem dados sensiveis quando perfil permite ranking.
- `cash_entries`, `inventory_items`, `inventory_movements`, `admin_action_logs`: admin/owner apenas.
- `storage.objects` bucket `product-images`: leitura publica, escrita admin/owner em `products/*`.

Observacao: mutacoes sensiveis de cliente passam por rotas server-side com service role e validacao do usuario autenticado. Nao expor service role em browser.

## Webhook InfinitePay

- `payment_provider_events` tem `unique(provider, event_id)`.
- Eventos duplicados sao ignorados.
- Pedido normal com valor faltante ou menor que saldo pendente entra em `manual_review`.
- Rifa valida status pendente, reserva vigente, valor recebido e numeros ainda `pending_payment`.
- Rifa com pagamento atrasado, valor menor ou numeros liberados entra em `manual_review`.
- Pontos rewards usam `unique(customer_id, source_type, source_id, reason)` para reduzir duplicidade.

## Pendencias de seguranca

- Criar testes automatizados de autorizacao para rotas admin/customer.
- Criar teste de webhook duplicado para pedido normal e rifa.
- Criar rotina operacional para revisar eventos `manual_review`.
- Revisar juridicamente rifas antes de qualquer uso promocional real.
