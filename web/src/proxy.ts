import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { sanitizeNextPath } from "@/lib/auth/redirect";
import { env, hasSupabasePublicEnv } from "@/lib/env";

const AUTH_QUERY_PARAMS = [
  "access_token",
  "code",
  "error",
  "error_code",
  "error_description",
  "refresh_token",
  "token",
  "type",
];

function getPathWithoutAuthParams(request: NextRequest) {
  const url = request.nextUrl.clone();

  for (const param of AUTH_QUERY_PARAMS) {
    url.searchParams.delete(param);
  }

  const query = url.searchParams.toString();

  return sanitizeNextPath(`${url.pathname}${query ? `?${query}` : ""}`) ?? "/";
}

function getSafeNextUrl(request: NextRequest) {
  if (request.nextUrl.pathname === "/admin") {
    return "/admin/dashboard";
  }

  return getPathWithoutAuthParams(request);
}

function hasAuthQueryParams(request: NextRequest) {
  return AUTH_QUERY_PARAMS.some((param) => request.nextUrl.searchParams.has(param));
}

function redirectUrlWithCookies(response: NextResponse, url: URL) {
  const redirectResponse = NextResponse.redirect(url);

  for (const cookie of response.cookies.getAll()) {
    redirectResponse.cookies.set(cookie);
  }

  return redirectResponse;
}

function redirectWithCookies(request: NextRequest, response: NextResponse, path: string) {
  const url = request.nextUrl.clone();
  url.pathname = path;
  url.search = "";

  return redirectUrlWithCookies(response, url);
}

export async function proxy(request: NextRequest) {
  if (!hasSupabasePublicEnv()) {
    return NextResponse.next({
      request,
    });
  }

  let response = NextResponse.next({
    request,
  });

  if (request.nextUrl.pathname === "/admin/login") {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    url.searchParams.set("next", "/admin/dashboard");
    return NextResponse.redirect(url);
  }

  const supabase = createServerClient(env.supabaseUrl, env.supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({
          request,
        });
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  const pathname = request.nextUrl.pathname;
  const isPageRequest = !pathname.startsWith("/api/");
  const isAccountRoute = pathname === "/conta" || pathname.startsWith("/conta/");
  const isAdminRoute = pathname === "/admin" || pathname.startsWith("/admin/");

  if (isPageRequest && isAccountRoute && request.nextUrl.searchParams.has("code")) {
    const { error } = await supabase.auth.exchangeCodeForSession(
      request.nextUrl.searchParams.get("code") ?? "",
    );

    if (!error) {
      const url = request.nextUrl.clone();

      for (const param of AUTH_QUERY_PARAMS) {
        url.searchParams.delete(param);
      }

      return redirectUrlWithCookies(response, url);
    }
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (isPageRequest && isAccountRoute && user && hasAuthQueryParams(request)) {
    const url = request.nextUrl.clone();

    for (const param of AUTH_QUERY_PARAMS) {
      url.searchParams.delete(param);
    }

    return redirectUrlWithCookies(response, url);
  }

  if (isPageRequest && (isAccountRoute || isAdminRoute) && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    url.searchParams.set("next", getSafeNextUrl(request));
    return NextResponse.redirect(url);
  }

  if (isPageRequest && isAdminRoute && user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("auth_user_id", user.id)
      .maybeSingle<{ role: "customer" | "admin" | "owner" }>();

    if (profile?.role !== "owner") {
      return redirectWithCookies(request, response, "/conta/pedidos");
    }
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
