import { requireAdmin } from "@/server/auth/require-admin";
import { handleApi, jsonOk } from "@/server/http/responses";
import { bulkV2OrderActionSchema, OrderV2Service } from "@/server/orders-v2/order-v2-service";
import { parseJsonBody } from "@/server/validation/parse-json";

export async function POST(request: Request) {
  return handleApi(async () => {
    const admin = await requireAdmin();
    const input = await parseJsonBody(request, bulkV2OrderActionSchema);
    const result = await new OrderV2Service(undefined, admin.profile.id).applyBulkAction(input);

    return jsonOk(result);
  });
}
