import { badRequest } from "@/server/http/errors";
import { handleApi, jsonOk } from "@/server/http/responses";
import { OrderService } from "@/server/orders/order-service";

type Params = {
  params: Promise<{ orderNumber: string }>;
};

export async function GET(request: Request, { params }: Params) {
  return handleApi(async () => {
    const { orderNumber } = await params;
    const token = new URL(request.url).searchParams.get("token");

    if (!token) {
      throw badRequest("Token obrigatorio");
    }

    const order = await new OrderService().getPublicOrderByNumberAndToken(orderNumber, token);
    return jsonOk(order);
  });
}
