import { badRequest } from "@/server/http/errors";
import { corsPreflightResponse, withCors } from "@/server/http/cors";
import { handleApi, jsonOk } from "@/server/http/responses";
import { OrderService } from "@/server/orders/order-service";

type Params = {
  params: Promise<{ orderNumber: string }>;
};

export async function GET(request: Request, { params }: Params) {
  return withCors(request, await handleApi(async () => {
    const { orderNumber } = await params;
    const token = new URL(request.url).searchParams.get("token");

    if (!token) {
      throw badRequest("Token obrigatorio");
    }

    const order = await new OrderService().getPublicOrderByNumberAndToken(orderNumber, token);
    return jsonOk(order);
  }));
}

export function OPTIONS(request: Request) {
  return corsPreflightResponse(request);
}
