import { requireAdmin } from "@/server/auth/require-admin";
import { handleApi, jsonCreated, jsonOk } from "@/server/http/responses";
import {
  createPurchaseBatchSchema,
  PurchaseBatchService,
} from "@/server/purchase-batches/purchase-batch-service";
import { parseJsonBody } from "@/server/validation/parse-json";

export async function GET(request: Request) {
  return handleApi(async () => {
    const searchParams = new URL(request.url).searchParams;
    const admin = await requireAdmin();
    const batches = await new PurchaseBatchService(undefined, admin.profile.id).listPurchaseBatches({
      q: searchParams.get("q") ?? undefined,
      status: searchParams.get("status") ?? undefined,
      supplierId: searchParams.get("supplierId") ?? undefined,
      type: searchParams.get("type") ?? undefined,
    });

    return jsonOk(batches);
  });
}

export async function POST(request: Request) {
  return handleApi(async () => {
    const admin = await requireAdmin();
    const input = await parseJsonBody(request, createPurchaseBatchSchema);
    const batch = await new PurchaseBatchService(undefined, admin.profile.id).createPurchaseBatch(input, admin.profile.id);
    return jsonCreated(batch);
  });
}
