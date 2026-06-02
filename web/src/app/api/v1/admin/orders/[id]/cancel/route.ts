import { z } from "zod";
import { requireAdmin } from "@/server/auth/require-admin";
import { handleApi, jsonOk } from "@/server/http/responses";
import { OrderService } from "@/server/orders/order-service";
import { parseJsonBody } from "@/server/validation/parse-json";

const cancelSchema = z.object({
  notes: z.string().trim().optional(),
});

type Params = {
  params: Promise<{ id: string }>;
};

export async function POST(request: Request, { params }: Params) {
  return handleApi(async () => {
    const { id } = await params;
    const admin = await requireAdmin();
    const input = await parseJsonBody(request, cancelSchema);
    const order = await new OrderService(undefined, admin.profile.id).cancelOrder(id, input.notes);
    return jsonOk(order);
  });
}
