"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LogIn, UserPlus } from "lucide-react";
import { SmartButtonLoading } from "@/components/ui/smart-loading";
import { getDefaultAuthenticatedPath, sanitizeNextPath } from "@/lib/auth/redirect";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type AuthMode = "login" | "register";
type ProfileRole = "admin" | "customer" | "owner";

const modeCopy = {
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
  nextPath,
}: {
  mode: AuthMode;
  nextPath?: string | null;
}) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const copy = modeCopy[mode];
  const Icon = copy.icon;

  async function getRedirectPathAfterLogin() {
    const safeNextPath = sanitizeNextPath(nextPath);

    if (safeNextPath) {
      return safeNextPath;
    }

    const response = await fetch("/api/v1/me", {
      cache: "no-store",
    });

    if (!response.ok) {
      return getDefaultAuthenticatedPath("customer");
    }

    const body = (await response.json()) as {
      data?: {
        profile?: {
          role?: ProfileRole;
        };
      };
    };

    return getDefaultAuthenticatedPath(body.data?.profile?.role);
  }

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
      const cpf = String(formData.get("cpf") ?? "");
      const instagram = String(formData.get("instagram") ?? "");
      const name = String(formData.get("name") ?? "");
      const phone = String(formData.get("phone") ?? "");
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        options: {
          data: {
            cpf,
            instagram,
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

      router.push(await getRedirectPathAfterLogin());
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

    router.push(await getRedirectPathAfterLogin());
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
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="text-sm font-semibold text-[var(--foreground)]">CPF</span>
                <input
                  name="cpf"
                  className="mt-2 h-11 w-full rounded-md border border-[var(--border)] px-3 outline-none focus:border-[var(--accent)]"
                  placeholder="000.000.000-00"
                />
              </label>
              <label className="block">
                <span className="text-sm font-semibold text-[var(--foreground)]">Instagram</span>
                <input
                  name="instagram"
                  className="mt-2 h-11 w-full rounded-md border border-[var(--border)] px-3 outline-none focus:border-[var(--accent)]"
                  placeholder="@seuperfil"
                />
              </label>
            </div>
          </>
        ) : null}

        <label className="block">
          <span className="text-sm font-semibold text-[var(--foreground)]">E-mail</span>
          <input
            name="email"
            type="email"
            required
            className="mt-2 h-11 w-full rounded-md border border-[var(--border)] px-3 outline-none focus:border-[var(--accent)]"
            placeholder="voce@email.com"
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
        {mode === "login" ? (
          <div className="flex justify-end">
            <Link href="/esqueci-senha" className="text-sm font-semibold text-[var(--accent)]">
              Esqueci minha senha
            </Link>
          </div>
        ) : null}

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
          {isSubmitting ? (
            <SmartButtonLoading message="Aguarde..." />
          ) : (
            <>
              <Icon size={17} aria-hidden="true" />
              {copy.button}
            </>
          )}
        </button>
      </form>
    </section>
  );
}
