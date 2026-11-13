import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const migrationUrl = new URL("../../supabase/migrations/20261113005521_mobile_v2_persistent_idempotency.sql", import.meta.url);
const paymentUuidAggregateFixUrl = new URL(
  "../../supabase/migrations/20261113012619_fix_mobile_v2_payment_competence_uuid_aggregate.sql",
  import.meta.url,
);

test("migration scopes keys per customer and operation and locks client roles out", async () => {
  const sql = await readFile(migrationUrl, "utf8");
  assert.match(sql, /unique \(customer_id, operation, idempotency_key\)/);
  assert.match(sql, /enable row level security/);
  assert.match(sql, /revoke all on table public\.mobile_idempotency_requests from public, anon, authenticated/);
  assert.doesNotMatch(sql, /create policy/i);
});

test("order and session resources are created inside transactional RPCs", async () => {
  const sql = await readFile(migrationUrl, "utf8");
  assert.match(sql, /mobile_create_v2_order_idempotent[\s\S]*insert into public\.v2_orders[\s\S]*insert into public\.v2_order_items[\s\S]*status='completed'/);
  assert.match(sql, /mobile_start_v2_payment_session_idempotent[\s\S]*for update[\s\S]*insert into public\.v2_payment_sessions[\s\S]*insert into public\.v2_payment_session_orders/);
  assert.match(sql, /lease_expires_at/);
});

test("privileged functions use empty search path and service-role-only execute", async () => {
  const sql = await readFile(migrationUrl, "utf8");
  assert.equal((sql.match(/security definer\s+set search_path\s*=\s*''/g) ?? []).length >= 3, true);
  assert.match(sql, /grant execute on function public\.mobile_create_v2_order_idempotent[\s\S]*to service_role/);
  assert.match(sql, /revoke all on function public\.mobile_create_v2_order_idempotent[\s\S]*from public,anon,authenticated/);
});

test("retention cleanup never deletes processing or recent financial proofs", async () => {
  const sql = await readFile(migrationUrl, "utf8");
  assert.match(sql, /status in \('processing', 'completed', 'failed'\)/);
  assert.match(sql, /mobile_cleanup_v2_idempotency/);
  assert.match(sql, /created_at < now\(\) - interval '180 days'/);
});

test("payment session competence selection is compatible with UUID columns", async () => {
  const sql = await readFile(paymentUuidAggregateFixUrl, "utf8");
  assert.match(sql, /\(array_agg\(competence_id\)\)\[1\]/);
  assert.doesNotMatch(sql, /min\(competence_id\)/);
  assert.match(sql, /count\(distinct competence_id\)[\s\S]*<>1/);
});
