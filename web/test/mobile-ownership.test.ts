import assert from "node:assert/strict";
import test from "node:test";
// @ts-expect-error Node's strip-types runner requires the explicit extension.
import { findOwnedOrder, ownsPaymentSession } from "../src/server/mobile/mobile-ownership.ts";

const orders = [
  { customer_id: "customer-a", id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", order_number: "SFV2-20261112-120000-AAAAA" },
  { customer_id: "customer-b", id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb", order_number: "SFV2-20261112-120001-BBBBB" },
];

test("customer cannot enumerate another customer's order by UUID or number", () => {
  assert.equal(findOwnedOrder(orders, "customer-a", orders[1].id), null);
  assert.equal(findOwnedOrder(orders, "customer-a", orders[1].order_number), null);
  assert.equal(findOwnedOrder(orders, "customer-a", "missing"), null);
});

test("customer cannot synchronize another customer's payment session", () => {
  assert.equal(ownsPaymentSession({ customer_id: "customer-b" }, "customer-a"), false);
  assert.equal(ownsPaymentSession({ customer_id: "customer-a" }, "customer-a"), true);
});
