"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { PrivacyContent, TermsContent } from "@/components/legal/legal-document-content";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type GateStatus = "idle" | "accepted" | "required";

export function LegalConsentGate() {
  const pathname = usePathname();
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const [gateStatus, setGateStatus] = useState<GateStatus>("idle");
  const [hasReachedEnd, setHasReachedEnd] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const checkAcceptance = useCallback(async () => {
    try {
      const response = await fetch("/api/v1/me/legal-acceptance", {
        cache: "no-store",
        credentials: "same-origin",
      });

      if (response.status === 401) {
        setGateStatus("idle");
        return;
      }

      if (!response.ok) {
        return;
      }

      const body = (await response.json()) as { data?: { accepted?: boolean } };
      setGateStatus(body.data?.accepted ? "accepted" : "required");
    } catch {
      // Uma falha transitória não deve bloquear visitantes sem sessão.
    }
  }, []);

  useEffect(() => {
    if (gateStatus !== "idle") {
      return;
    }

    const timeout = window.setTimeout(() => {
      void checkAcceptance();
    }, 0);

    return () => window.clearTimeout(timeout);
  }, [checkAcceptance, gateStatus, pathname]);

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN") {
        void checkAcceptance();
      } else if (event === "SIGNED_OUT") {
        setGateStatus("idle");
        setHasReachedEnd(false);
      }
    });

    return () => data.subscription.unsubscribe();
  }, [checkAcceptance]);

  useEffect(() => {
    if (gateStatus !== "required") {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const updateScrollState = () => {
      const element = scrollAreaRef.current;
      if (!element) return;
      const remaining = element.scrollHeight - element.scrollTop - element.clientHeight;
      setHasReachedEnd(remaining <= 8);
    };

    const frame = window.requestAnimationFrame(updateScrollState);
    window.addEventListener("resize", updateScrollState);

    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("resize", updateScrollState);
      document.body.style.overflow = previousOverflow;
    };
  }, [gateStatus]);

  async function acceptDocuments() {
    if (!hasReachedEnd || isSubmitting) return;

    setError("");
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/v1/me/legal-acceptance", {
        method: "POST",
        credentials: "same-origin",
      });

      if (!response.ok) {
        throw new Error("acceptance_failed");
      }

      setGateStatus("accepted");
    } catch {
      setError("Não foi possível registrar seu aceite. Verifique sua conexão e tente novamente.");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (gateStatus !== "required") {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[200] grid place-items-center bg-slate-950/92 p-3 backdrop-blur-sm sm:p-6">
      <section
        aria-describedby="legal-consent-description"
        aria-labelledby="legal-consent-title"
        aria-modal="true"
        className="flex max-h-[calc(100svh-1.5rem)] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-cyan-300/25 bg-[#071124] shadow-[0_30px_100px_rgba(0,0,0,0.65)] sm:max-h-[calc(100svh-3rem)]"
        role="dialog"
      >
        <header className="border-b border-[var(--border)] px-5 py-4 sm:px-7">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 rounded-full bg-cyan-400/12 p-2 text-cyan-300">
              <ShieldCheck aria-hidden="true" size={22} />
            </span>
            <div>
              <h1 id="legal-consent-title" className="text-xl font-black text-[var(--foreground)] sm:text-2xl">
                Termos de Uso e Política de Privacidade
              </h1>
              <p id="legal-consent-description" className="mt-1 text-sm text-[var(--muted)]">
                Leia os documentos e role até o final para liberar o aceite.
              </p>
            </div>
          </div>
        </header>

        <div
          className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-6 text-sm leading-7 text-[var(--muted)] sm:px-7"
          onScroll={(event) => {
            const element = event.currentTarget;
            const remaining = element.scrollHeight - element.scrollTop - element.clientHeight;
            if (remaining <= 8) setHasReachedEnd(true);
          }}
          ref={scrollAreaRef}
          tabIndex={0}
        >
          <div className="space-y-10">
            <article>
              <h2 className="mb-5 text-2xl font-black text-[var(--foreground)]">Termos de Uso</h2>
              <TermsContent />
            </article>
            <article className="border-t border-[var(--border)] pt-9">
              <h2 className="mb-5 text-2xl font-black text-[var(--foreground)]">Política de Privacidade</h2>
              <PrivacyContent />
            </article>
            <div className="rounded-lg border border-emerald-400/25 bg-emerald-400/10 p-4 font-semibold text-emerald-200">
              Você chegou ao final dos documentos. O botão de aceite está liberado abaixo.
            </div>
          </div>
        </div>

        <footer className="border-t border-[var(--border)] bg-slate-950/35 px-5 py-4 sm:px-7">
          {!hasReachedEnd ? (
            <p className="mb-3 text-center text-xs font-semibold text-amber-300">
              Continue rolando para ler todo o conteúdo.
            </p>
          ) : null}
          {error ? (
            <p className="mb-3 rounded-md border border-red-300/30 bg-red-400/10 px-3 py-2 text-sm font-semibold text-red-200">
              {error}
            </p>
          ) : null}
          <button
            className="inline-flex h-12 w-full items-center justify-center rounded-full bg-[var(--accent)] px-5 text-sm font-black text-[#020617] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
            disabled={!hasReachedEnd || isSubmitting}
            onClick={acceptDocuments}
            type="button"
          >
            {isSubmitting ? "Registrando aceite..." : "Li e aceito os Termos e a Política de Privacidade"}
          </button>
        </footer>
      </section>
    </div>
  );
}

