"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, KeyRound } from "lucide-react";
import type { AuthError } from "@supabase/supabase-js";
import { SmartButtonLoading } from "@/components/ui/smart-loading";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

const EXPIRED_LINK_MESSAGE =
  "O link de recuperação expirou ou é inválido. Solicite um novo link.";
const WEAK_PASSWORD_MESSAGE = "Use uma senha mais forte.";
const GENERIC_ERROR_MESSAGE =
  "Não foi possível alterar sua senha. Solicite um novo link e tente novamente.";

type RecoveryUrlState = {
  accessToken: string | null;
  code: string | null;
  hasRecoveryCallback: boolean;
  hasUrlError: boolean;
  refreshToken: string | null;
  type: string | null;
};

function readRecoveryUrlState(): RecoveryUrlState {
  const url = new URL(window.location.href);
  const hash = url.hash.startsWith("#") ? url.hash.slice(1) : url.hash;
  const hashParams = new URLSearchParams(hash);
  const code = url.searchParams.get("code");
  const accessToken = hashParams.get("access_token");
  const refreshToken = hashParams.get("refresh_token");
  const type = hashParams.get("type");

  return {
    accessToken,
    code,
    hasRecoveryCallback: Boolean(code) || Boolean(accessToken && refreshToken && type === "recovery"),
    hasUrlError:
      url.searchParams.has("error") ||
      url.searchParams.has("error_description") ||
      hashParams.has("error") ||
      hashParams.has("error_description"),
    refreshToken,
    type,
  };
}

function cleanRecoveryUrl() {
  window.history.replaceState(window.history.state, "", "/redefinir-senha");
}

function getErrorText(error: AuthError) {
  return `${error.code ?? ""} ${error.message}`.toLowerCase();
}

function isExpiredLinkError(error: AuthError) {
  const text = getErrorText(error);

  return (
    error.status === 401 ||
    error.status === 403 ||
    text.includes("expired") ||
    text.includes("invalid") ||
    text.includes("session missing") ||
    text.includes("not authenticated") ||
    text.includes("jwt")
  );
}

function isWeakPasswordError(error: AuthError) {
  const text = getErrorText(error);

  return (
    text.includes("weak password") ||
    text.includes("password should") ||
    text.includes("password must") ||
    text.includes("password is too weak")
  );
}

export function PasswordResetForm() {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const [hasRecoverySession, setHasRecoverySession] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const recoveryUrlState = readRecoveryUrlState();
    const supabase = createSupabaseBrowserClient({
      auth: {
        detectSessionInUrl: false,
      },
      isSingleton: false,
    });
    let isActive = true;
    let sawPasswordRecoveryEvent = false;

    function markRecoverySessionReady() {
      if (!isActive) {
        return;
      }

      setHasRecoverySession(true);
      setError("");
      setIsCheckingSession(false);
      cleanRecoveryUrl();
    }

    function markRecoverySessionInvalid() {
      if (!isActive) {
        return;
      }

      setHasRecoverySession(false);
      setError(EXPIRED_LINK_MESSAGE);
      setIsCheckingSession(false);
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" && session) {
        sawPasswordRecoveryEvent = true;
        markRecoverySessionReady();
      }
    });

    async function prepareRecoverySession() {
      if (recoveryUrlState.hasUrlError || !recoveryUrlState.hasRecoveryCallback) {
        markRecoverySessionInvalid();
        return;
      }

      if (
        recoveryUrlState.accessToken &&
        recoveryUrlState.refreshToken &&
        recoveryUrlState.type === "recovery"
      ) {
        const { error: setSessionError } = await supabase.auth.setSession({
          access_token: recoveryUrlState.accessToken,
          refresh_token: recoveryUrlState.refreshToken,
        });

        if (setSessionError) {
          markRecoverySessionInvalid();
          return;
        }

        markRecoverySessionReady();
        return;
      }

      if (recoveryUrlState.code) {
        const {
          data: { session },
          error: exchangeError,
        } = await supabase.auth.exchangeCodeForSession(recoveryUrlState.code);

        if (exchangeError || !session || !sawPasswordRecoveryEvent) {
          await supabase.auth.signOut();
          markRecoverySessionInvalid();
          return;
        }

        markRecoverySessionReady();
        return;
      }

      markRecoverySessionInvalid();
    }

    void prepareRecoverySession();

    return () => {
      isActive = false;
      subscription.unsubscribe();
    };
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isSubmitting) {
      return;
    }

    setError("");
    setMessage("");

    if (!hasRecoverySession) {
      setError(EXPIRED_LINK_MESSAGE);
      return;
    }

    if (!newPassword) {
      setError("Informe a nova senha.");
      return;
    }

    if (newPassword.length < 8) {
      setError("A senha precisa ter pelo menos 8 caracteres.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("As senhas precisam ser iguais.");
      return;
    }

    setIsSubmitting(true);

    const supabase = createSupabaseBrowserClient();
    const { error: updateError } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (updateError) {
      setIsSubmitting(false);

      if (isExpiredLinkError(updateError)) {
        setError(EXPIRED_LINK_MESSAGE);
        return;
      }

      if (isWeakPasswordError(updateError)) {
        setError(WEAK_PASSWORD_MESSAGE);
        return;
      }

      setError(GENERIC_ERROR_MESSAGE);
      return;
    }

    setMessage("Senha alterada com sucesso.");
    await supabase.auth.signOut();

    window.setTimeout(() => {
      window.location.assign("/login");
    }, 1800);
  }

  const isSubmitDisabled = isCheckingSession || !hasRecoverySession || isSubmitting;

  return (
    <section className="w-full max-w-md rounded-lg border border-[var(--border)] bg-[var(--surface)] p-6">
      <h1 className="text-2xl font-bold text-[var(--foreground)]">Redefinir senha</h1>
      <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
        <label className="block">
          <span className="text-sm font-semibold text-[var(--foreground)]">Nova senha</span>
          <input
            name="newPassword"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            value={newPassword}
            onChange={(event) => setNewPassword(event.target.value)}
            disabled={isCheckingSession || !hasRecoverySession || isSubmitting}
            className="mt-2 h-11 w-full rounded-md border border-[var(--border)] px-3 outline-none focus:border-[var(--accent)] disabled:cursor-not-allowed disabled:opacity-60"
            placeholder="Digite a nova senha"
          />
        </label>
        <label className="block">
          <span className="text-sm font-semibold text-[var(--foreground)]">
            Confirmar nova senha
          </span>
          <input
            name="confirmPassword"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            disabled={isCheckingSession || !hasRecoverySession || isSubmitting}
            className="mt-2 h-11 w-full rounded-md border border-[var(--border)] px-3 outline-none focus:border-[var(--accent)] disabled:cursor-not-allowed disabled:opacity-60"
            placeholder="Repita a nova senha"
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
          disabled={isSubmitDisabled}
          className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-full bg-[var(--accent)] px-4 text-sm font-black text-[#020617] hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isCheckingSession ? (
            <SmartButtonLoading message="Validando link..." />
          ) : isSubmitting ? (
            <SmartButtonLoading message="Salvando..." />
          ) : (
            <>
              <KeyRound size={17} aria-hidden="true" />
              Alterar senha
            </>
          )}
        </button>
      </form>
      <Link
        href="/esqueci-senha"
        className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-[var(--accent)]"
      >
        <ArrowLeft size={16} aria-hidden="true" />
        Solicitar novo link
      </Link>
    </section>
  );
}
