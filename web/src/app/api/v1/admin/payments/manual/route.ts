import { requireAdmin } from "@/server/auth/require-admin";
import { handleApi, jsonCreated } from "@/server/http/responses";
import { manualPaymentSchema, PaymentService } from "@/server/payments/payment-service";
import { parseJsonBody } from "@/server/validation/parse-json";

export async function POST(request: Request) {
  return handleApi(async () => {
    const admin = await requireAdmin();
    const input = await parseJsonBody(request, manualPaymentSchema);
    const payment = await new PaymentService(undefined, admin.profile.id).recordManualPayment(input);
    return jsonCreated(payment);
  });
}
