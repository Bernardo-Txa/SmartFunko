import { handleApi, jsonOk } from "@/server/http/responses";
import { assertRafflesEnabled } from "@/server/raffles/raffle-feature";
import { RaffleService } from "@/server/raffles/raffle-service";

export async function GET() {
  return handleApi(async () => {
    assertRafflesEnabled();
    const raffles = await new RaffleService().listPublicRaffleCampaigns();
    return jsonOk(raffles);
  });
}
