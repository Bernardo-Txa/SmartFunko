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
  const [message, setMessage] = useState("");
  const [notes, setNotes] = useState("");
  const [isRefundOpen, setIsRefundOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function copySummary() {
    await navigator.clipboard.writeText(
      `Pagamento ${paymentId} | Pedido ${orderNumber} | Cliente ${customerName} | Valor ${amount.toFixed(2)}`,
    );
  }

  async function refundPayment(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");
    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/v1/admin/payments/${paymentId}/refund`, {
        body: JSON.stringify({ notes: notes.trim() }),
        headers: { "content-type": "application/json" },
        method: "POST",
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error?.message ?? "Falha ao estornar pagamento");
      }

      setMessage("Estorno registrado.");
      setNotes("");
      setIsRefundOpen(false);
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
            onClick={() => {
              setError("");
              setMessage("");
              setIsRefundOpen((current) => !current);
            }}
            disabled={isSubmitting}
            className="inline-flex h-9 items-center justify-center gap-2 rounded-md border border-red-300 px-3 text-xs font-semibold text-red-200 hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RotateCcw size={14} aria-hidden="true" />
            Estornar
          </button>
        ) : null}
      </div>
      {isRefundOpen ? (
        <form
          onSubmit={refundPayment}
          className="grid max-w-xs gap-2 rounded-md border border-red-300/40 bg-red-500/10 p-3"
        >
          <p className="text-xs font-semibold text-red-100">
            Essa ação cria lançamento financeiro de reembolso e pode alterar o status do pedido.
          </p>
          <label className="block">
            <span className="text-xs font-semibold text-red-100">Justificativa</span>
            <textarea
              required
              minLength={3}
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              className="mt-1 min-h-20 w-full rounded-md border border-red-300/40 bg-[var(--background)] px-2 py-2 text-xs text-[var(--foreground)] outline-none focus:border-red-200"
            />
          </label>
          <div className="flex flex-wrap gap-2">
            <button
              type="submit"
              disabled={isSubmitting || notes.trim().length < 3}
              className="inline-flex h-9 items-center justify-center rounded-md bg-red-300 px-3 text-xs font-black text-red-950 hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? "Estornando..." : "Confirmar estorno"}
            </button>
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => {
                setNotes("");
                setIsRefundOpen(false);
              }}
              className="inline-flex h-9 items-center justify-center rounded-md border border-[var(--border)] px-3 text-xs font-semibold text-[var(--foreground)] hover:bg-[var(--surface-strong)] disabled:cursor-not-allowed disabled:opacity-60"
            >
              Cancelar
            </button>
          </div>
        </form>
      ) : null}
      {message ? <p className="text-xs font-semibold text-[var(--foreground)]">{message}</p> : null}
      {error ? <p className="text-xs font-semibold text-red-300">{error}</p> : null}
    </div>
  );
}
