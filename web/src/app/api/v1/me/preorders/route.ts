import { forbidden } from "@/server/http/errors";
import { requireUser } from "@/server/auth/require-user";
import { corsPreflightResponse, withCors } from "@/server/http/cors";
import { handleApi, jsonCreated } from "@/server/http/responses";
import { createPreorderReservationSchema, PreorderService } from "@/server/preorders/preorder-service";
import { parseJsonBody } from "@/server/validation/parse-json";

export async function POST(request: Request) {
  return withCors(request, await handleApi(async () => {
    const { customer, profile } = await requireUser(request);

    if (!customer) {
      throw forbidden("Cliente nao vinculado ao usuario");
    }

    const input = await parseJsonBody(request, createPreorderReservationSchema);
    const reservation = await new PreorderService(undefined, profile.id).createCustomerReservation(
      customer.id,
      input,
      profile.id,
    );

    return jsonCreated(reservation);
  }));
}

export function OPTIONS(request: Request) {
  return corsPreflightResponse(request);
}
