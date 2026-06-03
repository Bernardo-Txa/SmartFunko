import "server-only";
import { redirect } from "next/navigation";
import { sanitizeNextPath } from "@/lib/auth/redirect";
import { HttpError } from "@/server/http/errors";
import { requireAdmin } from "@/server/auth/require-admin";
import { requireOwner } from "@/server/auth/require-owner";

export async function requireAdminPage(nextPath = "/admin/dashboard") {
  try {
    return await requireAdmin();
  } catch (error) {
    if (error instanceof HttpError && error.status === 403) {
      redirect("/conta/pedidos");
    }

    redirect(`/login?next=${encodeURIComponent(sanitizeNextPath(nextPath) ?? "/admin/dashboard")}`);
  }
}

export async function requireOwnerPage(nextPath = "/admin/dashboard") {
  try {
    return await requireOwner();
  } catch (error) {
    if (error instanceof HttpError && error.status === 403) {
      redirect("/conta/pedidos");
    }

    redirect(`/login?next=${encodeURIComponent(sanitizeNextPath(nextPath) ?? "/admin/dashboard")}`);
  }
}
