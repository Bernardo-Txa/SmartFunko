import { requireAdmin } from "@/server/auth/require-admin";
import { handleApi, jsonOk } from "@/server/http/responses";
import { PaymentService } from "@/server/payments/payment-service";

export async function GET(request: Request) {
  return handleApi(async () => {
    const admin = await requireAdmin();
    const url = new URL(request.url);
    const payments = await new PaymentService(undefined, admin.profile.id).listPayments({
      endDate: url.searchParams.get("endDate") ?? undefined,
      method: url.searchParams.get("method") ?? undefined,
      search: url.searchParams.get("q") ?? undefined,
      startDate: url.searchParams.get("startDate") ?? undefined,
      status: url.searchParams.get("status") ?? undefined,
    });
    return jsonOk(payments);
  });
}
