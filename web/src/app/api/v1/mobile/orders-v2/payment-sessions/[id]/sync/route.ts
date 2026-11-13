import { forbidden, notFound } from "@/server/http/errors";
import { requireUser } from "@/server/auth/require-user";
import { corsPreflightResponse, withCors } from "@/server/http/cors";
import { handleApi, jsonOk } from "@/server/http/responses";
import { OrderV2Service } from "@/server/orders-v2/order-v2-service";
import { mobilePaymentSessionIdSchema } from "@/server/mobile/orders-v2-mobile-contract";
import { ownsPaymentSession } from "@/server/mobile/mobile-ownership";

export async function POST(request: Request, context: RouteContext<"/api/v1/mobile/orders-v2/payment-sessions/[id]/sync">) {
  return withCors(request, await handleApi(async () => {
    const { customer, profile } = await requireUser(request);
    if (!customer) throw forbidden("Cliente nao vinculado ao usuario");
    const { id: rawId } = await context.params;
    const id = mobilePaymentSessionIdSchema.parse(rawId);
    const service = new OrderV2Service();
    const session = await service.getPaymentSessionById(id) as unknown as { customer_id: string };
    if (!ownsPaymentSession(session, customer.id)) throw notFound("Checkout V2 nao encontrado");
    const result = await service.syncPaymentSession(id, profile.id);
    return jsonOk({ paid: result.paid, status: result.status });
  }));
}

export function OPTIONS(request: Request) { return corsPreflightResponse(request); }
