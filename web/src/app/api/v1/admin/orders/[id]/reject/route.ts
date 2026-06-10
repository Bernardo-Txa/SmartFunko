import { requireAdmin } from "@/server/auth/require-admin";
import { AssistedCheckoutService, rejectOrderSchema } from "@/server/checkout/assisted-checkout-service";
import { handleApi, jsonOk } from "@/server/http/responses";
import { parseJsonBody } from "@/server/validation/parse-json";

type Params = {
  params: Promise<{ id: string }>;
};

export async function POST(request: Request, { params }: Params) {
  return handleApi(async () => {
    const { id } = await params;
    const admin = await requireAdmin();
    const input = await parseJsonBody(request, rejectOrderSchema);
    const order = await new AssistedCheckoutService(undefined, admin.profile.id).rejectOrder(
      id,
      input.reason,
      admin.profile.id,
    );

    return jsonOk(order);
  });
}
