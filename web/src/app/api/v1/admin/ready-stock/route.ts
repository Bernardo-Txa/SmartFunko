import { requireAdmin } from "@/server/auth/require-admin";
import { handleApi, jsonCreated, jsonOk } from "@/server/http/responses";
import { createReadyStockItemSchema, ReadyStockService } from "@/server/ready-stock/ready-stock-service";
import { parseJsonBody } from "@/server/validation/parse-json";

export async function GET(request: Request) {
  return handleApi(async () => {
    const admin = await requireAdmin();
    const params = new URL(request.url).searchParams;
    return jsonOk(await new ReadyStockService(undefined, admin.profile.id).listAdminItems({
      q: params.get("q") ?? undefined,
      status: params.get("status") ?? undefined,
    }));
  });
}

export async function POST(request: Request) {
  return handleApi(async () => {
    const admin = await requireAdmin();
    const input = await parseJsonBody(request, createReadyStockItemSchema);
    return jsonCreated(await new ReadyStockService(undefined, admin.profile.id).createItem(input));
  });
}
