import { forbidden } from "@/server/http/errors";
import { requireUser } from "@/server/auth/require-user";
import { corsPreflightResponse, withCors } from "@/server/http/cors";
import { handleApi, jsonOk } from "@/server/http/responses";
import { OrderV2Service } from "@/server/orders-v2/order-v2-service";

type Params = {
  params: Promise<{ id: string }>;
};

export async function POST(request: Request, { params }: Params) {
  return withCors(request, await handleApi(async () => {
    const { id } = await params;
    const { customer, profile } = await requireUser(request);

    if (!customer) {
      throw forbidden("Cliente nao vinculado ao usuario");
    }

    const session = await new OrderV2Service().getPaymentSessionById(id) as unknown as { customer_id: string };

    if (session.customer_id !== customer.id) {
      throw forbidden("Checkout nao pertence ao cliente");
    }

    const result = await new OrderV2Service().syncPaymentSession(id, profile.id);
    return jsonOk(result);
  }));
}

export function OPTIONS(request: Request) {
  return corsPreflightResponse(request);
}
