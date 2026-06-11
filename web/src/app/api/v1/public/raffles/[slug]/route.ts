import { corsPreflightResponse, withCors } from "@/server/http/cors";
import { handleApi, jsonOk } from "@/server/http/responses";
import { assertRafflesEnabled } from "@/server/raffles/raffle-feature";
import { RaffleService } from "@/server/raffles/raffle-service";

type Params = {
  params: Promise<{ slug: string }>;
};

export async function GET(request: Request, { params }: Params) {
  return withCors(request, await handleApi(async () => {
    assertRafflesEnabled();
    const { slug } = await params;
    const raffle = await new RaffleService().getPublicRaffleCampaignBySlug(slug);
    return jsonOk(raffle);
  }));
}

export function OPTIONS(request: Request) {
  return corsPreflightResponse(request);
}
