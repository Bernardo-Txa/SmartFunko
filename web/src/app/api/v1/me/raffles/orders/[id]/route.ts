import { forbidden } from "@/server/http/errors";
import { requireUser } from "@/server/auth/require-user";
import { handleApi, jsonOk } from "@/server/http/responses";
import { assertRafflesEnabled } from "@/server/raffles/raffle-feature";
import { RaffleService } from "@/server/raffles/raffle-service";

type Params = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, { params }: Params) {
  return handleApi(async () => {
    assertRafflesEnabled();
    const { id } = await params;
    const { customer } = await requireUser();

    if (!customer) {
      throw forbidden("Cliente nao vinculado ao usuario");
    }

    const order = await new RaffleService().getMyRaffleOrderById(id, customer.id);
    return jsonOk(order);
  });
}
