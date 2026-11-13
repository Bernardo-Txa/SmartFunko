import { createHash } from "node:crypto";
import { conflict } from "@/server/http/errors";

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

export function requireIdempotencyKey(request: Request, parse: (value: string) => string) {
  const raw = request.headers.get("idempotency-key");
  if (!raw) throw conflict("Idempotency-Key obrigatoria");
  return parse(raw);
}
