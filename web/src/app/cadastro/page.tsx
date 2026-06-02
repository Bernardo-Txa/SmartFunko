import type { Metadata } from "next";
import Link from "next/link";
import { UserPlus } from "lucide-react";

export const metadata: Metadata = {
  title: "Cadastro",
};

export default function RegisterPage() {
  return (
    <div className="mx-auto flex max-w-7xl justify-center px-4 py-10 sm:px-6 lg:px-8">
      <section className="w-full max-w-md rounded-lg border border-[var(--border)] bg-[var(--surface)] p-6">
        <h1 className="text-2xl font-bold text-[var(--foreground)]">Criar conta</h1>
        <form className="mt-6 space-y-4">
          <label className="block">
            <span className="text-sm font-semibold text-[var(--foreground)]">Nome</span>
            <input
              className="mt-2 h-11 w-full rounded-md border border-[var(--border)] px-3 outline-none focus:border-[var(--accent)]"
              placeholder="Seu nome"
            />
          </label>
          <label className="block">
            <span className="text-sm font-semibold text-[var(--foreground)]">Telefone</span>
            <input
              className="mt-2 h-11 w-full rounded-md border border-[var(--border)] px-3 outline-none focus:border-[var(--accent)]"
              placeholder="(00) 00000-0000"
            />
          </label>
          <label className="block">
            <span className="text-sm font-semibold text-[var(--foreground)]">E-mail</span>
            <input
              type="email"
              className="mt-2 h-11 w-full rounded-md border border-[var(--border)] px-3 outline-none focus:border-[var(--accent)]"
              placeholder="voce@email.com"
            />
          </label>
          <label className="block">
            <span className="text-sm font-semibold text-[var(--foreground)]">Senha</span>
            <input
              type="password"
              className="mt-2 h-11 w-full rounded-md border border-[var(--border)] px-3 outline-none focus:border-[var(--accent)]"
              placeholder="Crie uma senha"
            />
          </label>
          <button className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-full bg-[var(--accent)] px-4 text-sm font-black text-[#020617] hover:brightness-110">
            <UserPlus size={17} aria-hidden="true" />
            Cadastrar
          </button>
        </form>
        <p className="mt-5 text-sm text-[var(--muted)]">
          Ja tem conta?{" "}
          <Link href="/login" className="font-semibold text-[var(--accent)]">
            Entrar
          </Link>
        </p>
      </section>
    </div>
  );
}
