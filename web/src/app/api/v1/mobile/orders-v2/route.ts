import { forbidden } from "@/server/http/errors";
import { requireUser } from "@/server/auth/require-user";
import { corsPreflightResponse, withCors } from "@/server/http/cors";
import { handleApi, jsonCreated, jsonOk } from "@/server/http/responses";
import { idempotencyFingerprint, requireIdempotencyKey, runIdempotent } from "@/server/http/idempotency";
import { createMobileOrderV2Schema, mobileIdempotencyKeySchema, toMobileOrderV2Dto } from "@/server/mobile/orders-v2-mobile-contract";
import { OrderV2Service } from "@/server/orders-v2/order-v2-service";
import { parseJsonBody } from "@/server/validation/parse-json";

export async function GET(request: Request) {
  return withCors(request, await handleApi(async () => {
    const { customer } = await requireUser(request);
    if (!customer) throw forbidden("Cliente nao vinculado ao usuario");
    const orders = await new OrderV2Service().getCustomerOrders(customer.id);
    return jsonOk(orders.map(toMobileOrderV2Dto));
  }));
}

export async function POST(request: Request) {
  return withCors(request, await handleApi(async () => {
    const { customer, profile } = await requireUser(request);
    if (!customer) throw forbidden("Cliente nao vinculado ao usuario");
    const key = requireIdempotencyKey(request, (value) => mobileIdempotencyKeySchema.parse(value));
    const input = await parseJsonBody(request, createMobileOrderV2Schema);
    const order = await runIdempotent(`mobile-order:${customer.id}`, key, idempotencyFingerprint(input), () =>
      new OrderV2Service().createCustomerSiteOrderFromCart(customer.id, input, profile.id));
    return jsonCreated(toMobileOrderV2Dto(order));
  }));
}

export function OPTIONS(request: Request) { return corsPreflightResponse(request); }
