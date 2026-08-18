import { forbidden } from "@/server/http/errors";
import { requireUser } from "@/server/auth/require-user";
import { corsPreflightResponse, withCors } from "@/server/http/cors";
import { handleApi, jsonOk } from "@/server/http/responses";
import { PreorderService } from "@/server/preorders/preorder-service";

type Params = {
  params: Promise<{ id: string }>;
};

export async function POST(request: Request, { params }: Params) {
  return withCors(request, await handleApi(async () => {
    const { id } = await params;
    const { customer, profile } = await requireUser(request);

    if (!customer) {
      throw forbidden("Cliente nao vinculado ao usuario");
    }

    const result = await new PreorderService(undefined, profile.id).cancelCustomerReservation(
      id,
      customer.id,
      profile.id,
    );

    return jsonOk(result);
  }));
}

export function OPTIONS(request: Request) {
  return corsPreflightResponse(request);
}
