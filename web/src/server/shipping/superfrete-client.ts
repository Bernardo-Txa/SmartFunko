import "server-only";
import { z } from "zod";
import { env, hasSuperFreteEnv } from "@/lib/env";
import { badRequest, internalError } from "@/server/http/errors";

const numberFromPayload = z.coerce.number();

export const superFreteQuoteSchema = z.object({
  fromPostalCode: z.string().trim().min(1),
  height: numberFromPayload.positive(),
  insuranceValue: numberFromPayload.nonnegative().default(0),
  length: numberFromPayload.positive(),
  quantity: z.coerce.number().int().positive().default(1),
  receipt: z.boolean().optional().default(false),
  services: z.string().trim().optional(),
  toPostalCode: z.string().trim().min(1),
  useInsuranceValue: z.boolean().optional().default(false),
  weight: numberFromPayload.positive(),
  width: numberFromPayload.positive(),
});

export type SuperFreteQuoteInput = z.infer<typeof superFreteQuoteSchema>;

export type SuperFreteQuoteOption = {
  carrierName: string;
  deliveryTime: number | null;
  error: string | null;
  id: string;
  price: number | null;
  serviceName: string;
};

function onlyDigits(value: string) {
  return value.replace(/\D/g, "");
}

function normalizePostalCode(value: string, label: string) {
  const digits = onlyDigits(value);

  if (digits.length !== 8) {
    throw badRequest(`${label} deve ter 8 digitos`);
  }

  return digits;
}

function parseMoney(value: unknown) {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }

  if (typeof value !== "string") {
    return null;
  }

  const normalized = value
    .replace(/[^\d,.-]/g, "")
    .replace(/\.(?=\d{3}(?:\D|$))/g, "")
    .replace(",", ".");
  const parsed = Number(normalized);

  return Number.isFinite(parsed) ? parsed : null;
}

function parseInteger(value: unknown) {
  const parsed = Number(value);

  return Number.isFinite(parsed) ? Math.round(parsed) : null;
}

function readString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function readRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function normalizeQuote(item: unknown, index: number): SuperFreteQuoteOption {
  const row = readRecord(item);
  const company = readRecord(row.company);
  const carrier = readRecord(row.carrier);
  const deliveryRange = readRecord(row.delivery_range);
  const serviceName = readString(row.name)
    ?? readString(row.service)
    ?? readString(row.title)
    ?? `Servico ${index + 1}`;
  const carrierName = readString(company.name)
    ?? readString(carrier.name)
    ?? readString(row.company)
    ?? readString(row.carrier)
    ?? "SuperFrete";
  const price = parseMoney(row.custom_price)
    ?? parseMoney(row.price)
    ?? parseMoney(row.final_price)
    ?? parseMoney(row.value)
    ?? parseMoney(row.amount);
  const deliveryTime = parseInteger(row.delivery_time)
    ?? parseInteger(row.deadline)
    ?? parseInteger(row.prazo)
    ?? parseInteger(deliveryRange.max)
    ?? parseInteger(deliveryRange.min);
  const error = readString(row.error)
    ?? readString(row.message)
    ?? readString(row.warning);

  return {
    carrierName,
    deliveryTime,
    error,
    id: String(row.id ?? row.service_id ?? `${carrierName}-${serviceName}-${index}`),
    price,
    serviceName,
  };
}

function normalizePayload(payload: unknown) {
  if (Array.isArray(payload)) {
    return payload;
  }

  const body = readRecord(payload);

  if (Array.isArray(body.data)) {
    return body.data;
  }

  if (Array.isArray(body.quotes)) {
    return body.quotes;
  }

  if (Array.isArray(body.services)) {
    return body.services;
  }

  if (Object.keys(body).length > 0) {
    return [body];
  }

  return [];
}

function getSuperFreteError(payload: unknown, fallback: string) {
  const body = readRecord(payload);

  return readString(body.message) ?? readString(body.error) ?? fallback;
}

export async function quoteSuperFrete(input: SuperFreteQuoteInput) {
  if (!hasSuperFreteEnv()) {
    throw internalError("SUPERFRETE_API_TOKEN nao configurado");
  }

  const baseUrl = env.superFreteApiBaseUrl.replace(/\/$/, "");
  const payload = {
    from: {
      postal_code: normalizePostalCode(input.fromPostalCode, "CEP de origem"),
    },
    options: {
      insurance_value: input.insuranceValue,
      own_hand: false,
      receipt: input.receipt,
      use_insurance_value: input.useInsuranceValue,
    },
    package: {
      height: input.height,
      length: input.length,
      weight: input.weight,
      width: input.width,
    },
    services: input.services?.trim() || env.superFreteDefaultServices,
    to: {
      postal_code: normalizePostalCode(input.toPostalCode, "CEP de destino"),
    },
  };
  const response = await fetch(`${baseUrl}/api/v0/calculator`, {
    body: JSON.stringify(payload),
    cache: "no-store",
    headers: {
      accept: "application/json",
      authorization: `Bearer ${env.superFreteApiToken}`,
      "content-type": "application/json",
      "user-agent": env.superFreteUserAgent,
    },
    method: "POST",
  });
  const rawText = await response.text();
  let responsePayload: unknown = null;

  try {
    responsePayload = rawText ? JSON.parse(rawText) : null;
  } catch {
    responsePayload = { message: rawText };
  }

  if (!response.ok) {
    throw badRequest(getSuperFreteError(responsePayload, "Nao foi possivel calcular o frete na SuperFrete"));
  }

  const quotes = normalizePayload(responsePayload).map(normalizeQuote);

  return {
    quotes,
  };
}
