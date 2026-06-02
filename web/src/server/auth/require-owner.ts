import "server-only";
import { forbidden } from "@/server/http/errors";
import { requireAdmin, type AdminContext } from "@/server/auth/require-admin";

export type OwnerContext = AdminContext & {
  profile: AdminContext["profile"] & {
    role: "owner";
  };
};

export async function requireOwner(): Promise<OwnerContext> {
  const context = await requireAdmin();

  if (context.profile.role !== "owner") {
    throw forbidden("Acesso de proprietario restrito");
  }

  return context as OwnerContext;
}
