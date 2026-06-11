import net from "node:net";
import { corsPreflightResponse, withCors } from "@/server/http/cors";

const cacheControl = "public, max-age=86400, s-maxage=604800, stale-while-revalidate=604800";
const maxImageBytes = 10 * 1024 * 1024;
const allowedContentTypes = new Set([
  "image/gif",
  "image/jpeg",
  "image/png",
  "image/webp",
]);
const blockedHostnames = new Set([
  "localhost",
  "metadata.google.internal",
]);
const allowedExactHostnames = new Set([
  "cdn.awsli.com.br",
  "smart-funko.vercel.app",
]);

type ParseImageUrlResult =
  | {
      imageUrl: URL;
    }
  | {
      error: string;
      status?: number;
    };

function jsonError(request: Request, message: string, status = 400) {
  return withCors(
    request,
    Response.json(
      {
        error: message,
      },
      {
        headers: {
          "X-Content-Type-Options": "nosniff",
        },
        status,
      },
    ),
  );
}

function isPrivateIpv4(hostname: string) {
  const parts = hostname.split(".").map((part) => Number(part));

  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) {
    return false;
  }

  const [first, second] = parts;

  return (
    first === 0 ||
    first === 10 ||
    first === 127 ||
    first === 169 && second === 254 ||
    first === 172 && second >= 16 && second <= 31 ||
    first === 192 && second === 168
  );
}

function isBlockedHostname(hostname: string) {
  const normalized = hostname.toLowerCase().replace(/^\[(.*)]$/, "$1");

  if (blockedHostnames.has(normalized)) {
    return true;
  }

  if (normalized === "0.0.0.0" || normalized === "127.0.0.1" || normalized === "::1") {
    return true;
  }

  if (normalized === "169.254.169.254" || isPrivateIpv4(normalized)) {
    return true;
  }

  return net.isIP(normalized) !== 0 && !allowedExactHostnames.has(normalized);
}

function isAllowedImageHostname(hostname: string) {
  const normalized = hostname.toLowerCase();

  return allowedExactHostnames.has(normalized) || normalized.endsWith(".supabase.co");
}

function parseImageUrl(request: Request): ParseImageUrlResult {
  const rawUrl = new URL(request.url).searchParams.get("url");

  if (!rawUrl?.trim()) {
    return { error: "URL obrigatoria" };
  }

  let imageUrl: URL;

  try {
    imageUrl = new URL(rawUrl);
  } catch {
    return { error: "URL invalida" };
  }

  if (!["http:", "https:"].includes(imageUrl.protocol)) {
    return { error: "Protocolo nao permitido" };
  }

  if (isBlockedHostname(imageUrl.hostname)) {
    return { error: "Host bloqueado", status: 403 };
  }

  if (!isAllowedImageHostname(imageUrl.hostname)) {
    return { error: "Host de imagem nao permitido", status: 403 };
  }

  return { imageUrl };
}

export async function GET(request: Request) {
  const parsed = parseImageUrl(request);

  if ("error" in parsed) {
    return jsonError(request, parsed.error, parsed.status ?? 400);
  }

  try {
    const upstream = await fetch(parsed.imageUrl, {
      headers: {
        Accept: Array.from(allowedContentTypes).join(","),
        "User-Agent": "SmartFunkosImageProxy/1.0",
      },
      redirect: "follow",
    });

    if (!upstream.ok) {
      return jsonError(request, "Imagem nao encontrada", 404);
    }

    const contentType = upstream.headers.get("Content-Type")?.split(";")[0]?.trim().toLowerCase();
    if (!contentType || !allowedContentTypes.has(contentType)) {
      return jsonError(request, "Tipo de imagem nao permitido", 415);
    }

    const contentLength = Number(upstream.headers.get("Content-Length") ?? 0);
    if (contentLength > maxImageBytes) {
      return jsonError(request, "Imagem excede o tamanho maximo", 413);
    }

    const body = await upstream.arrayBuffer();
    if (body.byteLength > maxImageBytes) {
      return jsonError(request, "Imagem excede o tamanho maximo", 413);
    }

    return withCors(
      request,
      new Response(body, {
        headers: {
          "Cache-Control": cacheControl,
          "Content-Type": contentType,
          "X-Content-Type-Options": "nosniff",
        },
      }),
    );
  } catch {
    return jsonError(request, "Falha ao carregar imagem", 404);
  }
}

export function OPTIONS(request: Request) {
  return corsPreflightResponse(request);
}
