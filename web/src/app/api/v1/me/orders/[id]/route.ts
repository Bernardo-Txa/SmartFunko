import { forbidden } from "@/server/http/errors";
import { requireUser } from "@/server/auth/require-user";
import { handleApi, jsonOk } from "@/server/http/responses";
import { OrderService } from "@/server/orders/order-service";

type Params = {
  params: Promise<{ id: string }>;
};

type CustomerOrder = {
  customer_id: string;
};

export async function GET(_request: Request, { params }: Params) {
  return handleApi(async () => {
    const { id } = await params;
    const { customer } = await requireUser();

    if (!customer) {
      throw forbidden("Cliente nao vinculado ao usuario");
    }

    const order = (await new OrderService().getOrderById(id)) as unknown as CustomerOrder;

    if (order.customer_id !== customer.id) {
      throw forbidden("Pedido nao pertence ao cliente autenticado");
    }

    return jsonOk(order);
  });
}
