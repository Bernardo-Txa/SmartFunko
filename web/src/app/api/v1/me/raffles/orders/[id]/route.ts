import { forbidden } from "@/server/http/errors";
import { requireUser } from "@/server/auth/require-user";
import { corsPreflightResponse, withCors } from "@/server/http/cors";
import { handleApi, jsonOk } from "@/server/http/responses";
import { assertRafflesEnabled } from "@/server/raffles/raffle-feature";
import { RaffleService } from "@/server/raffles/raffle-service";

type Params = {
  params: Promise<{ id: string }>;
};

export async function GET(request: Request, { params }: Params) {
  return withCors(request, await handleApi(async () => {
    assertRafflesEnabled();
    const { id } = await params;
    const { customer } = await requireUser(request);

    if (!customer) {
      throw forbidden("Cliente nao vinculado ao usuario");
    }

    const order = await new RaffleService().getMyRaffleOrderById(id, customer.id);
    return jsonOk(order);
  }));
}

export function OPTIONS(request: Request) {
  return corsPreflightResponse(request);
}
