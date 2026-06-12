import { forbidden } from "@/server/http/errors";
import { requireUser } from "@/server/auth/require-user";
import { corsPreflightResponse, withCors } from "@/server/http/cors";
import { handleApi, jsonOk } from "@/server/http/responses";
import { assertRafflesEnabled } from "@/server/raffles/raffle-feature";
import { RaffleService } from "@/server/raffles/raffle-service";

export async function GET(request: Request) {
  return withCors(
    request,
    await handleApi(async () => {
      assertRafflesEnabled();
      const { customer } = await requireUser(request);

      if (!customer) {
        throw forbidden("Cliente nao vinculado ao usuario");
      }

      const orders = await new RaffleService().getMyRaffleOrders(customer.id);
      return jsonOk(orders);
    }),
  );
}

export function OPTIONS(request: Request) {
  return corsPreflightResponse(request);
}
