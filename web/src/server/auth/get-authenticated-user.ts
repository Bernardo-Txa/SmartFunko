import "server-only";
import { createClient, type SupabaseClient, type User } from "@supabase/supabase-js";
import { env, hasSupabasePublicEnv } from "@/lib/env";
import { unauthorized, internalError } from "@/server/http/errors";
import { createSupabaseServerClient } from "@/server/supabase/server-client";

export type AuthenticatedUserContext = {
  supabase: SupabaseClient;
  authUser: User;
};

function getBearerToken(request?: Request) {
  const authorization = request?.headers.get("Authorization");

  if (!authorization) {
    return null;
  }

  const match = authorization.match(/^Bearer\s+(.+)$/i);
  const token = match?.[1]?.trim();

  if (!token) {
    throw unauthorized("Authorization Bearer invalido");
  }

  return token;
}

function createBearerSupabaseClient(token: string) {
  if (!hasSupabasePublicEnv()) {
    throw internalError("Supabase publico nao configurado no servidor");
  }

  return createClient(env.supabaseUrl, env.supabaseAnonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    global: {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  });
}

export async function getAuthenticatedUser(
  request?: Request,
): Promise<AuthenticatedUserContext> {
  const token = getBearerToken(request);

  if (token) {
    const supabase = createBearerSupabaseClient(token);
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser(token);

    if (error || !user) {
      throw unauthorized("Sessao invalida ou expirada");
    }

    return { supabase, authUser: user };
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    throw unauthorized("Autenticacao obrigatoria");
  }

  return { supabase, authUser: user };
}
