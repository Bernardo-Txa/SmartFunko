import { requireAdmin } from "@/server/auth/require-admin";
import { handleApi, jsonOk } from "@/server/http/responses";
import { drawRaffleCampaignSchema, RaffleService } from "@/server/raffles/raffle-service";
import { parseJsonBody } from "@/server/validation/parse-json";

type Params = {
  params: Promise<{ id: string }>;
};

export async function POST(request: Request, { params }: Params) {
  return handleApi(async () => {
    const { id } = await params;
    const admin = await requireAdmin();
    const input = await parseJsonBody(request, drawRaffleCampaignSchema);
    const raffle = await new RaffleService(undefined, admin.profile.id).drawRaffleCampaign(
      id,
      input,
      admin.profile.id,
    );
    return jsonOk(raffle);
  });
}
