"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Mail } from "lucide-react";
import type { AuthError } from "@supabase/supabase-js";
import { SmartButtonLoading } from "@/components/ui/smart-loading";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

const SUCCESS_MESSAGE =
  "Se esse e-mail estiver cadastrado, enviaremos um link para redefinir sua senha.";
const RATE_LIMIT_MESSAGE =
  "Você solicitou muitos e-mails em pouco tempo. Aguarde alguns minutos e tente novamente.";
const GENERIC_ERROR_MESSAGE =
  "Não foi possível enviar o e-mail de recuperação agora. Tente novamente.";

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function getErrorText(error: AuthError) {
  return `${error.code ?? ""} ${error.message}`.toLowerCase();
}

function isRateLimitError(error: AuthError) {
  const text = getErrorText(error);

  return (
    error.status === 429 ||
    text.includes("rate limit") ||
    text.includes("too many") ||
    text.includes("email rate limit") ||
    text.includes("over_email_send_rate_limit")
  );
}

function isEmailEnumerationSafeError(error: AuthError) {
  const text = getErrorText(error);

  return (
    text.includes("user not found") ||
    text.includes("not found") ||
    text.includes("email not found") ||
    text.includes("not registered")
  );
}

export function PasswordResetRequestForm() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isSubmitting) {
      return;
    }

    const normalizedEmail = email.trim().toLowerCase();
    setError("");
    setMessage("");

    if (!normalizedEmail) {
      setError("Informe seu e-mail.");
      return;
    }

    if (!isValidEmail(normalizedEmail)) {
      setError("Informe um e-mail válido.");
      return;
    }

    setIsSubmitting(true);

    const supabase = createSupabaseBrowserClient();
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(normalizedEmail, {
      redirectTo: `${window.location.origin}/redefinir-senha`,
    });

    setIsSubmitting(false);

    if (resetError) {
      if (isRateLimitError(resetError)) {
        setError(RATE_LIMIT_MESSAGE);
        return;
      }

      if (isEmailEnumerationSafeError(resetError)) {
        setMessage(SUCCESS_MESSAGE);
        return;
      }

      setError(GENERIC_ERROR_MESSAGE);
      return;
    }

    setMessage(SUCCESS_MESSAGE);
  }

  return (
    <section className="w-full max-w-md rounded-lg border border-[var(--border)] bg-[var(--surface)] p-6">
      <h1 className="text-2xl font-bold text-[var(--foreground)]">Recuperar senha</h1>
      <form className="mt-6 space-y-4" noValidate onSubmit={handleSubmit}>
        <label className="block">
          <span className="text-sm font-semibold text-[var(--foreground)]">E-mail</span>
          <input
            name="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="mt-2 h-11 w-full rounded-md border border-[var(--border)] px-3 outline-none focus:border-[var(--accent)]"
            placeholder="voce@email.com"
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
          type="submit"
          disabled={isSubmitting}
          className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-full bg-[var(--accent)] px-4 text-sm font-black text-[#020617] hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting ? (
            <SmartButtonLoading message="Enviando..." />
          ) : (
            <>
              <Mail size={17} aria-hidden="true" />
              Enviar link
            </>
          )}
        </button>
      </form>
      <Link
        href="/login"
        className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-[var(--accent)]"
      >
        <ArrowLeft size={16} aria-hidden="true" />
        Voltar ao login
      </Link>
    </section>
  );
}
