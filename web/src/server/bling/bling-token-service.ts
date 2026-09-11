import "server-only";
import { Buffer } from "node:buffer";
import { env, hasBlingOAuthRefreshEnv, hasSupabaseAdminEnv } from "@/lib/env";
import { internalError } from "@/server/http/errors";
import { createSupabaseAdminClient } from "@/server/supabase/admin-client";

type BlingTokenRow = {
  access_token: string;
  expires_at: string | null;
  refresh_token: string | null;
};

type BlingTokenStatusRow = BlingTokenRow & {
  last_error: string | null;
  last_refreshed_at: string | null;
  scope: string | null;
  updated_at: string;
};

type BlingTokenResponse = {
  access_token?: string;
  expires_in?: number | string;
  refresh_token?: string;
  scope?: string;
  token_type?: string;
};

type AccessTokenOptions = {
  forceRefresh?: boolean;
};

const TOKEN_REFRESH_SKEW_MS = 90_000;
const BLING_OAUTH_CALLBACK_PATH = "/api/v1/admin/bling/oauth/callback";

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function oauthUrl(path: string) {
  const baseUrl = env.blingOAuthBaseUrl.replace(/\/$/, "");
  return `${baseUrl}${path.startsWith("/") ? path : `/${path}`}`;
}

function basicAuthHeader() {
  return `Basic ${Buffer.from(`${env.blingClientId}:${env.blingClientSecret}`).toString("base64")}`;
}

export function getBlingOAuthRedirectUri(origin = env.siteUrl) {
  return `${origin.replace(/\/$/, "")}${BLING_OAUTH_CALLBACK_PATH}`;
}

export function createBlingAuthorizationUrl(state: string, redirectUri = getBlingOAuthRedirectUri()) {
  if (!env.blingClientId) {
    throw internalError("Configure BLING_CLIENT_ID antes de conectar o Bling");
  }

  const url = new URL(oauthUrl("/oauth/authorize"));
  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", env.blingClientId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("state", state);

  return url.toString();
}

function isTokenUsable(row: BlingTokenRow | null) {
  if (!row?.access_token) {
    return false;
  }

  if (!row.expires_at) {
    return true;
  }

  const expiresAt = new Date(row.expires_at).getTime();
  return Number.isFinite(expiresAt) && expiresAt - Date.now() > TOKEN_REFRESH_SKEW_MS;
}

function expiresAtFromResponse(expiresIn: BlingTokenResponse["expires_in"]) {
  const seconds = Number(expiresIn);

  if (!Number.isFinite(seconds) || seconds <= 0) {
    return null;
  }

  return new Date(Date.now() + Math.round(seconds) * 1000).toISOString();
}

function errorMessageFromTokenResponse(body: unknown) {
  if (!isRecord(body)) {
    return "Bling nao retornou detalhes ao renovar token";
  }

  const error = isRecord(body.error) ? body.error : body;
  const message = [error.message, error.description, body.error_description, body.message]
    .filter((value): value is string => typeof value === "string" && value.trim().length > 0)
    .join(" - ");

  return message || "Bling nao retornou detalhes ao renovar token";
}

async function parseBody(response: Response) {
  const text = await response.text();

  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

async function getStoredToken() {
  if (!hasSupabaseAdminEnv()) {
    return null;
  }

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("integration_oauth_tokens")
    .select("access_token,refresh_token,expires_at")
    .eq("provider", "bling")
    .maybeSingle();

  if (error) {
    console.warn("[Bling] Nao foi possivel ler token OAuth salvo", {
      code: error.code,
      message: error.message,
    });
    return null;
  }

  return (data as BlingTokenRow | null) ?? null;
}

async function saveToken(response: BlingTokenResponse, fallbackRefreshToken: string | null) {
  if (!response.access_token) {
    throw internalError("Bling retornou autorizacao sem access_token");
  }

  const refreshToken = response.refresh_token ?? fallbackRefreshToken;

  if (!hasSupabaseAdminEnv()) {
    return {
      accessToken: response.access_token,
      refreshToken,
    };
  }

  const supabase = createSupabaseAdminClient();
  const { error } = await supabase
    .from("integration_oauth_tokens")
    .upsert({
      access_token: response.access_token,
      expires_at: expiresAtFromResponse(response.expires_in),
      last_error: null,
      last_refreshed_at: new Date().toISOString(),
      provider: "bling",
      refresh_token: refreshToken,
      scope: response.scope ?? null,
      token_type: response.token_type ?? null,
    }, { onConflict: "provider" });

  if (error) {
    console.warn("[Bling] Token renovado, mas nao foi possivel salvar no banco", {
      code: error.code,
      message: error.message,
    });
  }

  return {
    accessToken: response.access_token,
    refreshToken,
  };
}

async function markRefreshError(message: string) {
  if (!hasSupabaseAdminEnv()) {
    return;
  }

  const supabase = createSupabaseAdminClient();
  await supabase
    .from("integration_oauth_tokens")
    .update({ last_error: message })
    .eq("provider", "bling");
}

async function refreshBlingToken(refreshToken: string) {
  if (!hasBlingOAuthRefreshEnv()) {
    throw internalError("Configure BLING_CLIENT_ID e BLING_CLIENT_SECRET para renovar o token Bling automaticamente");
  }

  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: refreshToken,
  });
  const response = await fetch(oauthUrl("/oauth/token"), {
    body,
    headers: {
      accept: "application/json",
      authorization: basicAuthHeader(),
      "content-type": "application/x-www-form-urlencoded",
      "enable-jwt": "1",
    },
    method: "POST",
  });
  const responseBody = await parseBody(response);

  if (!response.ok) {
    const message = errorMessageFromTokenResponse(responseBody);
    await markRefreshError(message);
    throw internalError(`Bling nao renovou o access token: ${message}`);
  }

  return saveToken(responseBody as BlingTokenResponse, refreshToken);
}

export async function exchangeBlingAuthorizationCode(code: string) {
  return exchangeBlingAuthorizationCodeWithRedirectUri(code, getBlingOAuthRedirectUri());
}

export async function exchangeBlingAuthorizationCodeWithRedirectUri(code: string, redirectUri: string) {
  if (!hasBlingOAuthRefreshEnv()) {
    throw internalError("Configure BLING_CLIENT_ID e BLING_CLIENT_SECRET antes de conectar o Bling");
  }

  const body = new URLSearchParams({
    code,
    grant_type: "authorization_code",
    redirect_uri: redirectUri,
  });
  const response = await fetch(oauthUrl("/oauth/token"), {
    body,
    headers: {
      accept: "application/json",
      authorization: basicAuthHeader(),
      "content-type": "application/x-www-form-urlencoded",
      "enable-jwt": "1",
    },
    method: "POST",
  });
  const responseBody = await parseBody(response);

  if (!response.ok) {
    const message = errorMessageFromTokenResponse(responseBody);
    await markRefreshError(message);
    throw internalError(`Bling nao concluiu a autorizacao: ${message}`);
  }

  const tokenResponse = responseBody as BlingTokenResponse;
  await saveToken(tokenResponse, null);

  return {
    connected: true,
    expiresAt: expiresAtFromResponse(tokenResponse.expires_in),
  };
}

export async function getBlingIntegrationStatus(origin = env.siteUrl) {
  const configured = hasBlingOAuthRefreshEnv();
  const redirectUri = getBlingOAuthRedirectUri(origin);

  if (!hasSupabaseAdminEnv()) {
    return {
      accessTokenValid: false,
      configured,
      connected: false,
      expiresAt: null,
      lastError: null,
      lastRefreshedAt: null,
      redirectUri,
      scope: null,
    };
  }

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("integration_oauth_tokens")
    .select("access_token,refresh_token,expires_at,last_error,last_refreshed_at,scope,updated_at")
    .eq("provider", "bling")
    .maybeSingle();

  if (error) {
    console.warn("[Bling] Nao foi possivel ler status OAuth salvo", {
      code: error.code,
      message: error.message,
    });

    return {
      accessTokenValid: false,
      configured,
      connected: false,
      expiresAt: null,
      lastError: "Falha ao consultar token salvo",
      lastRefreshedAt: null,
      redirectUri,
      scope: null,
    };
  }

  const token = (data as BlingTokenStatusRow | null) ?? null;

  return {
    accessTokenValid: isTokenUsable(token),
    configured,
    connected: Boolean(token?.access_token || token?.refresh_token),
    expiresAt: token?.expires_at ?? null,
    lastError: token?.last_error ?? null,
    lastRefreshedAt: token?.last_refreshed_at ?? token?.updated_at ?? null,
    redirectUri,
    scope: token?.scope ?? null,
  };
}

export async function getBlingAccessToken(options: AccessTokenOptions = {}) {
  const storedToken = await getStoredToken();

  if (!options.forceRefresh && storedToken && isTokenUsable(storedToken)) {
    return storedToken.access_token;
  }

  const refreshToken = storedToken?.refresh_token;

  if (refreshToken && hasBlingOAuthRefreshEnv()) {
    const refreshed = await refreshBlingToken(refreshToken);
    return refreshed.accessToken;
  }

  if (refreshToken) {
    throw internalError("Configure BLING_CLIENT_ID e BLING_CLIENT_SECRET para renovar o token Bling automaticamente");
  }

  if (hasBlingOAuthRefreshEnv()) {
    throw internalError("Conecte o Bling pelo painel administrativo antes de emitir NF-e");
  }

  throw internalError("Configure BLING_CLIENT_ID e BLING_CLIENT_SECRET e conecte o Bling pelo painel administrativo antes de emitir NF-e");
}

export function canRefreshBlingAccessToken() {
  return hasBlingOAuthRefreshEnv();
}
