import { z } from "zod";
import { requireAdmin } from "@/server/auth/require-admin";
import { handleApi, jsonOk } from "@/server/http/responses";
import { InventoryService } from "@/server/inventory/inventory-service";
import { parseJsonBody } from "@/server/validation/parse-json";

const reserveSchema = z.object({
  orderItemId: z.string().uuid(),
});

type Params = {
  params: Promise<{ id: string }>;
};

export async function POST(request: Request, { params }: Params) {
  return handleApi(async () => {
    const { id } = await params;
    const admin = await requireAdmin();
    const input = await parseJsonBody(request, reserveSchema);
    const item = await new InventoryService(undefined, admin.profile.id).reserveInventoryItem(
      id,
      input.orderItemId,
    );
    return jsonOk(item);
  });
}
