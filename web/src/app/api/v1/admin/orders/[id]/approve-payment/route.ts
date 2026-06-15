import { requireAdmin } from "@/server/auth/require-admin";
import {
  AssistedCheckoutService,
  approveOrderForPaymentSchema,
} from "@/server/checkout/assisted-checkout-service";
import { badRequest } from "@/server/http/errors";
import { handleApi, jsonOk } from "@/server/http/responses";

type Params = {
  params: Promise<{ id: string }>;
};

export async function POST(request: Request, { params }: Params) {
  return handleApi(async () => {
    const { id } = await params;
    const admin = await requireAdmin();
    const baseUrl = new URL(request.url).origin;
    const rawBody = await request.text();
    let body: unknown = {};

    try {
      body = rawBody.trim() ? JSON.parse(rawBody) : {};
    } catch {
      throw badRequest("Corpo JSON invalido");
    }

    const input = rawBody.trim()
      ? approveOrderForPaymentSchema.parse(body)
      : approveOrderForPaymentSchema.parse({});
    let result;

    try {
      result = await new AssistedCheckoutService(undefined, admin.profile.id).approveOrderForPayment(
        id,
        admin.profile.id,
        baseUrl,
        input,
      );
    } catch (error) {
      console.error("[ApprovePayment] failed", {
        adminId: admin.profile.id,
        error,
        orderId: id,
      });
      throw error;
    }

    return jsonOk(result);
  });
}
