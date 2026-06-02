import { requireAdmin } from "@/server/auth/require-admin";
import { handleApi, jsonOk } from "@/server/http/responses";
import { OrderService, updateOrderItemStatusSchema } from "@/server/orders/order-service";
import { parseJsonBody } from "@/server/validation/parse-json";

type Params = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: Request, { params }: Params) {
  return handleApi(async () => {
    const { id } = await params;
    const admin = await requireAdmin();
    const input = await parseJsonBody(request, updateOrderItemStatusSchema);
    const item = await new OrderService(undefined, admin.profile.id).updateOrderItemStatus(
      id,
      input.status,
      input.notes,
    );
    return jsonOk(item);
  });
}
