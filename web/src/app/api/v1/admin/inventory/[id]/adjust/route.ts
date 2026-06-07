import { requireAdmin } from "@/server/auth/require-admin";
import { handleApi, jsonOk } from "@/server/http/responses";
import { adjustInventoryItemSchema, InventoryService } from "@/server/inventory/inventory-service";
import { parseJsonBody } from "@/server/validation/parse-json";

type Params = {
  params: Promise<{ id: string }>;
};

export async function POST(request: Request, { params }: Params) {
  return handleApi(async () => {
    const { id } = await params;
    const admin = await requireAdmin();
    const input = await parseJsonBody(request, adjustInventoryItemSchema);
    const item = await new InventoryService(undefined, admin.profile.id).adjustInventoryItem(id, input);
    return jsonOk(item);
  });
}
