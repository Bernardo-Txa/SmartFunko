import assert from "node:assert/strict";
import test from "node:test";
// @ts-expect-error Node's type-stripping test runner requires the explicit extension.
import { createMobileOrderV2Schema, mobileIdempotencyKeySchema, mobileOrderV2IdentifierSchema, toMobileOrderV2Dto, toMobilePaymentSessionDto } from "../src/server/mobile/orders-v2-mobile-contract.ts";

test("mobile order DTO exposes separated statuses without internal fields", () => {
  const dto = toMobileOrderV2Dto({
    id: "order-1", order_number: "SFV2-1", order_date: "2026-11-12", created_at: "2026-11-12T12:00:00Z",
    competence_id: "competence-1", approval_status: "aprovado", payment_status: "nao_pago",
    fulfillment_status: "aguardando_fechamento", total: 99.9, internal_notes: "must not leak",
    request_payload: { secret: true }, v2_order_items: [{ id: "item-1", product_name: "Funko", quantity: 1, unit_price: 99.9, total_price: 99.9 }],
  });
  assert.equal(dto.approvalStatus, "aprovado");
  assert.equal(dto.paymentStatus, "nao_pago");
  assert.equal(dto.fulfillmentStatus, "aguardando_fechamento");
  assert.equal(dto.paymentEligible, true);
  assert.equal("internalNotes" in dto, false);
  assert.equal("requestPayload" in dto, false);
});

test("mobile inputs reject customer ownership fields, invalid identifiers and invalid idempotency keys", () => {
  const input = createMobileOrderV2Schema.parse({ customerId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", items: [{ quantity: 1, variantId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa" }] });
  assert.equal("customerId" in input, false);
  assert.equal(mobileOrderV2IdentifierSchema.safeParse("../admin").success, false);
  assert.equal(mobileIdempotencyKeySchema.safeParse("short").success, false);
});

test("payment eligibility remains false for unapproved, paid or cancelled orders", () => {
  const base = { id: "order", order_number: "SFV2", order_date: "2026-11-12", created_at: "2026-11-12T00:00:00Z", competence_id: "competence", total: 10, v2_order_items: [] };
  assert.equal(toMobileOrderV2Dto({ ...base, approval_status: "aguardando_aprovacao", payment_status: "nao_pago", fulfillment_status: "aguardando_fechamento" }).paymentEligible, false);
  assert.equal(toMobileOrderV2Dto({ ...base, approval_status: "aprovado", payment_status: "pago", fulfillment_status: "aguardando_fechamento" }).paymentEligible, false);
  assert.equal(toMobileOrderV2Dto({ ...base, approval_status: "aprovado", payment_status: "nao_pago", fulfillment_status: "cancelado" }).paymentEligible, false);
});

test("mobile payment DTO omits provider payload and customer data", () => {
  const dto = toMobilePaymentSessionDto({ id: "session-1", checkout_number: "PAY-1", status: "pending", amount: 100, payment_link_url: "https://example.test/pay", provider_reference: "private", request_payload: { private: true }, customers: { cpf: "private" }, v2_payment_session_orders: [] });
  assert.deepEqual(Object.keys(dto).sort(), ["amount", "checkoutNumber", "expiresAt", "id", "orderIds", "paidAt", "paymentLinkUrl", "status"].sort());
});
