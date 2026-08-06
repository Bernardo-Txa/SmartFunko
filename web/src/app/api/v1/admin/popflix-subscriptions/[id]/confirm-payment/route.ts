import { requireAdmin } from "@/server/auth/require-admin";
import { handleApi, jsonOk } from "@/server/http/responses";
import {
  PopFlixSubscriptionService,
  confirmPopFlixPaymentSchema,
} from "@/server/popflix/popflix-subscription-service";
import { parseJsonBody } from "@/server/validation/parse-json";

type Params = {
  params: Promise<{ id: string }>;
};

export async function POST(request: Request, { params }: Params) {
  return handleApi(async () => {
    const { id } = await params;
    const admin = await requireAdmin();
    const input = await parseJsonBody(request, confirmPopFlixPaymentSchema);
    const subscription = await new PopFlixSubscriptionService(undefined, admin.profile.id)
      .confirmSubscriptionPayment(id, input, admin.profile.id);

    return jsonOk(subscription);
  });
}
