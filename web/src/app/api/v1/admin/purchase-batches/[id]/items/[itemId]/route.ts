import { requireAdmin } from "@/server/auth/require-admin";
import { handleApi, jsonNoContent, jsonOk } from "@/server/http/responses";
import {
  PurchaseBatchService,
  updateBatchItemSchema,
} from "@/server/purchase-batches/purchase-batch-service";
import { parseJsonBody } from "@/server/validation/parse-json";

type Params = {
  params: Promise<{ id: string; itemId: string }>;
};

export async function PATCH(request: Request, { params }: Params) {
  return handleApi(async () => {
    const { id, itemId } = await params;
    const admin = await requireAdmin();
    const input = await parseJsonBody(request, updateBatchItemSchema);
    const item = await new PurchaseBatchService(undefined, admin.profile.id).updateBatchItem(
      id,
      itemId,
      input,
      admin.profile.id,
    );
    return jsonOk(item);
  });
}

export async function DELETE(_request: Request, { params }: Params) {
  return handleApi(async () => {
    const { id, itemId } = await params;
    const admin = await requireAdmin();
    await new PurchaseBatchService(undefined, admin.profile.id).removeItemFromBatch(id, itemId, admin.profile.id);
    return jsonNoContent();
  });
}
