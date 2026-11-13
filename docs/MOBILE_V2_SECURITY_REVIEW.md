# Revisão de segurança do contrato mobile V2

## Idempotência persistente

A migration `20261113005521_mobile_v2_persistent_idempotency.sql` substitui o cache em memória por ledger persistente e RPCs transacionais restritas ao `service_role`. Pedido, itens, evento e uso do cupom são uma transação. Sessão, vínculos e estados dos pedidos também são uma transação; uma lease persistente coordena a chamada externa ao InfinitePay entre instâncias.

## Desenho proposto para idempotência persistente

Implementação preparada localmente, ainda não aplicada:

- tabela `public.mobile_idempotency_requests`, com RLS e sem acesso para clientes;
- `id uuid primary key default gen_random_uuid()`;
- `customer_id uuid not null references public.customers(id)`;
- `operation text not null`, limitado a `order.create` e `payment_session.create`;
- `idempotency_key text not null` e `payload_hash text not null`;
- `status text not null` limitado a `processing`, `completed` e `failed`;
- `response_status integer`, `response_body jsonb` e `resource_id uuid`;
- `error_code text`, sem armazenar stack trace, payload de provedor ou segredo;
- `created_at`, `updated_at`, `expires_at` e `completed_at` em `timestamptz`;
- índice único `(customer_id, operation, idempotency_key)`;
- índice de limpeza em `expires_at`.

Aquisição deve ocorrer em transação por função backend-only com `insert ... on conflict` e bloqueio da linha. Hash diferente para a mesma chave retorna `409`. `completed` devolve o status e DTO armazenados. `processing` recente devolve conflito/retry controlado; expirado pode ser retomado com compare-and-swap. `failed` só é reutilizado quando a falha representa resultado final; falha transitória libera retry de forma explícita. A conclusão deve gravar recurso e resposta na mesma transação lógica da operação ou usar uma função transacional específica para impedir o intervalo entre criar o recurso e persistir a resposta.

Retenção: `expires_at` inicia em 90 dias, mas registros financeiros concluídos devem permanecer ao menos 180 dias; limpeza deve ser operacional, observável e nunca remover `processing`. A tabela não concede acesso a `anon`, `authenticated` ou acesso direto ao `service_role`; o backend usa apenas RPCs específicas.

## Build determinístico

O build atual executa leituras remotas durante prerenderização em `app/page.tsx`, `app/popflix/page.tsx`, páginas de marcas/fornecedores e `app/sitemap.ts`, por meio de `lib/catalog.ts`. Os timeouts observados são anteriores e independentes do namespace mobile, que não é importado por essas páginas.

Para CI determinístico, usar um banco de build/preview com schema e fixture pública mínima, limite de statement compatível e variáveis próprias de CI. Como alternativa arquitetural futura, decidir conscientemente quais páginas devem ser dinâmicas ou receber snapshot versionado; não alterar `dynamic`/revalidate apenas para esconder indisponibilidade do banco.

## Checklist para preview

1. Confirmar que o project ref é isolado e que `private` continua fora da Data API.
2. Aplicar somente o schema-base e a migration de idempotência.
3. Confirmar RLS, ausência de policies e revokes da ledger.
4. Confirmar `EXECUTE` somente para `service_role` nas quatro RPCs.
5. Executar concorrência com duas conexões: pedido e sessão, mesma chave/hash.
6. Repetir com hash diferente, clientes diferentes, crash após commit e lease expirado.
7. Forçar erro no insert dos vínculos e comprovar rollback de sessão, ledger e pedidos.
8. Validar paginação com timestamps iguais e IDs diferentes.
9. Rodar advisors de segurança/performance e regressão dos endpoints web.
10. Validar InfinitePay com stub sintético; nenhum dado real.

Estimativa: 2 a 3 horas de preview, incluindo provisionamento, aplicação, testes concorrentes, advisors e relatório. O preview não deve ser criado sem autorização específica e confirmação do custo vigente por hora.

## Validação local em PostgreSQL real — 2026-11-13

O histórico completo foi aplicado do zero pelo Supabase CLI 2.104.0 em um
stack Docker local com PostgreSQL 17.6. A migration
`20261113005521_mobile_v2_persistent_idempotency.sql` aplicou sem erro de DDL,
mas o teste comportamental encontrou `min(uuid)` na RPC de início de sessão de
pagamento, operação não suportada pelo PostgreSQL 17. A migration original foi
preservada e a correção foi criada separadamente em
`20261113012619_fix_mobile_v2_payment_competence_uuid_aggregate.sql`.

Após `supabase db reset --local`, o histórico e a correção aplicaram sem erro.
Foram validados com dados `CODEX_TEST_` e e-mails `example.invalid`:

- duas conexões concorrentes com a mesma chave e payload, produzindo uma única
  sessão e uma única lease de provedor;
- replay, payload divergente, chaves iguais para clientes distintos e timeout
  simulado depois do commit;
- atomicidade e rollback de pedido, itens, evento, sessão, vínculos e estado do
  pedido;
- ownership, competências incompatíveis, expiração e retomada da lease;
- conclusão da sessão com stub `example.invalid`, sem chamada à InfinitePay;
- RLS da ledger sem policies, ausência de acesso direto por `anon`,
  `authenticated` e `service_role`, e `EXECUTE` das RPCs somente para
  `service_role`;
- `SECURITY DEFINER` com `search_path=''` nas quatro RPCs;
- paginação, contratos mobile e regressão dos contratos web existentes.

O linter local do Supabase não encontrou erros de schema. ESLint, TypeScript,
18 testes web, `flutter analyze` e 9 testes Flutter passaram. O stack local foi
encerrado sem preservar os dados sintéticos. Esta validação não autoriza nem
substitui o preflight, backup recuperável e confirmação explícita exigidos para
produção.

## Rollback

Revogar e remover primeiro as quatro funções mobile, reverter o backend para bloquear os endpoints mobile dependentes e só então remover `public.mobile_idempotency_requests`. Não remover pedidos ou sessões já criados. Se houver tráfego mobile, preservar a ledger em modo somente leitura durante a janela de rollback para manter a prova de idempotência.
