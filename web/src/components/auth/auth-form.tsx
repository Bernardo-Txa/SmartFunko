"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { AuthError } from "@supabase/supabase-js";
import { LogIn, UserPlus } from "lucide-react";
import { SmartButtonLoading } from "@/components/ui/smart-loading";
import {
  isEmailNotConfirmedError,
  isInvalidCredentialsError,
  isInvalidEmailError,
  isRateLimitError,
  isValidEmail,
  isWeakPasswordError,
} from "@/lib/auth/errors";
import { getDefaultAuthenticatedPath, sanitizeNextPath } from "@/lib/auth/redirect";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type AuthMode = "login" | "register";
type ProfileRole = "admin" | "customer" | "owner";

const EMAIL_NOT_CONFIRMED_MESSAGE =
  "Seu e-mail ainda não foi confirmado. Verifique sua caixa de entrada ou solicite um novo link de confirmação.";
const INVALID_CREDENTIALS_MESSAGE = "E-mail ou senha inválidos.";
const REGISTER_GENERIC_ERROR_MESSAGE =
  "Não foi possível criar a conta com esses dados. Verifique as informações e tente novamente.";
const LOGIN_GENERIC_ERROR_MESSAGE = "Não foi possível entrar agora. Tente novamente.";
const RATE_LIMIT_MESSAGE =
  "Você fez muitas tentativas em pouco tempo. Aguarde alguns minutos e tente novamente.";

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
  initialMessage,
  mode,
  nextPath,
}: {
  initialMessage?: string;
  mode: AuthMode;
  nextPath?: string | null;
}) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [message, setMessage] = useState(initialMessage ?? "");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showResendConfirmationLink, setShowResendConfirmationLink] = useState(false);
  const copy = modeCopy[mode];
  const Icon = copy.icon;

  function getLoginErrorMessage(signInError: AuthError) {
    if (isEmailNotConfirmedError(signInError)) {
      setShowResendConfirmationLink(true);
      return EMAIL_NOT_CONFIRMED_MESSAGE;
    }

    if (isRateLimitError(signInError)) {
      return RATE_LIMIT_MESSAGE;
    }

    if (isInvalidCredentialsError(signInError)) {
      return INVALID_CREDENTIALS_MESSAGE;
    }

    return LOGIN_GENERIC_ERROR_MESSAGE;
  }

  function getRegisterErrorMessage(signUpError: AuthError) {
    if (isWeakPasswordError(signUpError)) {
      return "Use uma senha mais forte.";
    }

    if (isInvalidEmailError(signUpError)) {
      return "Informe um e-mail válido.";
    }

    if (isRateLimitError(signUpError)) {
      return RATE_LIMIT_MESSAGE;
    }

    return REGISTER_GENERIC_ERROR_MESSAGE;
  }

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

    if (isSubmitting) {
      return;
    }

    setError("");
    setMessage("");
    setShowResendConfirmationLink(false);

    const form = event.currentTarget;
    const formData = new FormData(form);
    const email = String(formData.get("email") ?? "").trim().toLowerCase();
    const password = String(formData.get("password") ?? "");

    if (!email) {
      setError("Informe seu e-mail.");
      return;
    }

    if (!isValidEmail(email)) {
      setError("Informe um e-mail válido.");
      return;
    }

    if (!password) {
      setError(mode === "register" ? "Crie uma senha." : "Informe sua senha.");
      return;
    }

    if (mode === "register" && password.length < 8) {
      setError("A senha precisa ter pelo menos 8 caracteres.");
      return;
    }

    setIsSubmitting(true);

    const supabase = createSupabaseBrowserClient();

    if (mode === "register") {
      const cpf = String(formData.get("cpf") ?? "");
      const instagram = String(formData.get("instagram") ?? "");
      const name = String(formData.get("name") ?? "").trim();
      const phone = String(formData.get("phone") ?? "");

      if (!name) {
        setError("Informe seu nome.");
        setIsSubmitting(false);
        return;
      }

      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        options: {
          data: {
            cpf,
            instagram,
            name,
            phone,
          },
          emailRedirectTo: `${window.location.origin}/auth/confirmado`,
        },
        password,
      });

      setIsSubmitting(false);

      if (signUpError) {
        setError(getRegisterErrorMessage(signUpError));
        return;
      }

      if (!data.session) {
        setMessage("Cadastro criado. Confirme seu e-mail para entrar.");
        setShowResendConfirmationLink(true);
        form.reset();
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
      setError(getLoginErrorMessage(signInError));
      return;
    }

    router.push(await getRedirectPathAfterLogin());
    router.refresh();
  }

  return (
    <section className="w-full max-w-md rounded-lg border border-[var(--border)] bg-[var(--surface)] p-6">
      <h1 className="text-2xl font-bold text-[var(--foreground)]">{copy.title}</h1>
      <form className="mt-6 space-y-4" noValidate onSubmit={handleSubmit}>
        {mode === "register" ? (
          <>
            <label className="block">
              <span className="text-sm font-semibold text-[var(--foreground)]">Nome</span>
              <input
                name="name"
                autoComplete="name"
                required
                className="mt-2 h-11 w-full rounded-md border border-[var(--border)] px-3 outline-none focus:border-[var(--accent)]"
                placeholder="Seu nome"
              />
            </label>
            <label className="block">
              <span className="text-sm font-semibold text-[var(--foreground)]">Telefone</span>
              <input
                name="phone"
                autoComplete="tel"
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
            autoComplete="email"
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
            minLength={mode === "register" ? 8 : undefined}
            autoComplete={mode === "register" ? "new-password" : "current-password"}
            className="mt-2 h-11 w-full rounded-md border border-[var(--border)] px-3 outline-none focus:border-[var(--accent)]"
            placeholder={mode === "register" ? "Crie uma senha" : "Sua senha"}
          />
        </label>
        {mode === "login" ? (
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Link
              href="/login/magic-link"
              className="text-sm font-semibold text-[var(--accent)]"
            >
              Entrar com link mágico
            </Link>
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
        {showResendConfirmationLink ? (
          <p className="text-sm text-[var(--muted)]">
            Não recebeu o e-mail de confirmação?{" "}
            <Link href="/reenviar-confirmacao" className="font-semibold text-[var(--accent)]">
              Reenviar confirmação
            </Link>
          </p>
        ) : null}

        <button
          type="submit"
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
      {mode === "login" && !showResendConfirmationLink ? (
        <p className="mt-5 text-sm text-[var(--muted)]">
          Não recebeu o e-mail de confirmação?{" "}
          <Link href="/reenviar-confirmacao" className="font-semibold text-[var(--accent)]">
            Reenviar confirmação
          </Link>
        </p>
      ) : null}
    </section>
  );
}
