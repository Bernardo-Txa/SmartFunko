import { AssistedCheckoutService } from "@/server/checkout/assisted-checkout-service";
import { env } from "@/lib/env";
import { badRequest, forbidden } from "@/server/http/errors";
import { handleApi, jsonOk } from "@/server/http/responses";
import { verifyInfinitePayWebhook } from "@/server/payments/infinitepay-client";
import { RaffleService } from "@/server/raffles/raffle-service";

export async function POST(request: Request) {
  return handleApi(async () => {
    if (env.infinitePayWebhookEnabled === "false") {
      return jsonOk({ status: "ignored", reason: "Webhook InfinitePay desabilitado" });
    }

    const rawBody = await request.text();

    if (!verifyInfinitePayWebhook(rawBody, request.headers)) {
      throw forbidden("Assinatura InfinitePay invalida");
    }

    let payload: unknown;

    try {
      payload = JSON.parse(rawBody);
    } catch {
      throw badRequest("Webhook InfinitePay com JSON invalido");
    }

    const orderNsu =
      payload && typeof payload === "object" && "order_nsu" in payload
        ? String((payload as { order_nsu?: unknown }).order_nsu ?? "")
        : "";
    const result = orderNsu.startsWith("RAFFLE-")
      ? await new RaffleService().handleInfinitePayWebhook(payload)
      : await new AssistedCheckoutService().handleInfinitePayWebhook(payload);
    return jsonOk(result);
  });
}
