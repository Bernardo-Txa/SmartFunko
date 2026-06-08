import { requireAdmin } from "@/server/auth/require-admin";
import { handleApi, jsonOk } from "@/server/http/responses";
import { assertRafflesEnabled } from "@/server/raffles/raffle-feature";
import { RaffleService } from "@/server/raffles/raffle-service";

type Params = {
  params: Promise<{ orderId: string }>;
};

export async function POST(_request: Request, { params }: Params) {
  return handleApi(async () => {
    assertRafflesEnabled();
    const { orderId } = await params;
    const admin = await requireAdmin();
    const order = await new RaffleService(undefined, admin.profile.id).cancelRaffleOrder(
      orderId,
      admin.profile.id,
    );
    return jsonOk(order);
  });
}
