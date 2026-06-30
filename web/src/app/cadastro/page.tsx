import type { Metadata } from "next";
import Link from "next/link";
import { AuthForm } from "@/components/auth/auth-form";

export const metadata: Metadata = {
  title: "Cadastro",
};

export default function RegisterPage() {
  return (
    <div className="mx-auto flex max-w-7xl justify-center px-4 py-10 sm:px-6 lg:px-8">
      <div className="w-full max-w-md">
        <AuthForm mode="register" nextPath="/conta/pedidos" />
        <p className="mt-5 text-sm text-[var(--muted)]">
          Ja tem conta?{" "}
          <Link href="/login" className="font-semibold text-[var(--accent)]">
            Entrar
          </Link>
        </p>
        <p className="mt-3 text-sm text-[var(--muted)]">
          Não recebeu o e-mail de confirmação?{" "}
          <Link href="/reenviar-confirmacao" className="font-semibold text-[var(--accent)]">
            Reenviar confirmação
          </Link>
        </p>
      </div>
    </div>
  );
}
