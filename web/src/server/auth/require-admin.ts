import "server-only";
import { requireOwner, type OwnerContext } from "@/server/auth/require-owner";

export type AdminContext = OwnerContext;

export async function requireAdmin(): Promise<AdminContext> {
  return requireOwner();
}
