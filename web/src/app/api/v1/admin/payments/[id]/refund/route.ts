import { requireAdmin } from "@/server/auth/require-admin";
import { handleApi, jsonOk } from "@/server/http/responses";
import { PaymentService, refundManualPaymentSchema } from "@/server/payments/payment-service";
import { parseJsonBody } from "@/server/validation/parse-json";

type Params = {
  params: Promise<{ id: string }>;
};

export async function POST(request: Request, { params }: Params) {
  return handleApi(async () => {
    const { id } = await params;
    const admin = await requireAdmin();
    const input = await parseJsonBody(request, refundManualPaymentSchema);
    const refund = await new PaymentService(undefined, admin.profile.id).refundManualPayment(id, input);
    return jsonOk(refund);
  });
}
