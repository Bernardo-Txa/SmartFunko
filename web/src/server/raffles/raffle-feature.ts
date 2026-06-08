import "server-only";
import { isRafflesEnabled } from "@/lib/env";
import { notFound } from "@/server/http/errors";

export function assertRafflesEnabled() {
  if (!isRafflesEnabled()) {
    throw notFound("Rifas desabilitadas");
  }
}
