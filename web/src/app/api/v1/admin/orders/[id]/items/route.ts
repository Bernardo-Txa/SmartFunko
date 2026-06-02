import { requireAdmin } from "@/server/auth/require-admin";
import { handleApi, jsonCreated } from "@/server/http/responses";
import { createOrderItemSchema, OrderService } from "@/server/orders/order-service";
import { parseJsonBody } from "@/server/validation/parse-json";

type Params = {
  params: Promise<{ id: string }>;
};

export async function POST(request: Request, { params }: Params) {
  return handleApi(async () => {
    const { id } = await params;
    const admin = await requireAdmin();
    const input = await parseJsonBody(request, createOrderItemSchema);
    const item = await new OrderService(undefined, admin.profile.id).addOrderItem(id, input);
    return jsonCreated(item);
  });
}
