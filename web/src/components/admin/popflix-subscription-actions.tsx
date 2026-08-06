"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CircleDollarSign, Copy, ExternalLink, LinkIcon, RefreshCw } from "lucide-react";
import { SmartButtonLoading } from "@/components/ui/smart-loading";

type ActionResult = {
  error?: {
    message?: string;
  };
};

async function parseActionResult(response: Response) {
  const payload = (await response.json().catch(() => ({}))) as ActionResult;

  if (!response.ok) {
    throw new Error(payload.error?.message ?? "Falha ao executar acao");
  }
}

export function PopFlixSubscriptionActions({
  paymentLinkUrl,
  paymentStatus,
  status,
  subscriptionId,
}: {
  paymentLinkUrl?: string | null;
  paymentStatus: string;
  status: string;
  subscriptionId: string;
}) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [notes, setNotes] = useState("");
  const [runningAction, setRunningAction] = useState<string | null>(null);
  const isClosed = ["cancelled", "expired"].includes(status);
  const isPaid = status === "active" && paymentStatus === "paid";
  const canGeneratePaymentLink = !isClosed;
  const canConfirmPayment = !isClosed && !isPaid;

  async function runAction(endpoint: string, body?: Record<string, unknown>) {
    setError("");
    setMessage("");
    setRunningAction(endpoint);

    try {
      const response = await fetch(`/api/v1/admin/popflix-subscriptions/${subscriptionId}/${endpoint}`, {
        body: body ? JSON.stringify(body) : undefined,
        headers: body ? { "content-type": "application/json" } : undefined,
        method: "POST",
      });
      await parseActionResult(response);
      setMessage(
        endpoint === "generate-payment-link"
          ? "Link InfinitePay gerado."
          : endpoint === "sync-payment"
            ? "Consulta InfinitePay concluida."
            : "Pagamento confirmado.",
      );
      router.refresh();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Falha ao executar acao");
    } finally {
      setRunningAction(null);
    }
  }

  async function copyPaymentLink() {
    if (!paymentLinkUrl) {
      return;
    }

    await navigator.clipboard.writeText(paymentLinkUrl);
    setMessage("Link copiado.");
  }

  async function confirmPayment(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await runAction("confirm-payment", {
      method: "manual",
      notes: notes.trim() || null,
      paidAt: new Date().toISOString(),
    });
    setNotes("");
  }

  return (
    <div className="grid gap-2">
      {paymentLinkUrl ? (
        <div className="flex flex-wrap gap-2">
          <a
            href={paymentLinkUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-9 w-fit items-center justify-center gap-2 rounded-md border border-[var(--border)] px-3 text-xs font-semibold text-[var(--foreground)] hover:bg-[var(--surface-strong)]"
          >
            <ExternalLink size={14} aria-hidden="true" />
            Abrir link
          </a>
          <button
            type="button"
            onClick={copyPaymentLink}
            className="inline-flex h-9 w-fit items-center justify-center gap-2 rounded-md border border-[var(--border)] px-3 text-xs font-semibold text-[var(--foreground)] hover:bg-[var(--surface-strong)]"
          >
            <Copy size={14} aria-hidden="true" />
            Copiar link
          </button>
        </div>
      ) : null}
      {canGeneratePaymentLink ? (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={runningAction !== null}
            onClick={() => runAction("generate-payment-link")}
            className="inline-flex h-9 w-fit items-center justify-center gap-2 rounded-md border border-[var(--border)] px-3 text-xs font-semibold text-[var(--foreground)] hover:bg-[var(--surface-strong)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {runningAction === "generate-payment-link" ? (
              <SmartButtonLoading message="Gerando..." />
            ) : (
              <>
                <LinkIcon size={14} aria-hidden="true" />
                {paymentLinkUrl ? "Regerar link" : "Gerar link"}
              </>
            )}
          </button>
          {paymentLinkUrl ? (
            <button
              type="button"
              disabled={runningAction !== null}
              onClick={() => runAction("sync-payment", {})}
              className="inline-flex h-9 w-fit items-center justify-center gap-2 rounded-md border border-[var(--border)] px-3 text-xs font-semibold text-[var(--foreground)] hover:bg-[var(--surface-strong)] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {runningAction === "sync-payment" ? (
                <SmartButtonLoading message="Consultando..." />
              ) : (
                <>
                  <RefreshCw size={14} aria-hidden="true" />
                  Verificar pagamento
                </>
              )}
            </button>
          ) : null}
        </div>
      ) : null}
      {canConfirmPayment ? (
        <form onSubmit={confirmPayment} className="grid gap-2 sm:grid-cols-[minmax(160px,1fr)_auto]">
          <input
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            placeholder="Observacao do pagamento"
            className="h-9 rounded-md border border-[var(--border)] bg-[var(--background)] px-3 text-xs outline-none focus:border-[var(--accent)]"
          />
          <button
            type="submit"
            disabled={runningAction !== null}
            className="inline-flex h-9 items-center justify-center gap-2 rounded-md bg-[var(--accent)] px-3 text-xs font-black text-[#020617] hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {runningAction === "confirm-payment" ? (
              <SmartButtonLoading message="Confirmando..." />
            ) : (
              <>
                <CircleDollarSign size={14} aria-hidden="true" />
                Confirmar
              </>
            )}
          </button>
        </form>
      ) : null}
      {message ? <p className="text-xs font-semibold text-emerald-200">{message}</p> : null}
      {error ? <p className="text-xs font-semibold text-red-300">{error}</p> : null}
    </div>
  );
}
