import { requireAdmin } from "@/server/auth/require-admin";
import { handleApi, jsonCreated, jsonOk } from "@/server/http/responses";
import { createV2AdminOrderBatchSchema, OrderV2Service } from "@/server/orders-v2/order-v2-service";
import { parseJsonBody } from "@/server/validation/parse-json";

export async function GET(request: Request) {
  return handleApi(async () => {
    const searchParams = new URL(request.url).searchParams;
    const admin = await requireAdmin();
    const orders = await new OrderV2Service(undefined, admin.profile.id).listAdminOrders({
      approvalStatus: searchParams.get("approvalStatus") ?? undefined,
      competenceId: searchParams.get("competenceId") ?? undefined,
      customerId: searchParams.get("customerId") ?? undefined,
      fulfillmentStatus: searchParams.get("fulfillmentStatus") ?? undefined,
      paymentStatus: searchParams.get("paymentStatus") ?? undefined,
      search: searchParams.get("q") ?? undefined,
      source: searchParams.get("source") ?? undefined,
    });

    return jsonOk(orders);
  });
}

export async function POST(request: Request) {
  return handleApi(async () => {
    const admin = await requireAdmin();
    const input = await parseJsonBody(request, createV2AdminOrderBatchSchema);
    const orders = await new OrderV2Service(undefined, admin.profile.id).createAdminWhatsAppOrders(input);
    return jsonCreated(orders);
  });
}
