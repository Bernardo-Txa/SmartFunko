import type { PostgrestError } from "@supabase/supabase-js";
import { internalError } from "@/server/http/errors";

export function throwQueryError(error: PostgrestError | null, message: string): never {
  console.error(message, {
    code: error?.code,
    details: error?.details,
    hint: error?.hint,
    message: error?.message,
  });
  throw internalError(message);
}
