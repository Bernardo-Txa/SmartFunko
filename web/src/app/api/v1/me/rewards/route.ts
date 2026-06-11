import { forbidden } from "@/server/http/errors";
import { requireUser } from "@/server/auth/require-user";
import { handleApi, jsonOk } from "@/server/http/responses";
import { RewardsService } from "@/server/rewards/rewards-service";

export async function GET() {
  return handleApi(async () => {
    const { customer } = await requireUser();

    if (!customer) {
      throw forbidden("Cliente nao vinculado ao usuario");
    }

    const club = await new RewardsService().getCustomerClub(customer.id);
    return jsonOk(club);
  });
}
