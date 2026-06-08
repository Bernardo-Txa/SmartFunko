import { forbidden } from "@/server/http/errors";
import { requireUser } from "@/server/auth/require-user";
import { handleApi, jsonOk } from "@/server/http/responses";
import { assertRafflesEnabled } from "@/server/raffles/raffle-feature";
import { RaffleService } from "@/server/raffles/raffle-service";

export async function GET() {
  return handleApi(async () => {
    assertRafflesEnabled();
    const { customer } = await requireUser();

    if (!customer) {
      throw forbidden("Cliente nao vinculado ao usuario");
    }

    const orders = await new RaffleService().getMyRaffleOrders(customer.id);
    return jsonOk(orders);
  });
}
