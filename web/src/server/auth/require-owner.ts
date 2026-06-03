import "server-only";
import { forbidden } from "@/server/http/errors";
import { requireUser, type AuthContext } from "@/server/auth/require-user";

export type OwnerContext = AuthContext & {
  profile: AuthContext["profile"] & {
    role: "owner";
  };
};

export async function requireOwner(): Promise<OwnerContext> {
  const context = await requireUser();

  if (context.profile.role !== "owner") {
    throw forbidden("Acesso restrito aos socios.");
  }

  return context as OwnerContext;
}
