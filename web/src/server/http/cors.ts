import { env } from "@/lib/env";

const allowedMethods = "GET,POST,PATCH,PUT,DELETE,OPTIONS";
const allowedHeaders = "Content-Type, Authorization, X-Requested-With";
const maxAge = "86400";
const productionOrigin = "https://smartfunko.com.br";

function normalizeOrigin(value: string | undefined) {
  if (!value) {
    return undefined;
  }

  try {
    return new URL(value).origin;
  } catch {
    return undefined;
  }
}

function getConfiguredOrigins() {
  return new Set(
    [
      productionOrigin,
      normalizeOrigin(env.siteUrl),
      ...String(process.env.CORS_ALLOWED_ORIGINS ?? "")
        .split(",")
        .map((origin) => normalizeOrigin(origin.trim())),
    ].filter((origin): origin is string => Boolean(origin)),
  );
}

function isLocalDevelopmentOrigin(origin: string) {
  try {
    const url = new URL(origin);
    return (
      url.protocol === "http:" &&
      (url.hostname === "localhost" || url.hostname === "127.0.0.1")
    );
  } catch {
    return false;
  }
}

function isAllowedOrigin(origin: string) {
  return isLocalDevelopmentOrigin(origin) || getConfiguredOrigins().has(origin);
}

function appendVaryOrigin(headers: Headers) {
  const current = headers.get("Vary");

  if (!current) {
    headers.set("Vary", "Origin");
    return;
  }

  const values = current.split(",").map((value) => value.trim().toLowerCase());
  if (!values.includes("origin")) {
    headers.set("Vary", `${current}, Origin`);
  }
}

export function getCorsHeaders(request: Request): HeadersInit {
  const headers = new Headers();
  const origin = request.headers.get("Origin");

  appendVaryOrigin(headers);

  if (!origin || !isAllowedOrigin(origin)) {
    return headers;
  }

  headers.set("Access-Control-Allow-Origin", origin);
  headers.set("Access-Control-Allow-Methods", allowedMethods);
  headers.set("Access-Control-Allow-Headers", allowedHeaders);
  headers.set("Access-Control-Max-Age", maxAge);

  return headers;
}

export function corsPreflightResponse(request: Request): Response {
  const headers = new Headers(getCorsHeaders(request));
  const origin = request.headers.get("Origin");
  const status = origin && !headers.has("Access-Control-Allow-Origin") ? 403 : 204;

  return new Response(null, {
    headers,
    status,
  });
}

export function withCors(request: Request, response: Response): Response {
  const headers = new Headers(response.headers);
  const corsHeaders = new Headers(getCorsHeaders(request));

  for (const [key, value] of corsHeaders.entries()) {
    if (key.toLowerCase() === "vary") {
      appendVaryOrigin(headers);
    } else {
      headers.set(key, value);
    }
  }

  return new Response(response.body, {
    headers,
    status: response.status,
    statusText: response.statusText,
  });
}
