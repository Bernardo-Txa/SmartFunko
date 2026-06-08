import { requireAdmin } from "@/server/auth/require-admin";
import { handleApi, jsonOk } from "@/server/http/responses";
import { assertRafflesEnabled } from "@/server/raffles/raffle-feature";
import { RaffleService, updateRaffleCampaignSchema } from "@/server/raffles/raffle-service";
import { parseJsonBody } from "@/server/validation/parse-json";

type Params = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, { params }: Params) {
  return handleApi(async () => {
    assertRafflesEnabled();
    const { id } = await params;
    const admin = await requireAdmin();
    const raffle = await new RaffleService(undefined, admin.profile.id).getRaffleCampaignById(id);
    return jsonOk(raffle);
  });
}

export async function PATCH(request: Request, { params }: Params) {
  return handleApi(async () => {
    assertRafflesEnabled();
    const { id } = await params;
    const admin = await requireAdmin();
    const input = await parseJsonBody(request, updateRaffleCampaignSchema);
    const raffle = await new RaffleService(undefined, admin.profile.id).updateRaffleCampaign(
      id,
      input,
      admin.profile.id,
    );
    return jsonOk(raffle);
  });
}
