import "server-only";
import { hasSupabasePublicEnv } from "@/lib/env";
import { createSupabaseServerClient as createLibSupabaseServerClient } from "@/lib/supabase/server";
import { internalError } from "@/server/http/errors";

export async function createSupabaseServerClient() {
  if (!hasSupabasePublicEnv()) {
    throw internalError("Supabase publico nao configurado no servidor");
  }

  return createLibSupabaseServerClient();
}

export type SupabaseServerClient = Awaited<ReturnType<typeof createSupabaseServerClient>>;
