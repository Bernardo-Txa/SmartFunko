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
    const service = new RaffleService();
    const raffle = await service.getPublicRaffleCampaignBySlug(slug);
    const numbers = await service.listPublicRaffleNumbers(raffle.id);
    return jsonOk(numbers);
  });
}
