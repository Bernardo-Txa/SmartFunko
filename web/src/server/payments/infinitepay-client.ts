import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { badRequest, internalError } from "@/server/http/errors";
import { env, hasInfinitePayCheckoutEnv } from "@/lib/env";
import type { PaymentFeeMode } from "@/server/payments/payment-rules";

export type InfinitePayCheckoutItem = {
  name: string;
  quantity: number;
  unitAmountCents: number;
};

export type InfinitePayCheckoutKind = "order" | "raffle";

export type CreateInfinitePayCheckoutInput = {
  orderNumber: string;
  customerName: string;
  customerEmail?: string | null;
  customerPhone?: string | null;
  amountCents: number;
  feeMode?: PaymentFeeMode;
  items: InfinitePayCheckoutItem[];
  kind?: InfinitePayCheckoutKind;
  maxInstallments?: number;
  redirectUrl: string;
  webhookUrl: string;
};

export type CreateInfinitePayCheckoutResult = {
  checkoutUrl: string;
  providerReference: string;
  requestPayload: Record<string, unknown>;
  raw: unknown;
};

export type CheckInfinitePayPaymentInput = {
  orderNumber: string;
  slug?: string | null;
  transactionNsu?: string | null;
};

export type NormalizedInfinitePayWebhook = {
  amountCents: number | null;
  captureMethod: string | null;
  eventId: string;
  eventType: string;
  invoiceSlug: string | null;
  installments: number | null;
  orderNumber: string | null;
  paidAmountCents: number | null;
  providerFeeAmountCents: number | null;
  providerReference: string | null;
  receiptUrl: string | null;
  status: "paid" | "failed" | "expired" | "cancelled" | "unknown";
  transactionNsu: string | null;
};

type InfinitePayLinkResponse = {
  checkout_url?: string;
  data?: {
    checkout_url?: string;
    invoice_slug?: string;
    link?: string;
    payment_url?: string;
    url?: string;
  };
  invoice_slug?: string;
  link?: string;
  payment_url?: string;
  slug?: string;
  url?: string;
};

type InfinitePayWebhookPayload = {
  amount?: number | string;
  capture_method?: string;
  event_id?: string;
  event_type?: string;
  fee_amount?: number | string;
  invoice_slug?: string;
  installments?: number | string;
  order_nsu?: string;
  paid_amount?: number | string;
  provider_fee_amount?: number | string;
  receipt_url?: string;
  slug?: string;
  status?: string;
  transaction_nsu?: string;
  type?: string;
};

type InfinitePayPaymentCheckResponse = {
  amount?: number | string;
  capture_method?: string;
  installments?: number;
  paid?: boolean;
  paid_amount?: number | string;
  success?: boolean;
};

function infinitePayHandle() {
  return env.infinitePayHandle.trim().replace(/^[@$]+/, "");
}

function toCents(value: number | string | undefined) {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.round(parsed) : null;
}

function toInt(value: number | string | undefined) {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  const parsed = Number(value);
  return Number.isInteger(parsed) ? parsed : null;
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function firstNonEmptyString(...values: unknown[]) {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }

  return null;
}

function responseKeys(value: unknown) {
  if (!isRecord(value)) {
    return "none";
  }

  const keys = Object.keys(value);
  const dataKeys = isRecord(value.data) ? Object.keys(value.data).map((key) => `data.${key}`) : [];
  return [...keys, ...dataKeys].sort().join(",") || "none";
}

function normalizeCheckoutItems(items: InfinitePayCheckoutItem[]) {
  return items.map((item, index) => {
    const description = item.name.trim();
    const quantity = Number(item.quantity);
    const unitAmountCents = Number(item.unitAmountCents);

    if (!description) {
      throw internalError(`Item InfinitePay ${index + 1} sem descricao`);
    }

    if (!Number.isInteger(quantity) || quantity <= 0) {
      throw internalError(`Item InfinitePay ${index + 1} com quantidade invalida`);
    }

    if (!Number.isInteger(unitAmountCents) || unitAmountCents <= 0) {
      throw internalError(`Item InfinitePay ${index + 1} com preco invalido`);
    }

    return {
      description,
      price: unitAmountCents,
      quantity,
    };
  });
}

function assertCreateCheckoutInput(input: CreateInfinitePayCheckoutInput) {
  if (!input.orderNumber.trim()) {
    throw internalError("Payload InfinitePay sem order_nsu");
  }

  if (!Number.isInteger(input.amountCents) || input.amountCents <= 0) {
    throw internalError("Payload InfinitePay com valor invalido");
  }

  try {
    new URL(input.redirectUrl);
    new URL(input.webhookUrl);
  } catch {
    throw internalError("Payload InfinitePay com URL invalida");
  }
}

export function parseInfinitePayLinkResponse(body: unknown) {
  if (!isRecord(body)) {
    return null;
  }

  const data = isRecord(body.data) ? body.data : {};
  return firstNonEmptyString(
    body.url,
    body.link,
    body.checkout_url,
    body.payment_url,
    data.url,
    data.link,
    data.checkout_url,
    data.payment_url,
  );
}

export async function createInfinitePayCheckout(
  input: CreateInfinitePayCheckoutInput,
): Promise<CreateInfinitePayCheckoutResult> {
  if (!hasInfinitePayCheckoutEnv()) {
    throw internalError("Configure INFINITEPAY_HANDLE antes de gerar link de pagamento");
  }

  assertCreateCheckoutInput(input);

  const items = normalizeCheckoutItems(input.items);
  const kind = input.kind ?? "order";
  const payload = {
    customer: {
      email: input.customerEmail ?? undefined,
      name: input.customerName,
      phone_number: input.customerPhone ?? undefined,
    },
    handle: infinitePayHandle(),
    items,
    order_nsu: input.orderNumber.trim(),
    redirect_url: input.redirectUrl,
    webhook_url: input.webhookUrl,
  };
  const unsupportedControls: Record<string, unknown> = {};

  if (input.maxInstallments) {
    unsupportedControls.maxInstallments = input.maxInstallments;
  }

  if (input.feeMode) {
    unsupportedControls.feeMode = input.feeMode;
  }

  if (Object.keys(unsupportedControls).length > 0) {
    unsupportedControls.note =
      "InfinitePay /links payload documented by the project does not expose max installments or fee mode fields.";
  }

  const headers: Record<string, string> = {
    "content-type": "application/json",
  };

  if (env.infinitePayApiKey) {
    headers.authorization = `Bearer ${env.infinitePayApiKey}`;
  }

  console.info(`[InfinitePay] create link kind=${kind} orderNsu=${payload.order_nsu} amount=${input.amountCents}`);
  console.info(`[InfinitePay] payload keys=${Object.keys(payload).sort().join(",")}`);

  const response = await fetch(`${env.infinitePayApiBaseUrl.replace(/\/$/, "")}/links`, {
    body: JSON.stringify(payload),
    headers,
    method: "POST",
  });

  let raw: unknown = null;

  try {
    raw = await response.json();
  } catch {
    raw = null;
  }

  const checkoutUrl = parseInfinitePayLinkResponse(raw);
  const rawResponse = raw as InfinitePayLinkResponse | null;
  const providerReference =
    firstNonEmptyString(rawResponse?.invoice_slug, rawResponse?.data?.invoice_slug, rawResponse?.slug) ??
    payload.order_nsu;
  const keys = responseKeys(raw);

  console.info(`[InfinitePay] response status=${response.status}`);
  console.info(`[InfinitePay] response keys=${keys}`);
  console.info(`[InfinitePay] parsed url present=${Boolean(checkoutUrl)}`);

  if (!response.ok) {
    console.error(`[InfinitePay] create link failed kind=${kind} orderNsu=${payload.order_nsu} status=${response.status} responseKeys=${keys}`);
    throw internalError("InfinitePay nao gerou o link. Verifique as credenciais e tente novamente.");
  }

  if (!checkoutUrl) {
    console.error(`[InfinitePay] missing checkout url kind=${kind} orderNsu=${payload.order_nsu} status=${response.status} responseKeys=${keys}`);
    throw internalError("InfinitePay respondeu, mas nao retornou link de pagamento.");
  }

  return {
    checkoutUrl,
    providerReference,
    requestPayload: {
      ...payload,
      unsupportedControls: Object.keys(unsupportedControls).length > 0 ? unsupportedControls : undefined,
    },
    raw,
  };
}

export async function checkInfinitePayPaymentStatus(input: CheckInfinitePayPaymentInput) {
  if (!hasInfinitePayCheckoutEnv()) {
    throw internalError("Configure INFINITEPAY_HANDLE antes de consultar pagamento");
  }

  const payload = {
    handle: infinitePayHandle(),
    order_nsu: input.orderNumber,
    slug: input.slug ?? undefined,
    transaction_nsu: input.transactionNsu ?? undefined,
  };
  const headers: Record<string, string> = {
    "content-type": "application/json",
  };

  if (env.infinitePayApiKey) {
    headers.authorization = `Bearer ${env.infinitePayApiKey}`;
  }

  const response = await fetch(`${env.infinitePayApiBaseUrl.replace(/\/$/, "")}/payment_check`, {
    body: JSON.stringify(payload),
    headers,
    method: "POST",
  });

  let raw: InfinitePayPaymentCheckResponse | null = null;

  try {
    raw = (await response.json()) as InfinitePayPaymentCheckResponse;
  } catch {
    raw = null;
  }

  if (!response.ok || !raw?.success) {
    throw internalError("InfinitePay nao retornou status do pagamento. Tente novamente em instantes.");
  }

  return {
    normalized: normalizeInfinitePayWebhook({
      amount: raw.amount,
      capture_method: raw.capture_method,
      event_id: `payment_check:${input.orderNumber}:${input.slug ?? input.transactionNsu ?? "status"}:${Date.now()}`,
      event_type: raw.paid ? "paid" : "payment_check",
      invoice_slug: input.slug ?? undefined,
      installments: raw.installments,
      order_nsu: input.orderNumber,
      paid_amount: raw.paid_amount,
      status: raw.paid ? "paid" : "pending",
      transaction_nsu: input.transactionNsu ?? undefined,
    }),
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
    installments: toInt(data.installments),
    orderNumber,
    paidAmountCents: toCents(data.paid_amount),
    providerFeeAmountCents: toCents(data.provider_fee_amount ?? data.fee_amount),
    providerReference,
    receiptUrl: data.receipt_url ?? null,
    status,
    transactionNsu,
  };
}
