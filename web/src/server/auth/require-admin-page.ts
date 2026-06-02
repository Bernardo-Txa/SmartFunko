import "server-only";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/server/auth/require-admin";
import { requireOwner } from "@/server/auth/require-owner";

export async function requireAdminPage() {
  try {
    return await requireAdmin();
  } catch {
    redirect("/admin/login");
  }
}

export async function requireOwnerPage() {
  try {
    return await requireOwner();
  } catch {
    redirect("/admin/login");
  }
}
