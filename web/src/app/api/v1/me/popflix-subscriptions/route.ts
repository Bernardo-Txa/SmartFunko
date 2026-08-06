import { forbidden } from "@/server/http/errors";
import { requireUser } from "@/server/auth/require-user";
import { corsPreflightResponse, withCors } from "@/server/http/cors";
import { handleApi, jsonCreated, jsonOk } from "@/server/http/responses";
import {
  PopFlixSubscriptionService,
  createPopFlixSubscriptionSchema,
} from "@/server/popflix/popflix-subscription-service";
import { parseJsonBody } from "@/server/validation/parse-json";

export async function GET(request: Request) {
  return withCors(request, await handleApi(async () => {
    const { customer } = await requireUser(request);

    if (!customer) {
      throw forbidden("Cliente nao vinculado ao usuario");
    }

    const subscriptions = await new PopFlixSubscriptionService().listCustomerSubscriptions(
      customer.id,
    );

    return jsonOk(subscriptions);
  }));
}

export async function POST(request: Request) {
  return withCors(request, await handleApi(async () => {
    const { customer } = await requireUser(request);

    if (!customer) {
      throw forbidden("Cliente nao vinculado ao usuario");
    }

    const input = await parseJsonBody(request, createPopFlixSubscriptionSchema);
    const subscription = await new PopFlixSubscriptionService().createCustomerSubscription(
      customer.id,
      input,
    );

    return jsonCreated(subscription);
  }));
}

export function OPTIONS(request: Request) {
  return corsPreflightResponse(request);
}
