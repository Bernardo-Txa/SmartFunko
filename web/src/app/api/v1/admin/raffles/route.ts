import { requireAdmin } from "@/server/auth/require-admin";
import { handleApi, jsonCreated, jsonOk } from "@/server/http/responses";
import { createRaffleCampaignSchema, RaffleService } from "@/server/raffles/raffle-service";
import { parseJsonBody } from "@/server/validation/parse-json";

export async function GET(request: Request) {
  return handleApi(async () => {
    const searchParams = new URL(request.url).searchParams;
    const admin = await requireAdmin();
    const raffles = await new RaffleService(undefined, admin.profile.id).listRaffleCampaigns({
      limit: Number(searchParams.get("limit") ?? 100),
      q: searchParams.get("q") ?? undefined,
      status: searchParams.get("status") ?? undefined,
    });
    return jsonOk(raffles);
  });
}

export async function POST(request: Request) {
  return handleApi(async () => {
    const admin = await requireAdmin();
    const input = await parseJsonBody(request, createRaffleCampaignSchema);
    const raffle = await new RaffleService(undefined, admin.profile.id).createRaffleCampaign(
      input,
      admin.profile.id,
    );
    return jsonCreated(raffle);
  });
}
