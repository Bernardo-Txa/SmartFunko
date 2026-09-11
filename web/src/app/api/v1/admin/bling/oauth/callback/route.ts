import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { sanitizeNextPath } from "@/lib/auth/redirect";
import { env } from "@/lib/env";
import { requireAdmin } from "@/server/auth/require-admin";
import { exchangeBlingAuthorizationCodeWithRedirectUri, getBlingOAuthRedirectUri } from "@/server/bling/bling-token-service";

const COOKIE_PATH = "/api/v1/admin/bling/oauth";

function withOauthStatus(nextPath: string, status: "connected" | "error") {
  const url = new URL(nextPath, env.siteUrl);
  url.searchParams.set("bling_oauth", status);

  return url;
}

function clearOauthCookies(response: NextResponse) {
  const options = {
    httpOnly: true,
    maxAge: 0,
    path: COOKIE_PATH,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
  };

  response.cookies.set("bling_oauth_state", "", options);
  response.cookies.set("bling_oauth_next", "", options);
  response.cookies.set("bling_oauth_redirect_uri", "", options);
}

function redirectWithStatus(nextPath: string, status: "connected" | "error") {
  const response = NextResponse.redirect(withOauthStatus(nextPath, status));
  clearOauthCookies(response);

  return response;
}

export async function GET(request: Request) {
  let nextPath = "/admin/integracoes";

  try {
    await requireAdmin();

    const cookieStore = await cookies();
    const expectedState = cookieStore.get("bling_oauth_state")?.value;
    const redirectUri = cookieStore.get("bling_oauth_redirect_uri")?.value || getBlingOAuthRedirectUri();
    nextPath = sanitizeNextPath(cookieStore.get("bling_oauth_next")?.value) ?? nextPath;

    const requestUrl = new URL(request.url);
    const state = requestUrl.searchParams.get("state");
    const code = requestUrl.searchParams.get("code");
    const error = requestUrl.searchParams.get("error");

    if (error || !code || !expectedState || state !== expectedState) {
      return redirectWithStatus(nextPath, "error");
    }

    await exchangeBlingAuthorizationCodeWithRedirectUri(code, redirectUri);

    return redirectWithStatus(nextPath, "connected");
  } catch (error) {
    console.error("[Bling] Falha no callback OAuth", error);
    return redirectWithStatus(nextPath, "error");
  }
}
