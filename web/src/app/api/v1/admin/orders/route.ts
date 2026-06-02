import { requireAdmin } from "@/server/auth/require-admin";
import { handleApi, jsonCreated, jsonOk } from "@/server/http/responses";
import { createManualOrderSchema, OrderService } from "@/server/orders/order-service";
import { parseJsonBody } from "@/server/validation/parse-json";

export async function GET() {
  return handleApi(async () => {
    const admin = await requireAdmin();
    const orders = await new OrderService(undefined, admin.profile.id).listOrders();
    return jsonOk(orders);
  });
}

export async function POST(request: Request) {
  return handleApi(async () => {
    const admin = await requireAdmin();
    const input = await parseJsonBody(request, createManualOrderSchema);
    const order = await new OrderService(undefined, admin.profile.id).createManualOrder(input);
    return jsonCreated(order);
  });
}
