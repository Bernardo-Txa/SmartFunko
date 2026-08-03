import { forbidden } from "@/server/http/errors";
import { requireUser } from "@/server/auth/require-user";
import { corsPreflightResponse, withCors } from "@/server/http/cors";
import { handleApi, jsonCreated } from "@/server/http/responses";
import { createV2PaymentSessionSchema, OrderV2Service } from "@/server/orders-v2/order-v2-service";
import { parseJsonBody } from "@/server/validation/parse-json";

export async function POST(request: Request) {
  return withCors(request, await handleApi(async () => {
    const { customer, profile } = await requireUser(request);

    if (!customer) {
      throw forbidden("Cliente nao vinculado ao usuario");
    }

    const input = await parseJsonBody(request, createV2PaymentSessionSchema);
    const session = await new OrderV2Service().createCustomerPaymentSession(customer.id, input, profile.id);
    return jsonCreated(session);
  }));
}

export function OPTIONS(request: Request) {
  return corsPreflightResponse(request);
}
