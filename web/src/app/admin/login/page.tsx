import type { Metadata } from "next";
import { ShieldCheck } from "lucide-react";

export const metadata: Metadata = {
  title: "Login admin",
};

export default function AdminLoginPage() {
  return (
    <div className="mx-auto flex max-w-7xl justify-center px-4 py-10 sm:px-6 lg:px-8">
      <section className="w-full max-w-md rounded-lg border border-[var(--border)] bg-white p-6">
        <h1 className="text-2xl font-bold text-[var(--foreground)]">Painel admin</h1>
        <form className="mt-6 space-y-4">
          <label className="block">
            <span className="text-sm font-semibold text-[var(--foreground)]">E-mail</span>
            <input
              type="email"
              className="mt-2 h-11 w-full rounded-md border border-[var(--border)] px-3 outline-none focus:border-[var(--accent)]"
              placeholder="admin@smartfunko.com.br"
            />
          </label>
          <label className="block">
            <span className="text-sm font-semibold text-[var(--foreground)]">Senha</span>
            <input
              type="password"
              className="mt-2 h-11 w-full rounded-md border border-[var(--border)] px-3 outline-none focus:border-[var(--accent)]"
              placeholder="Senha admin"
            />
          </label>
          <button className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-[var(--foreground)] px-4 text-sm font-semibold text-white hover:bg-black">
            <ShieldCheck size={17} aria-hidden="true" />
            Entrar no painel
          </button>
        </form>
      </section>
    </div>
  );
}
