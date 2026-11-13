import { forbidden, notFound } from "@/server/http/errors";
import { requireUser } from "@/server/auth/require-user";
import { corsPreflightResponse, withCors } from "@/server/http/cors";
import { handleApi, jsonOk } from "@/server/http/responses";
import { mobileOrderV2IdentifierSchema, toMobileOrderV2Dto } from "@/server/mobile/orders-v2-mobile-contract";
import { OrderV2Service } from "@/server/orders-v2/order-v2-service";
import { findOwnedOrder } from "@/server/mobile/mobile-ownership";

export async function GET(request: Request, context: RouteContext<"/api/v1/mobile/orders-v2/[identifier]">) {
  return withCors(request, await handleApi(async () => {
    const { customer } = await requireUser(request);
    if (!customer) throw forbidden("Cliente nao vinculado ao usuario");
    const { identifier: rawIdentifier } = await context.params;
    const identifier = mobileOrderV2IdentifierSchema.parse(rawIdentifier);
    const orders = await new OrderV2Service().getCustomerOrders(customer.id) as unknown as Array<{
      id: string;
      order_number: string;
      customer_id?: string | null;
    }>;
    const order = findOwnedOrder(orders, customer.id, identifier);
    if (!order) throw notFound("Pedido nao encontrado");
    return jsonOk(toMobileOrderV2Dto(order));
  }));
}

export function OPTIONS(request: Request) { return corsPreflightResponse(request); }
