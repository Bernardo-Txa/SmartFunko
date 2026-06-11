import { corsPreflightResponse, withCors } from "@/server/http/cors";
import { handleApi, jsonOk } from "@/server/http/responses";
import { assertRafflesEnabled } from "@/server/raffles/raffle-feature";
import { RaffleService } from "@/server/raffles/raffle-service";

export async function GET(request: Request) {
  return withCors(request, await handleApi(async () => {
    assertRafflesEnabled();
    const raffles = await new RaffleService().listPublicRaffleCampaigns();
    return jsonOk(raffles);
  }));
}

export function OPTIONS(request: Request) {
  return corsPreflightResponse(request);
}
