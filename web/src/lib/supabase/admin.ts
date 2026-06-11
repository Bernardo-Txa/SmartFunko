import "server-only";
import { createClient } from "@supabase/supabase-js";
import { env, hasSupabaseAdminEnv } from "@/lib/env";
import { internalError } from "@/server/http/errors";

export function createSupabaseAdminClient() {
  if (!hasSupabaseAdminEnv()) {
    throw internalError("Supabase service role nao configurado no servidor");
  }

  return createClient(env.supabaseUrl, env.supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
