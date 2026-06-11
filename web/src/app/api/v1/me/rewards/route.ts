import { forbidden } from "@/server/http/errors";
import { requireUser } from "@/server/auth/require-user";
import { corsPreflightResponse, withCors } from "@/server/http/cors";
import { handleApi, jsonOk } from "@/server/http/responses";
import { RewardsService } from "@/server/rewards/rewards-service";

export async function GET(request: Request) {
  return withCors(request, await handleApi(async () => {
    const { customer } = await requireUser();

    if (!customer) {
      throw forbidden("Cliente nao vinculado ao usuario");
    }

    const club = await new RewardsService().getCustomerClub(customer.id);
    return jsonOk(club);
  }));
}

export function OPTIONS(request: Request) {
  return corsPreflightResponse(request);
}
