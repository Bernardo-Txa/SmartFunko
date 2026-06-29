import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { env, hasSupabasePublicEnv } from "@/lib/env";

function getSupabaseAuthCookieName() {
  try {
    const projectRef = new URL(env.supabaseUrl).hostname.split(".")[0];
    return `sb-${projectRef}-auth-token`;
  } catch {
    return null;
  }
}

function isSupabaseAuthCookie(name: string, authCookieName: string) {
  return (
    name === authCookieName ||
    name.startsWith(`${authCookieName}.`) ||
    name === `${authCookieName}-code-verifier` ||
    name.startsWith(`${authCookieName}-code-verifier.`) ||
    name === `${authCookieName}-user` ||
    name.startsWith(`${authCookieName}-user.`)
  );
}

function clearSupabaseAuthCookies(request: NextRequest, response: NextResponse) {
  const authCookieName = getSupabaseAuthCookieName();

  if (!authCookieName) {
    return;
  }

  request.cookies
    .getAll()
    .filter((cookie) => isSupabaseAuthCookie(cookie.name, authCookieName))
    .forEach((cookie) => {
      response.cookies.set(cookie.name, "", {
        maxAge: 0,
        path: "/",
      });
    });
}

export async function POST(request: NextRequest) {
  const url = request.nextUrl.clone();
  url.pathname = "/";
  url.search = "";

  const response = NextResponse.redirect(url, {
    status: 303,
  });

  response.headers.set("Cache-Control", "no-store");

  if (!hasSupabasePublicEnv()) {
    return response;
  }

  const supabase = createServerClient(env.supabaseUrl, env.supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  await supabase.auth.signOut();
  clearSupabaseAuthCookies(request, response);

  return response;
}
