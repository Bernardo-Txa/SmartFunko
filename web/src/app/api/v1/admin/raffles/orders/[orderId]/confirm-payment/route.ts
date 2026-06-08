import { requireAdmin } from "@/server/auth/require-admin";
import { handleApi, jsonOk } from "@/server/http/responses";
import { assertRafflesEnabled } from "@/server/raffles/raffle-feature";
import { confirmRaffleOrderPaymentSchema, RaffleService } from "@/server/raffles/raffle-service";
import { parseJsonBody } from "@/server/validation/parse-json";

type Params = {
  params: Promise<{ orderId: string }>;
};

export async function POST(request: Request, { params }: Params) {
  return handleApi(async () => {
    assertRafflesEnabled();
    const { orderId } = await params;
    const admin = await requireAdmin();
    const input = await parseJsonBody(request, confirmRaffleOrderPaymentSchema);
    const order = await new RaffleService(undefined, admin.profile.id).confirmRaffleOrderPayment(
      orderId,
      input,
      admin.profile.id,
    );
    return jsonOk(order);
  });
}
