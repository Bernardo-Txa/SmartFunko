import { createHash } from "node:crypto";
import { conflict } from "@/server/http/errors";
import { IdempotencyPayloadMismatchError, InMemoryIdempotencyStore } from "@/server/http/in-memory-idempotency-store";

export const inMemoryIdempotencyTtlMs = 5 * 60 * 1000;
const store = new InMemoryIdempotencyStore(inMemoryIdempotencyTtlMs);

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, entryValue]) => [key, canonicalize(entryValue)]));
  }
  return value;
}

export function idempotencyFingerprint(payload: unknown) {
  return createHash("sha256").update(JSON.stringify(canonicalize(payload))).digest("hex");
}

export async function runIdempotent<T>(scope: string, key: string, fingerprint: string, operation: () => Promise<T>, now = Date.now()): Promise<T> {
  try {
    return await store.run(scope, key, fingerprint, operation, now);
  } catch (error) {
    if (error instanceof IdempotencyPayloadMismatchError) throw conflict("Idempotency-Key reutilizada com payload diferente");
    throw error;
  }
}

export function requireIdempotencyKey(request: Request, parse: (value: string) => string) {
  const raw = request.headers.get("idempotency-key");
  if (!raw) throw conflict("Idempotency-Key obrigatoria");
  return parse(raw);
}
