import { requireAdmin } from "@/server/auth/require-admin";
import { AssistedCheckoutService } from "@/server/checkout/assisted-checkout-service";
import { handleApi, jsonOk } from "@/server/http/responses";

type Params = {
  params: Promise<{ id: string }>;
};

export async function POST(request: Request, { params }: Params) {
  return handleApi(async () => {
    const { id } = await params;
    const admin = await requireAdmin();
    const baseUrl = new URL(request.url).origin;
    const result = await new AssistedCheckoutService(undefined, admin.profile.id).generatePaymentLinkForOrder(
      id,
      admin.profile.id,
      undefined,
      baseUrl,
    );

    return jsonOk(result);
  });
}
