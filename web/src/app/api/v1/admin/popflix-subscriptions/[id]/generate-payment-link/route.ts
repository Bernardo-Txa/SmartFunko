import { requireAdmin } from "@/server/auth/require-admin";
import { handleApi, jsonOk } from "@/server/http/responses";
import { PopFlixSubscriptionService } from "@/server/popflix/popflix-subscription-service";

type Params = {
  params: Promise<{ id: string }>;
};

export async function POST(request: Request, { params }: Params) {
  return handleApi(async () => {
    const { id } = await params;
    const admin = await requireAdmin();
    const baseUrl = new URL(request.url).origin;
    const result = await new PopFlixSubscriptionService(undefined, admin.profile.id)
      .generatePaymentLinkForSubscription(id, admin.profile.id, baseUrl);

    return jsonOk(result);
  });
}
