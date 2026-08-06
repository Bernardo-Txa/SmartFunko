import { AssistedCheckoutService } from "@/server/checkout/assisted-checkout-service";
import { env } from "@/lib/env";
import { badRequest, forbidden } from "@/server/http/errors";
import { handleApi, jsonOk } from "@/server/http/responses";
import { OrderV2Service } from "@/server/orders-v2/order-v2-service";
import { verifyInfinitePayWebhook } from "@/server/payments/infinitepay-client";
import { PopFlixSubscriptionService } from "@/server/popflix/popflix-subscription-service";
import { PreorderService } from "@/server/preorders/preorder-service";
import { RaffleService } from "@/server/raffles/raffle-service";

function isRaffleOrderNsu(orderNsu: string) {
  return orderNsu.toUpperCase().startsWith("RAFFLE-") || orderNsu.toUpperCase().startsWith("RF-");
}

function isPopFlixOrderNsu(orderNsu: string) {
  return orderNsu.toUpperCase().startsWith("PF-") || orderNsu.toUpperCase().startsWith("POPFLIX-");
}

function isOrderV2Nsu(orderNsu: string) {
  return orderNsu.toUpperCase().startsWith("SFV2PAY-");
}

function isPreorderNsu(orderNsu: string) {
  return orderNsu.toUpperCase().startsWith("PVPAY-");
}

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
    const result = isOrderV2Nsu(orderNsu)
      ? await new OrderV2Service().handleInfinitePayWebhook(payload)
      : isPreorderNsu(orderNsu)
        ? await new PreorderService().handleInfinitePayWebhook(payload)
      : isPopFlixOrderNsu(orderNsu)
      ? await new PopFlixSubscriptionService().handleInfinitePayWebhook(payload)
      : isRaffleOrderNsu(orderNsu)
        ? await new RaffleService().handleInfinitePayWebhook(payload)
        : await new AssistedCheckoutService().handleInfinitePayWebhook(payload);
    return jsonOk(result);
  });
}
