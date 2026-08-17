"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Banknote, Check, PackageCheck, RotateCcw, Send, X } from "lucide-react";

type Props = {
  approvalStatus: string;
  fulfillmentStatus: string;
  orderId: string;
  paymentStatus: string;
  trackingCode?: string | null;
  trackingUrl?: string | null;
};

type ApiResponse = {
  error?: {
    message?: string;
  };
};

async function postJson(endpoint: string, body: Record<string, unknown> = {}) {
  const response = await fetch(endpoint, {
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
    method: "POST",
  });
  const payload = (await response.json()) as ApiResponse;

  if (!response.ok) {
    throw new Error(payload.error?.message ?? "Falha na acao");
  }
}

export function OrderV2Actions({
  approvalStatus,
  fulfillmentStatus,
  orderId,
  paymentStatus,
  trackingCode,
  trackingUrl,
}: Props) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [nextFulfillment, setNextFulfillment] = useState(fulfillmentStatus);
  const [nextTrackingCode, setNextTrackingCode] = useState(trackingCode ?? "");
  const [nextTrackingUrl, setNextTrackingUrl] = useState(trackingUrl ?? "");
  const canUpdateFulfillment = paymentStatus === "pago" && fulfillmentStatus !== "cancelado";
  const canManualPayment = (
    approvalStatus !== "recusado" &&
    fulfillmentStatus !== "cancelado" &&
    ["nao_pago", "checkout_gerado"].includes(paymentStatus)
  );

  async function run(action: () => Promise<void>) {
    setError("");
    setIsSubmitting(true);

    try {
      await action();
      router.refresh();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Falha na acao");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5">
      <h2 className="text-lg font-bold text-[var(--foreground)]">Acoes</h2>

      <div className="mt-4 flex flex-wrap gap-2">
        {approvalStatus === "aguardando_aprovacao" ? (
          <>
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => run(() => postJson(`/api/v1/admin/orders-v2/${orderId}/approve`))}
              className="inline-flex h-10 items-center gap-2 rounded-md bg-emerald-300 px-3 text-sm font-black text-slate-950 hover:brightness-110 disabled:opacity-60"
            >
              <Check size={16} aria-hidden="true" />
              Aprovar
            </button>
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => {
                const reason = window.prompt("Motivo da recusa");

                if (reason?.trim()) {
                  void run(() => postJson(`/api/v1/admin/orders-v2/${orderId}/reject`, { reason }));
                }
              }}
              className="inline-flex h-10 items-center gap-2 rounded-md border border-red-300/40 px-3 text-sm font-semibold text-red-100 hover:bg-red-400/10 disabled:opacity-60"
            >
              <X size={16} aria-hidden="true" />
              Recusar
            </button>
          </>
        ) : null}

        {canManualPayment ? (
          <button
            type="button"
            disabled={isSubmitting}
            onClick={() => {
              const notes = window.prompt("Observacao da baixa manual (opcional)");

              if (notes !== null) {
                void run(() => postJson(`/api/v1/admin/orders-v2/${orderId}/manual-payment`, { notes }));
              }
            }}
            className="inline-flex h-10 items-center gap-2 rounded-md border border-yellow-300/50 px-3 text-sm font-semibold text-yellow-100 hover:bg-yellow-300/10 disabled:opacity-60"
          >
            <Banknote size={16} aria-hidden="true" />
            Baixa manual
          </button>
        ) : null}

        <button
          type="button"
          disabled={isSubmitting}
          onClick={() => {
            const reason = window.prompt(paymentStatus === "pago" ? "Motivo do cancelamento com reembolso manual" : "Motivo do cancelamento");

            if (reason?.trim()) {
              void run(() => postJson(`/api/v1/admin/orders-v2/${orderId}/cancel`, { reason }));
            }
          }}
          className="inline-flex h-10 items-center gap-2 rounded-md border border-[var(--border)] px-3 text-sm font-semibold text-[var(--foreground)] hover:bg-[var(--surface-strong)] disabled:opacity-60"
        >
          <X size={16} aria-hidden="true" />
          Cancelar
        </button>

        {paymentStatus === "reembolso_pendente" ? (
          <button
            type="button"
            disabled={isSubmitting}
            onClick={() => {
              const notes = window.prompt("Observacao do reembolso manual") ?? "";
              void run(() => postJson(`/api/v1/admin/orders-v2/${orderId}/refund`, { notes }));
            }}
            className="inline-flex h-10 items-center gap-2 rounded-md border border-orange-300/40 px-3 text-sm font-semibold text-orange-100 hover:bg-orange-400/10 disabled:opacity-60"
          >
            <RotateCcw size={16} aria-hidden="true" />
            Reembolsado
          </button>
        ) : null}
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-[220px_minmax(0,1fr)_minmax(0,1fr)_auto]">
        <label className="block">
          <span className="text-sm font-semibold text-[var(--foreground)]">Operacao</span>
          <select
            value={nextFulfillment}
            onChange={(event) => setNextFulfillment(event.target.value)}
            className="mt-2 h-11 w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 text-sm outline-none focus:border-[var(--accent)]"
          >
            <option value="aguardando_fechamento">Aguardando fechamento</option>
            <option value="solicitado">Solicitado</option>
            <option value="recebido">Recebido</option>
            <option value="enviado">Enviado</option>
            {fulfillmentStatus === "cancelado" ? <option value="cancelado">Cancelado</option> : null}
          </select>
        </label>
        <label className="block">
          <span className="text-sm font-semibold text-[var(--foreground)]">Rastreio</span>
          <input
            value={nextTrackingCode}
            onChange={(event) => setNextTrackingCode(event.target.value)}
            className="mt-2 h-11 w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 text-sm outline-none focus:border-[var(--accent)]"
          />
        </label>
        <label className="block">
          <span className="text-sm font-semibold text-[var(--foreground)]">URL</span>
          <input
            value={nextTrackingUrl}
            onChange={(event) => setNextTrackingUrl(event.target.value)}
            className="mt-2 h-11 w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 text-sm outline-none focus:border-[var(--accent)]"
          />
        </label>
        <button
          type="button"
          disabled={isSubmitting || !canUpdateFulfillment}
          onClick={() => run(() => postJson(`/api/v1/admin/orders-v2/${orderId}/fulfillment`, {
            status: nextFulfillment,
            trackingCode: nextTrackingCode || null,
            trackingUrl: nextTrackingUrl || null,
          }))}
          className="mt-7 inline-flex h-11 items-center justify-center gap-2 rounded-md bg-[var(--accent)] px-4 text-sm font-black text-slate-950 hover:brightness-110 disabled:opacity-60"
        >
          {nextFulfillment === "enviado" ? <Send size={16} aria-hidden="true" /> : <PackageCheck size={16} aria-hidden="true" />}
          Atualizar
        </button>
      </div>

      {error ? <p className="mt-4 text-sm font-semibold text-red-300">{error}</p> : null}
    </section>
  );
}
