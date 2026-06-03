import "server-only";
import { redirect } from "next/navigation";
import { sanitizeNextPath } from "@/lib/auth/redirect";
import { requireUser } from "@/server/auth/require-user";

export async function requireUserPage(nextPath = "/conta/pedidos") {
  try {
    return await requireUser();
  } catch {
    redirect(`/login?next=${encodeURIComponent(sanitizeNextPath(nextPath) ?? "/conta/pedidos")}`);
  }
}
