import { requireAdmin } from "@/server/auth/require-admin";
import { handleApi, jsonOk } from "@/server/http/responses";
import { assertRafflesEnabled } from "@/server/raffles/raffle-feature";
import { RaffleService } from "@/server/raffles/raffle-service";

type Params = {
  params: Promise<{ id: string }>;
};

export async function POST(_request: Request, { params }: Params) {
  return handleApi(async () => {
    assertRafflesEnabled();
    const { id } = await params;
    const admin = await requireAdmin();
    const raffle = await new RaffleService(undefined, admin.profile.id).publishRaffleCampaign(
      id,
      admin.profile.id,
    );
    return jsonOk(raffle);
  });
}
