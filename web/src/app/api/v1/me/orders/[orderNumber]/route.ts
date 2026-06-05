import { forbidden } from "@/server/http/errors";
import { requireUser } from "@/server/auth/require-user";
import { handleApi, jsonOk } from "@/server/http/responses";
import { OrderService } from "@/server/orders/order-service";

type Params = {
  params: Promise<{ orderNumber: string }>;
};

export async function GET(_request: Request, { params }: Params) {
  return handleApi(async () => {
    const { orderNumber } = await params;
    const { customer } = await requireUser();

    if (!customer) {
      throw forbidden("Cliente nao vinculado ao usuario");
    }

    const order = await new OrderService().getCustomerOrderByNumberForApi(customer.id, orderNumber);
    return jsonOk(order);
  });
}
