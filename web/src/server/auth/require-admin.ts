import "server-only";
import { forbidden } from "@/server/http/errors";
import { requireUser, type AuthContext } from "@/server/auth/require-user";

export type AdminContext = AuthContext & {
  profile: AuthContext["profile"] & {
    role: "admin" | "owner";
  };
};

export async function requireAdmin(): Promise<AdminContext> {
  const context = await requireUser();

  if (context.profile.role !== "owner" && context.profile.role !== "admin") {
    throw forbidden("Acesso restrito ao painel interno.");
  }

  return context as AdminContext;
}
