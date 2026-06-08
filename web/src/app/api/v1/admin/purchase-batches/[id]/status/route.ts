import { requireAdmin } from "@/server/auth/require-admin";
import { handleApi, jsonOk } from "@/server/http/responses";
import {
  changePurchaseBatchStatusSchema,
  PurchaseBatchService,
} from "@/server/purchase-batches/purchase-batch-service";
import { parseJsonBody } from "@/server/validation/parse-json";

type Params = {
  params: Promise<{ id: string }>;
};

export async function POST(request: Request, { params }: Params) {
  return handleApi(async () => {
    const { id } = await params;
    const admin = await requireAdmin();
    const input = await parseJsonBody(request, changePurchaseBatchStatusSchema);
    const batch = await new PurchaseBatchService(undefined, admin.profile.id).changePurchaseBatchStatus(
      id,
      input.status,
      admin.profile.id,
      input.notes,
    );
    return jsonOk(batch);
  });
}
