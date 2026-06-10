import { forbidden } from "@/server/http/errors";
import { requireUser } from "@/server/auth/require-user";
import { handleApi, jsonCreated, jsonOk } from "@/server/http/responses";
import {
  AssistedCheckoutService,
  createCustomerOrderRequestSchema,
} from "@/server/checkout/assisted-checkout-service";
import { OrderService } from "@/server/orders/order-service";
import { parseJsonBody } from "@/server/validation/parse-json";

export async function GET() {
  return handleApi(async () => {
    const { customer } = await requireUser();

    if (!customer) {
      throw forbidden("Cliente nao vinculado ao usuario");
    }

    const orders = await new OrderService().getCustomerOrdersForApi(customer.id);
    return jsonOk(orders);
  });
}

export async function POST(request: Request) {
  return handleApi(async () => {
    const { customer, profile } = await requireUser();

    if (!customer) {
      throw forbidden("Cliente nao vinculado ao usuario");
    }

    const input = await parseJsonBody(request, createCustomerOrderRequestSchema);
    const order = await new AssistedCheckoutService().createCustomerOrderRequest(
      customer.id,
      input,
      profile.id,
    );

    return jsonCreated(order);
  });
}
