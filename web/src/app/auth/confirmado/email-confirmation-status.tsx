"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AlertTriangle, CheckCircle2, LogIn, UserRound } from "lucide-react";
import { SmartInlineLoading } from "@/components/ui/smart-loading";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type ConfirmationStatus = "checking" | "success" | "invalid";
function cleanConfirmationUrl() {
  window.history.replaceState(window.history.state, "", "/auth/confirmado");
}

function createEmailConfirmationClient() {
  return createSupabaseBrowserClient({
    auth: {
      detectSessionInUrl: false,
    },
    isSingleton: false,
  });
}

export function EmailConfirmationStatus() {
  const [status, setStatus] = useState<ConfirmationStatus>("checking");
  const [hasSession, setHasSession] = useState(false);

  useEffect(() => {
    const supabase = createEmailConfirmationClient();
    let isActive = true;

    async function validateConfirmation() {
      const params = new URLSearchParams(window.location.search);
      const code = params.get("code");
      const authError = params.get("error") ?? params.get("error_code");

      try {
        if (authError) {
          if (isActive) {
            setStatus("invalid");
          }
          return;
        }

        if (code) {
          const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

          if (!isActive) {
            return;
          }

          if (exchangeError || !data.session) {
            setStatus("invalid");
            return;
          }

          setHasSession(true);
          setStatus("success");
          cleanConfirmationUrl();
          return;
        }

        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!isActive) {
          return;
        }

        setHasSession(Boolean(session));
        setStatus(session ? "success" : "invalid");
      } catch {
        if (isActive) {
          setStatus("invalid");
        }
      }
    }

    void validateConfirmation();

    return () => {
      isActive = false;
    };
  }, []);

  return (
    <section className="w-full max-w-md rounded-lg border border-[var(--border)] bg-[var(--surface)] p-6">
      <h1 className="text-2xl font-bold text-[var(--foreground)]">Confirmação de e-mail</h1>

      {status === "checking" ? (
        <div className="mt-6 rounded-md border border-[var(--border)] bg-[var(--surface-strong)] px-3 py-2">
          <SmartInlineLoading
            className="font-semibold text-[var(--foreground)]"
            message="Validando confirmação..."
          />
        </div>
      ) : null}

      {status === "success" ? (
        <div className="mt-6 space-y-4">
          <div className="rounded-md border border-[var(--border)] bg-[var(--surface-strong)] px-3 py-3">
            <CheckCircle2 className="mb-3 text-emerald-200" size={24} aria-hidden="true" />
            <p className="text-sm font-semibold text-[var(--foreground)]">
              E-mail confirmado com sucesso.
            </p>
            <p className="mt-1 text-sm text-[var(--muted)]">Sua conta SmartFunko está pronta.</p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Link
              href="/login"
              className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-full border border-[var(--border)] px-4 text-sm font-semibold text-[var(--foreground)] hover:bg-[var(--surface-strong)]"
            >
              <LogIn size={17} aria-hidden="true" />
              Entrar
            </Link>
            {hasSession ? (
              <Link
                href="/conta"
                className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-full bg-[var(--accent)] px-4 text-sm font-black text-[#020617] hover:brightness-110"
              >
                <UserRound size={17} aria-hidden="true" />
                Ir para minha conta
              </Link>
            ) : null}
          </div>
        </div>
      ) : null}

      {status === "invalid" ? (
        <div className="mt-6 space-y-4">
          <div className="rounded-md border border-red-200 bg-red-50 px-3 py-3 text-red-700">
            <AlertTriangle className="mb-3" size={24} aria-hidden="true" />
            <p className="text-sm font-semibold">
              O link de confirmação expirou ou é inválido.
            </p>
          </div>
          <Link
            href="/reenviar-confirmacao"
            className="inline-flex h-11 w-full items-center justify-center rounded-full bg-[var(--accent)] px-4 text-sm font-black text-[#020617] hover:brightness-110"
          >
            Reenviar confirmação
          </Link>
        </div>
      ) : null}
    </section>
  );
}
