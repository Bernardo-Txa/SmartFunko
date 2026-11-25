import { requireAdmin } from "@/server/auth/require-admin";
import { handleApi, jsonOk } from "@/server/http/responses";
import { adjustReadyStockQuantitySchema, ReadyStockService } from "@/server/ready-stock/ready-stock-service";
import { parseJsonBody } from "@/server/validation/parse-json";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Params) {
  return handleApi(async () => {
    const admin = await requireAdmin();
    const { id } = await params;
    const input = await parseJsonBody(request, adjustReadyStockQuantitySchema);
    return jsonOk(await new ReadyStockService(undefined, admin.profile.id).adjustQuantity(id, input.quantity));
  });
}
