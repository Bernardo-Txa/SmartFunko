import "server-only";
import { redirect } from "next/navigation";
import { requireUser } from "@/server/auth/require-user";

export async function requireUserPage() {
  try {
    return await requireUser();
  } catch {
    redirect("/login");
  }
}
