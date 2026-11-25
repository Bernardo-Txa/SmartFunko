import { requireAdmin } from "@/server/auth/require-admin";
import { handleApi, jsonOk } from "@/server/http/responses";
import { ReadyStockService, updateReadyStockItemSchema } from "@/server/ready-stock/ready-stock-service";
import { parseJsonBody } from "@/server/validation/parse-json";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  return handleApi(async () => {
    const admin = await requireAdmin();
    const { id } = await params;
    const input = await parseJsonBody(request, updateReadyStockItemSchema);
    return jsonOk(await new ReadyStockService(undefined, admin.profile.id).updateItem(id, input));
  });
}
