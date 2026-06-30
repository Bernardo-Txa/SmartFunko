import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getDefaultAuthenticatedPath } from "@/lib/auth/redirect";
import { getCurrentUser } from "@/server/auth/get-current-user";
import { MagicLinkLoginForm } from "./magic-link-form";

export const metadata: Metadata = {
  title: "Entrar com link mágico",
};

export default async function MagicLinkLoginPage() {
  const currentUser = await getCurrentUser();

  if (currentUser) {
    redirect(getDefaultAuthenticatedPath(currentUser.profile.role));
  }

  return (
    <div className="mx-auto flex max-w-7xl justify-center px-4 py-10 sm:px-6 lg:px-8">
      <MagicLinkLoginForm />
    </div>
  );
}
