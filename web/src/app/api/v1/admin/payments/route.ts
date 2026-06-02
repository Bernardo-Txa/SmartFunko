import { requireAdmin } from "@/server/auth/require-admin";
import { handleApi, jsonOk } from "@/server/http/responses";
import { PaymentService } from "@/server/payments/payment-service";

export async function GET() {
  return handleApi(async () => {
    const admin = await requireAdmin();
    const payments = await new PaymentService(undefined, admin.profile.id).listPayments();
    return jsonOk(payments);
  });
}
