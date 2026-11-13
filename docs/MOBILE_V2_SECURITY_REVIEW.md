# Revisão de segurança do contrato mobile V2

## Limite da idempotência atual

O cache em memória é apenas uma proteção de melhor esforço contra duplo toque na mesma instância. Ele coalesce chamadas concorrentes, rejeita a mesma chave com payload diferente, reaproveita respostas concluídas por cinco minutos e remove falhas para permitir retry. Não oferece garantia forte em serverless: outra instância, restart, deploy ou expiração pode executar novamente a operação.

## Desenho proposto para idempotência persistente

Proposta ainda não convertida em migration:

- tabela privada `private.mobile_idempotency_requests`;
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

Dependências a confirmar antes da migration: schema `private` não exposto, grants atuais de `service_role`, ownership de `customers`, política de retenção, tamanho máximo do DTO serializado e se criação de pedido/pagamento pode ser movida para uma função transacional. A tabela não deve conceder acesso a `anon` ou `authenticated`; somente backend/service role.

## Build determinístico

O build atual executa leituras remotas durante prerenderização em `app/page.tsx`, `app/popflix/page.tsx`, páginas de marcas/fornecedores e `app/sitemap.ts`, por meio de `lib/catalog.ts`. Os timeouts observados são anteriores e independentes do namespace mobile, que não é importado por essas páginas.

Para CI determinístico, usar um banco de build/preview com schema e fixture pública mínima, limite de statement compatível e variáveis próprias de CI. Como alternativa arquitetural futura, decidir conscientemente quais páginas devem ser dinâmicas ou receber snapshot versionado; não alterar `dynamic`/revalidate apenas para esconder indisponibilidade do banco.
