import { requireAdmin } from "@/server/auth/require-admin";
import { handleApi, jsonOk } from "@/server/http/responses";
import { quoteSuperFrete, superFreteQuoteSchema } from "@/server/shipping/superfrete-client";
import { parseJsonBody } from "@/server/validation/parse-json";

export async function POST(request: Request) {
  return handleApi(async () => {
    await requireAdmin();
    const input = await parseJsonBody(request, superFreteQuoteSchema);
    const result = await quoteSuperFrete(input);

    return jsonOk(result);
  });
}
