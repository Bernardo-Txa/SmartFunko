import { forbidden } from "@/server/http/errors";
import { requireUser } from "@/server/auth/require-user";
import { corsPreflightResponse, withCors } from "@/server/http/cors";
import { handleApi, jsonCreated, jsonOk } from "@/server/http/responses";
import { createCustomerV2OrderRequestSchema, OrderV2Service } from "@/server/orders-v2/order-v2-service";
import { parseJsonBody } from "@/server/validation/parse-json";

export async function GET(request: Request) {
  return withCors(request, await handleApi(async () => {
    const { customer } = await requireUser(request);

    if (!customer) {
      throw forbidden("Cliente nao vinculado ao usuario");
    }

    const orders = await new OrderV2Service().getCustomerOrders(customer.id);
    return jsonOk(orders);
  }));
}

export async function POST(request: Request) {
  return withCors(request, await handleApi(async () => {
    const { customer, profile } = await requireUser(request);

    if (!customer) {
      throw forbidden("Cliente nao vinculado ao usuario");
    }

    const input = await parseJsonBody(request, createCustomerV2OrderRequestSchema);
    const order = await new OrderV2Service().createCustomerSiteOrderFromCart(customer.id, input, profile.id);
    return jsonCreated(order);
  }));
}

export function OPTIONS(request: Request) {
  return corsPreflightResponse(request);
}
