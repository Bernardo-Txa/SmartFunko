import { z } from "zod";
import { requireAdmin } from "@/server/auth/require-admin";
import { handleApi, jsonCreated } from "@/server/http/responses";
import { createV2PaymentSessionSchema, OrderV2Service } from "@/server/orders-v2/order-v2-service";
import { parseJsonBody } from "@/server/validation/parse-json";

const createAdminV2PaymentSessionSchema = createV2PaymentSessionSchema.extend({
  customerId: z.string().uuid(),
});

export async function POST(request: Request) {
  return handleApi(async () => {
    const admin = await requireAdmin();
    const input = await parseJsonBody(request, createAdminV2PaymentSessionSchema);
    const session = await new OrderV2Service(undefined, admin.profile.id).createCustomerPaymentSession(
      input.customerId,
      { orderIds: input.orderIds },
      admin.profile.id,
    );

    return jsonCreated(session);
  });
}
