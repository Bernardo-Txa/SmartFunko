import type { Metadata } from "next";
import Link from "next/link";
import { AuthForm } from "@/components/auth/auth-form";
import { sanitizeNextPath } from "@/lib/auth/redirect";

export const metadata: Metadata = {
  title: "Cadastro",
};

type Props = {
  searchParams?: Promise<{
    next?: string;
  }>;
};

export default async function RegisterPage({ searchParams }: Props) {
  const params = await searchParams;
  const nextPath = sanitizeNextPath(params?.next) ?? "/conta/pedidos-v2";

  return (
    <div className="mx-auto flex max-w-7xl justify-center px-4 py-10 sm:px-6 lg:px-8">
      <div className="w-full max-w-md">
        <AuthForm mode="register" nextPath={nextPath} />
        <p className="mt-5 text-sm text-[var(--muted)]">
          Ja tem conta?{" "}
          <Link
            href={`/login?next=${encodeURIComponent(nextPath)}`}
            className="font-semibold text-[var(--accent)]"
          >
            Entrar
          </Link>
        </p>
      </div>
    </div>
  );
}
