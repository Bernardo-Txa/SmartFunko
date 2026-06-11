import { forbidden } from "@/server/http/errors";
import { requireUser } from "@/server/auth/require-user";
import { corsPreflightResponse, withCors } from "@/server/http/cors";
import { handleApi, jsonOk } from "@/server/http/responses";
import { RewardsService, updateRewardProfileSchema } from "@/server/rewards/rewards-service";
import { parseJsonBody } from "@/server/validation/parse-json";

export async function PATCH(request: Request) {
  return withCors(request, await handleApi(async () => {
    const { customer } = await requireUser();

    if (!customer) {
      throw forbidden("Cliente nao vinculado ao usuario");
    }

    const input = await parseJsonBody(request, updateRewardProfileSchema);
    const profile = await new RewardsService().updateCustomerProfile(customer.id, input);
    return jsonOk(profile);
  }));
}

export function OPTIONS(request: Request) {
  return corsPreflightResponse(request);
}
