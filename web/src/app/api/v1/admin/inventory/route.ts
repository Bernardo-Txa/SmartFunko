import { requireAdmin } from "@/server/auth/require-admin";
import { handleApi, jsonCreated, jsonOk } from "@/server/http/responses";
import { addInventoryItemSchema, InventoryService } from "@/server/inventory/inventory-service";
import { parseJsonBody } from "@/server/validation/parse-json";

function booleanParam(value: string | null) {
  return value === "1" || value === "true";
}

export async function GET(request: Request) {
  return handleApi(async () => {
    const admin = await requireAdmin();
    const url = new URL(request.url);
    const inventory = await new InventoryService(undefined, admin.profile.id).listInventory({
      damaged: booleanParam(url.searchParams.get("damaged")),
      inTransit: booleanParam(url.searchParams.get("inTransit")),
      location: url.searchParams.get("location") ?? undefined,
      reserved: booleanParam(url.searchParams.get("reserved")),
      search: url.searchParams.get("q") ?? undefined,
      sold: booleanParam(url.searchParams.get("sold")),
      status: url.searchParams.get("status") ?? undefined,
      unavailable: booleanParam(url.searchParams.get("unavailable")),
    });
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
