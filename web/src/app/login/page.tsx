import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthForm } from "@/components/auth/auth-form";
import { getDefaultAuthenticatedPath, sanitizeNextPath } from "@/lib/auth/redirect";
import { getCurrentUser } from "@/server/auth/get-current-user";

export const metadata: Metadata = {
  title: "Entrar",
};

type Props = {
  searchParams?: Promise<{
    next?: string;
  }>;
};

export default async function LoginPage({ searchParams }: Props) {
  const params = await searchParams;
  const nextPath = sanitizeNextPath(params?.next);
  const currentUser = await getCurrentUser();

  if (currentUser) {
    redirect(nextPath ?? getDefaultAuthenticatedPath(currentUser.profile.role));
  }

  return (
    <div className="mx-auto flex max-w-7xl justify-center px-4 py-10 sm:px-6 lg:px-8">
      <div className="w-full max-w-md">
        <AuthForm mode="login" nextPath={nextPath} />
        <p className="mt-5 text-sm text-[var(--muted)]">
          Novo por aqui?{" "}
          <Link href="/cadastro" className="font-semibold text-[var(--accent)]">
            Criar conta
          </Link>
        </p>
      </div>
    </div>
  );
}
