import { z } from "zod";
import { requireAdmin } from "@/server/auth/require-admin";
import { handleApi, jsonOk } from "@/server/http/responses";
import { PopFlixSubscriptionService } from "@/server/popflix/popflix-subscription-service";
import { parseJsonBody } from "@/server/validation/parse-json";

const syncPopFlixPaymentSchema = z.object({
  slug: z.string().trim().optional().nullable(),
  transactionNsu: z.string().trim().optional().nullable(),
});

type Params = {
  params: Promise<{ id: string }>;
};

export async function POST(request: Request, { params }: Params) {
  return handleApi(async () => {
    const { id } = await params;
    const admin = await requireAdmin();
    const input = await parseJsonBody(request, syncPopFlixPaymentSchema);
    const result = await new PopFlixSubscriptionService(undefined, admin.profile.id)
      .syncSubscriptionPayment(id, admin.profile.id, input);

    return jsonOk(result);
  });
}
