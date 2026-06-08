import { requireAdmin } from "@/server/auth/require-admin";
import { handleApi, jsonOk } from "@/server/http/responses";
import {
  PurchaseBatchService,
  updatePurchaseBatchSchema,
} from "@/server/purchase-batches/purchase-batch-service";
import { parseJsonBody } from "@/server/validation/parse-json";

type Params = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, { params }: Params) {
  return handleApi(async () => {
    const { id } = await params;
    const admin = await requireAdmin();
    const batch = await new PurchaseBatchService(undefined, admin.profile.id).getPurchaseBatchById(id);
    return jsonOk(batch);
  });
}

export async function PATCH(request: Request, { params }: Params) {
  return handleApi(async () => {
    const { id } = await params;
    const admin = await requireAdmin();
    const input = await parseJsonBody(request, updatePurchaseBatchSchema);
    const batch = await new PurchaseBatchService(undefined, admin.profile.id).updatePurchaseBatch(id, input, admin.profile.id);
    return jsonOk(batch);
  });
}
