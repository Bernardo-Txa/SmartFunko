import type { PostgrestError } from "@supabase/supabase-js";
import { internalError } from "@/server/http/errors";

export function throwQueryError(error: PostgrestError | null, message: string): never {
  console.error(message, error);
  throw internalError(message);
}
