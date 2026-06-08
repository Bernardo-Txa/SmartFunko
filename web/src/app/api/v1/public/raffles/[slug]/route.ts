import { handleApi, jsonOk } from "@/server/http/responses";
import { assertRafflesEnabled } from "@/server/raffles/raffle-feature";
import { RaffleService } from "@/server/raffles/raffle-service";

type Params = {
  params: Promise<{ slug: string }>;
};

export async function GET(_request: Request, { params }: Params) {
  return handleApi(async () => {
    assertRafflesEnabled();
    const { slug } = await params;
    const raffle = await new RaffleService().getPublicRaffleCampaignBySlug(slug);
    return jsonOk(raffle);
  });
}
