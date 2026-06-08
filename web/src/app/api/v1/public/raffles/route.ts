import { handleApi, jsonOk } from "@/server/http/responses";
import { RaffleService } from "@/server/raffles/raffle-service";

export async function GET() {
  return handleApi(async () => {
    const raffles = await new RaffleService().listPublicRaffleCampaigns();
    return jsonOk(raffles);
  });
}
