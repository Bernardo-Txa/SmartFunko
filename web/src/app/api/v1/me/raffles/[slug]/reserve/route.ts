import { forbidden } from "@/server/http/errors";
import { requireUser } from "@/server/auth/require-user";
import { handleApi, jsonCreated } from "@/server/http/responses";
import { parseJsonBody } from "@/server/validation/parse-json";
import { RaffleService, reserveRaffleNumbersSchema } from "@/server/raffles/raffle-service";

type Params = {
  params: Promise<{ slug: string }>;
};

export async function POST(request: Request, { params }: Params) {
  return handleApi(async () => {
    const { slug } = await params;
    const { customer } = await requireUser();

    if (!customer) {
      throw forbidden("Cliente nao vinculado ao usuario");
    }

    const input = await parseJsonBody(request, reserveRaffleNumbersSchema);
    const service = new RaffleService();
    const raffle = await service.getPublicRaffleCampaignBySlug(slug);
    const reservation = await service.reserveRaffleNumbers(raffle.id, input.numbers, customer.id);
    return jsonCreated(reservation);
  });
}
