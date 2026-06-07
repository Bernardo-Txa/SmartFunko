"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Copy, RotateCcw } from "lucide-react";

type PaymentActionsProps = {
  amount: number;
  canRefund: boolean;
  customerName: string;
  orderNumber: string;
  paymentId: string;
};

export function PaymentActions({
  amount,
  canRefund,
  customerName,
  orderNumber,
  paymentId,
}: PaymentActionsProps) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function copySummary() {
    await navigator.clipboard.writeText(
      `Pagamento ${paymentId} | Pedido ${orderNumber} | Cliente ${customerName} | Valor ${amount.toFixed(2)}`,
    );
  }

  async function refundPayment() {
    const notes = window.prompt("Informe a justificativa do estorno");

    if (!notes?.trim()) {
      return;
    }

    setError("");
    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/v1/admin/payments/${paymentId}/refund`, {
        body: JSON.stringify({ notes }),
        headers: { "content-type": "application/json" },
        method: "POST",
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error?.message ?? "Falha ao estornar pagamento");
      }

      router.refresh();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Falha ao estornar pagamento");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="grid gap-2">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={copySummary}
          className="inline-flex h-9 items-center justify-center gap-2 rounded-md border border-[var(--border)] px-3 text-xs font-semibold text-[var(--foreground)] hover:bg-[var(--surface-strong)]"
        >
          <Copy size={14} aria-hidden="true" />
          Copiar
        </button>
        {canRefund ? (
          <button
            type="button"
            onClick={refundPayment}
            disabled={isSubmitting}
            className="inline-flex h-9 items-center justify-center gap-2 rounded-md border border-red-300 px-3 text-xs font-semibold text-red-200 hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RotateCcw size={14} aria-hidden="true" />
            {isSubmitting ? "Estornando..." : "Estornar"}
          </button>
        ) : null}
      </div>
      {error ? <p className="text-xs font-semibold text-red-300">{error}</p> : null}
    </div>
  );
}
