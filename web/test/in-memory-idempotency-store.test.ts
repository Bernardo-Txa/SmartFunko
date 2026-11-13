import assert from "node:assert/strict";
import test from "node:test";
// @ts-expect-error Node's strip-types runner requires the explicit extension.
import { IdempotencyPayloadMismatchError, InMemoryIdempotencyStore } from "../src/server/http/in-memory-idempotency-store.ts";

test("coalesces concurrent requests and reuses the completed response", async () => {
  const store = new InMemoryIdempotencyStore();
  let calls = 0;
  const operation = async () => { calls += 1; return { id: "order-1" }; };
  const [first, second] = await Promise.all([store.run("customer:order", "key", "hash", operation, 0), store.run("customer:order", "key", "hash", operation, 0)]);
  assert.deepEqual(first, second);
  assert.equal(calls, 1);
  assert.deepEqual(await store.run("customer:order", "key", "hash", operation, 1), first);
  assert.equal(calls, 1);
});

test("rejects the same key with a different payload", async () => {
  const store = new InMemoryIdempotencyStore();
  await store.run("scope", "key", "hash-a", async () => "ok", 0);
  await assert.rejects(() => store.run("scope", "key", "hash-b", async () => "wrong", 1), IdempotencyPayloadMismatchError);
});

test("evicts failures and permits a retry", async () => {
  const store = new InMemoryIdempotencyStore();
  await assert.rejects(() => store.run("scope", "key", "hash", async () => { throw new Error("timeout"); }, 0));
  assert.equal(await store.run("scope", "key", "hash", async () => "retried", 1), "retried");
});

test("expires entries after the configured TTL", async () => {
  const store = new InMemoryIdempotencyStore(10);
  assert.equal(await store.run("scope", "key", "hash", async () => "first", 0), "first");
  assert.equal(await store.run("scope", "key", "hash", async () => "second", 11), "second");
});
