import "server-only";
import { env } from "@/lib/env";

function firstHeaderValue(value: string | null) {
  return value?.split(",")[0]?.trim() || null;
}

function sanitizeProtocol(value: string | null) {
  const protocol = firstHeaderValue(value)?.replace(/:$/, "").toLowerCase();

  return protocol === "http" || protocol === "https" ? protocol : null;
}

function sanitizeHost(value: string | null) {
  const host = firstHeaderValue(value);

  if (!host || host.includes("/") || host.includes("\\") || host.includes("@")) {
    return null;
  }

  return host;
}

export function getRequestOriginFromHeaders(headers: Headers) {
  const host = sanitizeHost(headers.get("x-forwarded-host")) ?? sanitizeHost(headers.get("host"));
  const fallbackProtocol = env.siteUrl.startsWith("http://") ? "http" : "https";
  const protocol = sanitizeProtocol(headers.get("x-forwarded-proto")) ?? fallbackProtocol;

  return host ? `${protocol}://${host}` : env.siteUrl;
}

export function getRequestOrigin(request: Request) {
  try {
    return new URL(request.url).origin;
  } catch {
    return getRequestOriginFromHeaders(request.headers);
  }
}
