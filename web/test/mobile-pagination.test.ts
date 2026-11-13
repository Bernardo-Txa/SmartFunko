import assert from "node:assert/strict";
import test from "node:test";
// @ts-expect-error Node's strip-types runner requires the explicit extension.
import { decodeMobileOrderCursor, encodeMobileOrderCursor, mobileOrderPageLimitSchema } from "../src/server/mobile/mobile-pagination.ts";

test("cursor round-trips the stable created-at and id boundary", () => {
  const boundary = { createdAt: "2026-11-13T00:00:00.000Z", id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa" };
  assert.deepEqual(decodeMobileOrderCursor(encodeMobileOrderCursor(boundary)), boundary);
});

test("page size has a safe upper bound and malformed cursors fail", () => {
  assert.equal(mobileOrderPageLimitSchema.parse("50"), 50);
  assert.equal(mobileOrderPageLimitSchema.safeParse("51").success, false);
  assert.throws(() => decodeMobileOrderCursor("not-a-cursor"));
});
