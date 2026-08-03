import { requireAdmin } from "@/server/auth/require-admin";
import { handleApi, jsonOk } from "@/server/http/responses";
import { OrderV2Service, updateV2FulfillmentSchema } from "@/server/orders-v2/order-v2-service";
import { parseJsonBody } from "@/server/validation/parse-json";

type Params = {
  params: Promise<{ id: string }>;
};

export async function POST(request: Request, { params }: Params) {
  return handleApi(async () => {
    const { id } = await params;
    const admin = await requireAdmin();
    const input = await parseJsonBody(request, updateV2FulfillmentSchema);
    const order = await new OrderV2Service(undefined, admin.profile.id).updateFulfillment(id, input);
    return jsonOk(order);
  });
}
