import { requireAdmin } from "@/server/auth/require-admin";
import { handleApi, jsonOk } from "@/server/http/responses";
import { OrderService, updateOrderSchema } from "@/server/orders/order-service";
import { parseJsonBody } from "@/server/validation/parse-json";

type Params = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, { params }: Params) {
  return handleApi(async () => {
    const { id } = await params;
    const admin = await requireAdmin();
    const order = await new OrderService(undefined, admin.profile.id).getOrderById(id);
    return jsonOk(order);
  });
}

export async function PATCH(request: Request, { params }: Params) {
  return handleApi(async () => {
    const { id } = await params;
    const admin = await requireAdmin();
    const input = await parseJsonBody(request, updateOrderSchema);
    const order = await new OrderService(undefined, admin.profile.id).updateOrder(id, input);
    return jsonOk(order);
  });
}
