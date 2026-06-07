import { requireAdmin } from "@/server/auth/require-admin";
import { handleApi, jsonOk } from "@/server/http/responses";
import { InventoryService } from "@/server/inventory/inventory-service";

type Params = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, { params }: Params) {
  return handleApi(async () => {
    const { id } = await params;
    const admin = await requireAdmin();
    const movements = await new InventoryService(undefined, admin.profile.id).listInventoryMovements({
      inventoryItemId: id,
    });
    return jsonOk(movements);
  });
}
