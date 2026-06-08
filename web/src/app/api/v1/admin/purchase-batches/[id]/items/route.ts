import { requireAdmin } from "@/server/auth/require-admin";
import { handleApi, jsonCreated, jsonOk } from "@/server/http/responses";
import {
  addBatchItemSchema,
  PurchaseBatchService,
} from "@/server/purchase-batches/purchase-batch-service";
import { parseJsonBody } from "@/server/validation/parse-json";
import { z } from "zod";

const addItemRequestSchema = addBatchItemSchema.extend({
  orderItemId: z.string().uuid(),
});

type Params = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, { params }: Params) {
  return handleApi(async () => {
    const { id } = await params;
    const admin = await requireAdmin();
    const batch = await new PurchaseBatchService(undefined, admin.profile.id).getPurchaseBatchById(id) as {
      purchase_batch_items?: unknown[];
    };
    return jsonOk(batch.purchase_batch_items ?? []);
  });
}

export async function POST(request: Request, { params }: Params) {
  return handleApi(async () => {
    const { id } = await params;
    const admin = await requireAdmin();
    const input = await parseJsonBody(request, addItemRequestSchema);
    const { orderItemId, ...payload } = input;
    const item = await new PurchaseBatchService(undefined, admin.profile.id).addOrderItemToBatch(
      id,
      orderItemId,
      payload,
      admin.profile.id,
    );
    return jsonCreated(item);
  });
}
