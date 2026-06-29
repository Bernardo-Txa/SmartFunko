"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { KeyRound } from "lucide-react";
import { SmartButtonLoading, SmartInlineLoading } from "@/components/ui/smart-loading";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

const INVALID_LINK_MESSAGE = "O link de recuperação expirou ou é inválido.";
const GENERIC_ERROR_MESSAGE =
  "Não foi possível alterar sua senha. Solicite um novo link e tente novamente.";

type RecoveryStatus = "checking" | "ready" | "invalid" | "success";
type SupabaseBrowserClient = ReturnType<typeof createSupabaseBrowserClient>;

function cleanRecoveryUrl() {
  window.history.replaceState(window.history.state, "", "/redefinir-senha");
}

function createPasswordResetClient() {
  return createSupabaseBrowserClient({
    auth: {
      detectSessionInUrl: false,
    },
    isSingleton: false,
  });
}

export function PasswordResetForm() {
  const supabaseRef = useRef<SupabaseBrowserClient | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [status, setStatus] = useState<RecoveryStatus>("checking");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const supabase = createPasswordResetClient();
    let isActive = true;
    supabaseRef.current = supabase;

    async function prepareRecoverySession() {
      const params = new URLSearchParams(window.location.search);
      const code = params.get("code");

      try {
        if (code) {
          const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

          if (!isActive) {
            return;
          }

          if (exchangeError || !data.session) {
            setStatus("invalid");
            return;
          }

          setStatus("ready");
          setError("");
          cleanRecoveryUrl();
          return;
        }

        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!isActive) {
          return;
        }

        setStatus(session ? "ready" : "invalid");
      } catch {
        if (isActive) {
          setStatus("invalid");
        }
      }
    }

    void prepareRecoverySession();

    return () => {
      isActive = false;
      supabaseRef.current = null;
    };
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isSubmitting) {
      return;
    }

    setError("");

    if (status !== "ready") {
      setStatus("invalid");
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

    if (!confirmPassword) {
      setError("Confirme a nova senha.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("As senhas precisam ser iguais.");
      return;
    }

    setIsSubmitting(true);

    const supabase = supabaseRef.current ?? createPasswordResetClient();
    const { error: updateError } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (updateError) {
      setIsSubmitting(false);
      setError(GENERIC_ERROR_MESSAGE);
      return;
    }

    setStatus("success");
    setNewPassword("");
    setConfirmPassword("");
    await supabase.auth.signOut();

    window.setTimeout(() => {
      window.location.assign("/login?passwordReset=success");
    }, 1000);
  }

  return (
    <section className="w-full max-w-md rounded-lg border border-[var(--border)] bg-[var(--surface)] p-6">
      <h1 className="text-2xl font-bold text-[var(--foreground)]">Redefinir senha</h1>

      {status === "checking" ? (
        <div className="mt-6 rounded-md border border-[var(--border)] bg-[var(--surface-strong)] px-3 py-2">
          <SmartInlineLoading
            className="font-semibold text-[var(--foreground)]"
            message="Validando link de recuperação..."
          />
        </div>
      ) : null}

      {status === "ready" ? (
        <form className="mt-6 space-y-4" noValidate onSubmit={handleSubmit}>
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
              disabled={isSubmitting}
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
              disabled={isSubmitting}
              className="mt-2 h-11 w-full rounded-md border border-[var(--border)] px-3 outline-none focus:border-[var(--accent)] disabled:cursor-not-allowed disabled:opacity-60"
              placeholder="Repita a nova senha"
            />
          </label>

          {error ? (
            <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">
              {error}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-full bg-[var(--accent)] px-4 text-sm font-black text-[#020617] hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? (
              <SmartButtonLoading message="Alterando..." />
            ) : (
              <>
                <KeyRound size={17} aria-hidden="true" />
                Alterar senha
              </>
            )}
          </button>
        </form>
      ) : null}

      {status === "invalid" ? (
        <div className="mt-6 space-y-4">
          <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">
            {INVALID_LINK_MESSAGE}
          </p>
          <Link
            href="/esqueci-senha"
            className="inline-flex h-11 w-full items-center justify-center rounded-full bg-[var(--accent)] px-4 text-sm font-black text-[#020617] hover:brightness-110"
          >
            Solicitar novo link
          </Link>
        </div>
      ) : null}

      {status === "success" ? (
        <div className="mt-6 space-y-4">
          <p className="rounded-md border border-[var(--border)] bg-[var(--surface-strong)] px-3 py-2 text-sm font-semibold text-[var(--foreground)]">
            Senha alterada com sucesso.
          </p>
          <Link
            href="/login"
            className="inline-flex h-11 w-full items-center justify-center rounded-full bg-[var(--accent)] px-4 text-sm font-black text-[#020617] hover:brightness-110"
          >
            Entrar
          </Link>
        </div>
      ) : null}
    </section>
  );
}
