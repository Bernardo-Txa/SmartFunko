import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { sanitizeNextPath } from "@/lib/auth/redirect";
import { env, hasSupabasePublicEnv } from "@/lib/env";

function getSafeNextUrl(request: NextRequest) {
  if (request.nextUrl.pathname === "/admin") {
    return "/admin/dashboard";
  }

  return sanitizeNextPath(`${request.nextUrl.pathname}${request.nextUrl.search}`) ?? "/";
}

function redirectWithCookies(request: NextRequest, response: NextResponse, path: string) {
  const url = request.nextUrl.clone();
  url.pathname = path;
  url.search = "";

  const redirectResponse = NextResponse.redirect(url);

  for (const cookie of response.cookies.getAll()) {
    redirectResponse.cookies.set(cookie);
  }

  return redirectResponse;
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

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;
  const isPageRequest = !pathname.startsWith("/api/");
  const isAccountRoute = pathname === "/conta" || pathname.startsWith("/conta/");
  const isAdminRoute = pathname === "/admin" || pathname.startsWith("/admin/");

  if (isPageRequest && (isAccountRoute || isAdminRoute) && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
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
