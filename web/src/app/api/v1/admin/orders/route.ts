import { requireAdmin } from "@/server/auth/require-admin";
import { handleApi, jsonCreated, jsonOk } from "@/server/http/responses";
import { createManualOrderSchema, OrderService } from "@/server/orders/order-service";
import { parseJsonBody } from "@/server/validation/parse-json";

export async function GET(request: Request) {
  return handleApi(async () => {
    const searchParams = new URL(request.url).searchParams;
    const admin = await requireAdmin();
    const orders = await new OrderService(undefined, admin.profile.id).listOrders({
      channel: searchParams.get("channel") ?? undefined,
      search: searchParams.get("q") ?? undefined,
      seller: searchParams.get("seller") ?? undefined,
      status: searchParams.get("status") ?? undefined,
    });
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
