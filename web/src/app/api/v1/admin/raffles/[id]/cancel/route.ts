import { requireAdmin } from "@/server/auth/require-admin";
import { handleApi, jsonOk } from "@/server/http/responses";
import { RaffleService } from "@/server/raffles/raffle-service";

type Params = {
  params: Promise<{ id: string }>;
};

export async function POST(_request: Request, { params }: Params) {
  return handleApi(async () => {
    const { id } = await params;
    const admin = await requireAdmin();
    const raffle = await new RaffleService(undefined, admin.profile.id).cancelRaffleCampaign(
      id,
      admin.profile.id,
    );
    return jsonOk(raffle);
  });
}
