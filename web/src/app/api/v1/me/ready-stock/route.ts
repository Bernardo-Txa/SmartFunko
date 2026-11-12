import { requireUser } from "@/server/auth/require-user";
import { handleApi, jsonCreated } from "@/server/http/responses";
import { createReadyStockCheckoutSchema, ReadyStockService } from "@/server/ready-stock/ready-stock-service";
import { parseJsonBody } from "@/server/validation/parse-json";

export async function POST(request: Request) {
  return handleApi(async () => {
    const { customer, profile } = await requireUser(request);
    if (!customer) throw new Error("Cliente nao vinculado ao usuario");
    const input = await parseJsonBody(request, createReadyStockCheckoutSchema);
    return jsonCreated(await new ReadyStockService(undefined, profile.id).createCheckout(customer.id, input));
  });
}
