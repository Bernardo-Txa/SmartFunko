import type { Metadata } from "next";
import Link from "next/link";
import { AuthForm } from "@/components/auth/auth-form";

export const metadata: Metadata = {
  title: "Entrar",
};

export default function LoginPage() {
  return (
    <div className="mx-auto flex max-w-7xl justify-center px-4 py-10 sm:px-6 lg:px-8">
      <div className="w-full max-w-md">
        <AuthForm mode="login" redirectTo="/conta" />
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
