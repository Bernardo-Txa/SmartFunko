"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { LogIn, ShieldCheck, UserPlus } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type AuthMode = "login" | "register" | "admin";

const modeCopy = {
  admin: {
    button: "Entrar no painel",
    icon: ShieldCheck,
    title: "Painel admin",
  },
  login: {
    button: "Entrar",
    icon: LogIn,
    title: "Entrar",
  },
  register: {
    button: "Cadastrar",
    icon: UserPlus,
    title: "Criar conta",
  },
};

export function AuthForm({
  mode,
  redirectTo,
}: {
  mode: AuthMode;
  redirectTo: string;
}) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const copy = modeCopy[mode];
  const Icon = copy.icon;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") ?? "");
    const password = String(formData.get("password") ?? "");
    const supabase = createSupabaseBrowserClient();

    if (mode === "register") {
      const name = String(formData.get("name") ?? "");
      const phone = String(formData.get("phone") ?? "");
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        options: {
          data: {
            name,
            phone,
          },
        },
        password,
      });

      setIsSubmitting(false);

      if (signUpError) {
        setError(signUpError.message);
        return;
      }

      if (!data.session) {
        setMessage("Cadastro criado. Confirme seu e-mail para entrar.");
        return;
      }

      router.push(redirectTo);
      router.refresh();
      return;
    }

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setIsSubmitting(false);

    if (signInError) {
      setError(signInError.message);
      return;
    }

    router.push(redirectTo);
    router.refresh();
  }

  return (
    <section className="w-full max-w-md rounded-lg border border-[var(--border)] bg-[var(--surface)] p-6">
      <h1 className="text-2xl font-bold text-[var(--foreground)]">{copy.title}</h1>
      <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
        {mode === "register" ? (
          <>
            <label className="block">
              <span className="text-sm font-semibold text-[var(--foreground)]">Nome</span>
              <input
                name="name"
                required
                className="mt-2 h-11 w-full rounded-md border border-[var(--border)] px-3 outline-none focus:border-[var(--accent)]"
                placeholder="Seu nome"
              />
            </label>
            <label className="block">
              <span className="text-sm font-semibold text-[var(--foreground)]">Telefone</span>
              <input
                name="phone"
                className="mt-2 h-11 w-full rounded-md border border-[var(--border)] px-3 outline-none focus:border-[var(--accent)]"
                placeholder="(00) 00000-0000"
              />
            </label>
          </>
        ) : null}

        <label className="block">
          <span className="text-sm font-semibold text-[var(--foreground)]">E-mail</span>
          <input
            name="email"
            type="email"
            required
            className="mt-2 h-11 w-full rounded-md border border-[var(--border)] px-3 outline-none focus:border-[var(--accent)]"
            placeholder={mode === "admin" ? "admin@smartfunko.com.br" : "voce@email.com"}
          />
        </label>
        <label className="block">
          <span className="text-sm font-semibold text-[var(--foreground)]">Senha</span>
          <input
            name="password"
            type="password"
            required
            minLength={6}
            className="mt-2 h-11 w-full rounded-md border border-[var(--border)] px-3 outline-none focus:border-[var(--accent)]"
            placeholder={mode === "register" ? "Crie uma senha" : "Sua senha"}
          />
        </label>

        {error ? (
          <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">
            {error}
          </p>
        ) : null}
        {message ? (
          <p className="rounded-md border border-[var(--border)] bg-[var(--surface-strong)] px-3 py-2 text-sm font-semibold text-[var(--foreground)]">
            {message}
          </p>
        ) : null}

        <button
          disabled={isSubmitting}
          className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-full bg-[var(--accent)] px-4 text-sm font-black text-[#020617] hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Icon size={17} aria-hidden="true" />
          {isSubmitting ? "Aguarde..." : copy.button}
        </button>
      </form>
    </section>
  );
}
