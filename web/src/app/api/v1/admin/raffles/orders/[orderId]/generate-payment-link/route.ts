import { requireAdmin } from "@/server/auth/require-admin";
import { handleApi, jsonOk } from "@/server/http/responses";
import { assertRafflesEnabled } from "@/server/raffles/raffle-feature";
import { RaffleService } from "@/server/raffles/raffle-service";

type Params = {
  params: Promise<{ orderId: string }>;
};

export async function POST(request: Request, { params }: Params) {
  return handleApi(async () => {
    assertRafflesEnabled();
    const { orderId } = await params;
    const admin = await requireAdmin();
    const baseUrl = new URL(request.url).origin;
    const result = await new RaffleService(undefined, admin.profile.id).generateRafflePaymentLink(
      orderId,
      admin.profile.id,
      baseUrl,
    );
    return jsonOk(result);
  });
}
