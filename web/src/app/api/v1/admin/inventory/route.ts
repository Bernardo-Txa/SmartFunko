import { requireAdmin } from "@/server/auth/require-admin";
import { handleApi, jsonCreated, jsonOk } from "@/server/http/responses";
import { addInventoryItemSchema, InventoryService } from "@/server/inventory/inventory-service";
import { parseJsonBody } from "@/server/validation/parse-json";

export async function GET() {
  return handleApi(async () => {
    const admin = await requireAdmin();
    const inventory = await new InventoryService(undefined, admin.profile.id).listInventory();
    return jsonOk(inventory);
  });
}

export async function POST(request: Request) {
  return handleApi(async () => {
    const admin = await requireAdmin();
    const input = await parseJsonBody(request, addInventoryItemSchema);
    const item = await new InventoryService(undefined, admin.profile.id).addInventoryItem(input);
    return jsonCreated(item);
  });
}
