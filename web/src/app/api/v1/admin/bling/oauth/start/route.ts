import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { sanitizeNextPath } from "@/lib/auth/redirect";
import { requireAdmin } from "@/server/auth/require-admin";
import { createBlingAuthorizationUrl } from "@/server/bling/bling-token-service";
import { handleApi } from "@/server/http/responses";

const COOKIE_MAX_AGE_SECONDS = 10 * 60;
const COOKIE_PATH = "/api/v1/admin/bling/oauth";

export async function GET(request: Request) {
  return handleApi(async () => {
    await requireAdmin();

    const requestUrl = new URL(request.url);
    const nextPath = sanitizeNextPath(requestUrl.searchParams.get("next")) ?? "/admin/v2/pedidos";
    const state = randomUUID();
    const response = NextResponse.redirect(createBlingAuthorizationUrl(state));
    const cookieOptions = {
      httpOnly: true,
      maxAge: COOKIE_MAX_AGE_SECONDS,
      path: COOKIE_PATH,
      sameSite: "lax" as const,
      secure: process.env.NODE_ENV === "production",
    };

    response.cookies.set("bling_oauth_state", state, cookieOptions);
    response.cookies.set("bling_oauth_next", nextPath, cookieOptions);

    return response;
  });
}
