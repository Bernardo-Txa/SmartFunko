import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("existing web V2 routes and consumers retain their established contracts", async () => {
  const [ordersRoute, sessionsRoute, cart, panel] = await Promise.all([
    readFile(new URL("../src/app/api/v1/me/orders-v2/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../src/app/api/v1/me/orders-v2/payment-sessions/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../src/components/storefront/assisted-cart.tsx", import.meta.url), "utf8"),
    readFile(new URL("../src/components/account/orders-v2-payment-panel.tsx", import.meta.url), "utf8"),
  ]);
  assert.match(ordersRoute, /getCustomerOrders\(customer\.id\)/);
  assert.match(ordersRoute, /createCustomerSiteOrderFromCart\(customer\.id, input, profile\.id\)/);
  assert.match(sessionsRoute, /createCustomerPaymentSession\(customer\.id, input, profile\.id\)/);
  assert.match(cart, /fetch\("\/api\/v1\/me\/orders-v2"/);
  assert.match(panel, /fetch\("\/api\/v1\/me\/orders-v2\/payment-sessions"/);
  assert.match(panel, /payment_link_url/);
});

test("all mobile handlers authenticate and the proxy does not special-case mobile APIs", async () => {
  const routeUrls = [
    "../src/app/api/v1/mobile/orders-v2/route.ts",
    "../src/app/api/v1/mobile/orders-v2/[identifier]/route.ts",
    "../src/app/api/v1/mobile/orders-v2/payment-sessions/route.ts",
    "../src/app/api/v1/mobile/orders-v2/payment-sessions/[id]/sync/route.ts",
  ];
  const mobileSources = await Promise.all(routeUrls.map((routeUrl) => readFile(new URL(routeUrl, import.meta.url), "utf8")));
  for (const source of mobileSources) assert.match(source, /requireUser\(request\)/);
  const proxy = await readFile(new URL("../src/proxy.ts", import.meta.url), "utf8");
  assert.match(proxy, /const isPageRequest = !pathname\.startsWith\("\/api\/"\)/);
  assert.doesNotMatch(proxy, /mobile\/orders-v2/);
  for (const source of mobileSources) assert.match(source, /Cliente nao vinculado ao usuario/);
});

test("CORS adds only the idempotency header without widening origins, methods or credentials", async () => {
  const cors = await readFile(new URL("../src/server/http/cors.ts", import.meta.url), "utf8");
  assert.match(cors, /GET,POST,PATCH,PUT,DELETE,OPTIONS/);
  assert.match(cors, /Content-Type, Authorization, Idempotency-Key, X-Requested-With/);
  assert.match(cors, /https:\/\/smartfunko\.com\.br/);
  assert.doesNotMatch(cors, /Access-Control-Allow-Credentials/);
  assert.doesNotMatch(cors, /Access-Control-Allow-Origin[^\n]*\*/);
});

test("shared payment service retains ownership, eligibility and competence guards", async () => {
  const service = await readFile(new URL("../src/server/orders-v2/order-v2-service.ts", import.meta.url), "utf8");
  assert.match(service, /order\.customer_id !== customerId/);
  assert.match(service, /order\.approval_status !== "aprovado"/);
  assert.match(service, /Pedido .* nao esta disponivel para pagamento/);
  assert.match(service, /competenceIds\.length !== 1/);
  assert.match(service, /Pedido nao encontrado para este cliente/);
});

test("mobile routes retain missing-resource and idempotency guards", async () => {
  const [orders, detail, sessions, sync, idempotency] = await Promise.all([
    readFile(new URL("../src/app/api/v1/mobile/orders-v2/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../src/app/api/v1/mobile/orders-v2/[identifier]/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../src/app/api/v1/mobile/orders-v2/payment-sessions/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../src/app/api/v1/mobile/orders-v2/payment-sessions/[id]/sync/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../src/server/http/idempotency.ts", import.meta.url), "utf8"),
  ]);
  assert.match(orders, /requireIdempotencyKey/);
  assert.match(sessions, /requireIdempotencyKey/);
  assert.match(idempotency, /Idempotency-Key obrigatoria/);
  assert.match(detail, /throw notFound\("Pedido nao encontrado"\)/);
  assert.match(sync, /getPaymentSessionById/);
  assert.match(sync, /throw notFound\("Checkout V2 nao encontrado"\)/);
});
