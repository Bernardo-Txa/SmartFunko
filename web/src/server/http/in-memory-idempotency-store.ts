export type IdempotencyEntry = { expiresAt: number; fingerprint: string; value: Promise<unknown> };
export class IdempotencyPayloadMismatchError extends Error {}

export class InMemoryIdempotencyStore {
  readonly ttlMs: number;
  private readonly entries = new Map<string, IdempotencyEntry>();

  constructor(ttlMs = 5 * 60 * 1000) { this.ttlMs = ttlMs; }

  async run<T>(scope: string, key: string, fingerprint: string, operation: () => Promise<T>, now = Date.now()): Promise<T> {
    for (const [entryKey, entry] of this.entries) if (entry.expiresAt <= now) this.entries.delete(entryKey);
    const cacheKey = `${scope}:${key}`;
    const existing = this.entries.get(cacheKey);
    if (existing) {
      if (existing.fingerprint !== fingerprint) throw new IdempotencyPayloadMismatchError();
      return existing.value as Promise<T>;
    }
    const value = operation();
    this.entries.set(cacheKey, { expiresAt: now + this.ttlMs, fingerprint, value });
    try { return await value; } catch (error) { this.entries.delete(cacheKey); throw error; }
  }

  clear() { this.entries.clear(); }
}
