import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { badRequest, internalError } from "@/server/http/errors";
import { env, hasInfinitePayCheckoutEnv } from "@/lib/env";

export type InfinitePayCheckoutItem = {
  name: string;
  quantity: number;
  unitAmountCents: number;
};

export type CreateInfinitePayCheckoutInput = {
  orderNumber: string;
  customerName: string;
  customerEmail?: string | null;
  customerPhone?: string | null;
  amountCents: number;
  items: InfinitePayCheckoutItem[];
  redirectUrl: string;
  webhookUrl: string;
};

export type CreateInfinitePayCheckoutResult = {
  checkoutUrl: string;
  providerReference: string;
  raw: unknown;
};

export type NormalizedInfinitePayWebhook = {
  amountCents: number | null;
  captureMethod: string | null;
  eventId: string;
  eventType: string;
  invoiceSlug: string | null;
  orderNumber: string | null;
  paidAmountCents: number | null;
  providerReference: string | null;
  receiptUrl: string | null;
  status: "paid" | "failed" | "expired" | "cancelled" | "unknown";
  transactionNsu: string | null;
};

type InfinitePayLinkResponse = {
  checkout_url?: string;
  invoice_slug?: string;
  link?: string;
  url?: string;
};

type InfinitePayWebhookPayload = {
  amount?: number | string;
  capture_method?: string;
  event_id?: string;
  event_type?: string;
  invoice_slug?: string;
  order_nsu?: string;
  paid_amount?: number | string;
  receipt_url?: string;
  slug?: string;
  status?: string;
  transaction_nsu?: string;
  type?: string;
};

function toCents(value: number | string | undefined) {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.round(parsed) : null;
}

function normalizeStatus(payload: InfinitePayWebhookPayload): NormalizedInfinitePayWebhook["status"] {
  const raw = String(payload.status ?? payload.event_type ?? payload.type ?? "paid").toLowerCase();

  if (["paid", "approved", "confirmed", "success", "succeeded"].includes(raw)) {
    return "paid";
  }

  if (["failed", "declined", "denied", "refused"].includes(raw)) {
    return "failed";
  }

  if (raw === "expired") {
    return "expired";
  }

  if (["cancelled", "canceled"].includes(raw)) {
    return "cancelled";
  }

  if (payload.transaction_nsu || payload.receipt_url) {
    return "paid";
  }

  return "unknown";
}

function getSignature(headers: Headers) {
  return (
    headers.get("x-infinitepay-signature") ??
    headers.get("x-signature") ??
    headers.get("x-hub-signature-256") ??
    ""
  ).replace(/^sha256=/, "");
}

export async function createInfinitePayCheckout(
  input: CreateInfinitePayCheckoutInput,
): Promise<CreateInfinitePayCheckoutResult> {
  if (!hasInfinitePayCheckoutEnv()) {
    throw internalError("Configure INFINITEPAY_HANDLE antes de gerar link de pagamento");
  }

  const payload = {
    customer: {
      email: input.customerEmail ?? undefined,
      name: input.customerName,
      phone_number: input.customerPhone ?? undefined,
    },
    handle: env.infinitePayHandle,
    items: input.items.map((item) => ({
      description: item.name,
      price: item.unitAmountCents,
      quantity: item.quantity,
    })),
    order_nsu: input.orderNumber,
    redirect_url: input.redirectUrl,
    webhook_url: input.webhookUrl,
  };

  const headers: Record<string, string> = {
    "content-type": "application/json",
  };

  if (env.infinitePayApiKey) {
    headers.authorization = `Bearer ${env.infinitePayApiKey}`;
  }

  const response = await fetch(`${env.infinitePayApiBaseUrl.replace(/\/$/, "")}/links`, {
    body: JSON.stringify(payload),
    headers,
    method: "POST",
  });

  let raw: InfinitePayLinkResponse | null = null;

  try {
    raw = (await response.json()) as InfinitePayLinkResponse;
  } catch {
    raw = null;
  }

  if (!response.ok) {
    throw internalError("InfinitePay nao gerou o link. Verifique as credenciais e tente novamente.");
  }

  const checkoutUrl = raw?.url ?? raw?.checkout_url ?? raw?.link;

  if (!checkoutUrl) {
    throw internalError("Resposta da InfinitePay sem URL de checkout");
  }

  return {
    checkoutUrl,
    providerReference: raw?.invoice_slug ?? input.orderNumber,
    raw,
  };
}

export function verifyInfinitePayWebhook(rawBody: string, headers: Headers) {
  if (!env.infinitePayWebhookSecret) {
    return true;
  }

  const signature = getSignature(headers);

  if (!signature) {
    return false;
  }

  const expected = createHmac("sha256", env.infinitePayWebhookSecret)
    .update(rawBody)
    .digest("hex");

  const receivedBuffer = Buffer.from(signature, "hex");
  const expectedBuffer = Buffer.from(expected, "hex");

  return (
    receivedBuffer.length === expectedBuffer.length &&
    timingSafeEqual(receivedBuffer, expectedBuffer)
  );
}

export function normalizeInfinitePayWebhook(payload: unknown): NormalizedInfinitePayWebhook {
  if (!payload || typeof payload !== "object") {
    throw badRequest("Webhook InfinitePay invalido");
  }

  const data = payload as InfinitePayWebhookPayload;
  const orderNumber = data.order_nsu ?? null;
  const transactionNsu = data.transaction_nsu ?? null;
  const invoiceSlug = data.invoice_slug ?? data.slug ?? null;
  const status = normalizeStatus(data);
  const providerReference = orderNumber ?? invoiceSlug ?? transactionNsu;

  return {
    amountCents: toCents(data.amount),
    captureMethod: data.capture_method ?? null,
    eventId:
      data.event_id ??
      [orderNumber, transactionNsu, invoiceSlug, status, data.amount].filter(Boolean).join(":"),
    eventType: data.event_type ?? data.type ?? status,
    invoiceSlug,
    orderNumber,
    paidAmountCents: toCents(data.paid_amount),
    providerReference,
    receiptUrl: data.receipt_url ?? null,
    status,
    transactionNsu,
  };
}
