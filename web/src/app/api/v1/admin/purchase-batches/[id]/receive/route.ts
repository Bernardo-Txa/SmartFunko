import { requireAdmin } from "@/server/auth/require-admin";
import { handleApi, jsonOk } from "@/server/http/responses";
import {
  PurchaseBatchService,
  receivePurchaseBatchSchema,
} from "@/server/purchase-batches/purchase-batch-service";
import { parseJsonBody } from "@/server/validation/parse-json";

type Params = {
  params: Promise<{ id: string }>;
};

export async function POST(request: Request, { params }: Params) {
  return handleApi(async () => {
    const { id } = await params;
    const admin = await requireAdmin();
    const input = await parseJsonBody(request, receivePurchaseBatchSchema);
    const result = await new PurchaseBatchService(undefined, admin.profile.id).receiveBatch(id, input, admin.profile.id);
    return jsonOk(result);
  });
}
