"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CreditCard } from "lucide-react";
import { SmartButtonLoading } from "@/components/ui/smart-loading";
import { formatCurrency } from "@/lib/format";

const paymentMethods = [
  { label: "Pix", value: "pix" },
  { label: "Crédito", value: "credit_card" },
  { label: "Débito", value: "debit_card" },
  { label: "Dinheiro", value: "cash" },
  { label: "Manual", value: "manual" },
] as const;

function toDatetimeLocalValue(date: Date) {
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60_000);
  return local.toISOString().slice(0, 16);
}

export function PaymentCreateForm({
  customerId,
  orderId,
  orderTotal,
  paidAmount,
  pendingAmount,
}: {
  customerId: string;
  orderId: string;
  orderTotal: number;
  paidAmount: number;
  pendingAmount: number;
}) {
  const router = useRouter();
  const [amount, setAmount] = useState(pendingAmount > 0 ? pendingAmount.toFixed(2) : "0.00");
  const [feeAmount, setFeeAmount] = useState("0.00");
  const [method, setMethod] = useState<(typeof paymentMethods)[number]["value"]>("pix");
  const [paidAt, setPaidAt] = useState(toDatetimeLocalValue(new Date()));
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const numericAmount = Number(amount || 0);
  const numericFee = Number(feeAmount || 0);
  const netAmount = useMemo(() => Math.max(0, numericAmount - numericFee), [numericAmount, numericFee]);

  async function recordPayment(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");

    if (numericAmount <= 0) {
      setError("Informe um valor de pagamento maior que zero.");
      return;
    }

    if (numericAmount > pendingAmount) {
      setError(`O pagamento não pode ser maior que o saldo pendente de ${formatCurrency(pendingAmount)}.`);
      return;
    }

    if (numericFee > numericAmount) {
      setError("A taxa não pode ser maior que o valor bruto.");
      return;
    }

    if (Number.isNaN(new Date(paidAt).getTime())) {
      setError("Informe uma data de pagamento válida.");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/v1/admin/payments/manual", {
        body: JSON.stringify({
          amount: numericAmount,
          customerId,
          feeAmount: numericFee,
          method,
          notes: notes.trim() || null,
          orderId,
          paidAt: new Date(paidAt).toISOString(),
        }),
        headers: { "content-type": "application/json" },
        method: "POST",
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload?.error?.message ?? "Falha ao registrar pagamento.");
      }

      setMessage("Pagamento registrado.");
      setAmount("0.00");
      setFeeAmount("0.00");
      setNotes("");
      router.refresh();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Falha ao registrar pagamento.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h2 className="text-lg font-bold text-[var(--foreground)]">Registrar pagamento</h2>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Total {formatCurrency(orderTotal)} · pago {formatCurrency(paidAmount)} · pendente{" "}
            {formatCurrency(pendingAmount)}
          </p>
        </div>
        <div className="rounded-md border border-[var(--border)] bg-[var(--surface-strong)] px-3 py-2 text-sm">
          <span className="text-[var(--muted)]">Líquido</span>{" "}
          <strong className="text-[var(--foreground)]">{formatCurrency(netAmount)}</strong>
        </div>
      </div>
      <form onSubmit={recordPayment} className="mt-4 grid gap-4">
        <div className="grid gap-4 lg:grid-cols-[140px_150px_140px_190px_1fr]">
          <label className="block">
            <span className="text-sm font-semibold text-[var(--foreground)]">Método</span>
            <select
              value={method}
              onChange={(event) => setMethod(event.target.value as typeof method)}
              className="mt-2 h-11 w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 text-sm outline-none focus:border-[var(--accent)]"
            >
              {paymentMethods.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-sm font-semibold text-[var(--foreground)]">Valor</span>
            <input
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              max={pendingAmount}
              min={0.01}
              required
              step="0.01"
              type="number"
              className="mt-2 h-11 w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 text-sm outline-none focus:border-[var(--accent)]"
            />
          </label>
          <label className="block">
            <span className="text-sm font-semibold text-[var(--foreground)]">Taxa</span>
            <input
              value={feeAmount}
              onChange={(event) => setFeeAmount(event.target.value)}
              min={0}
              step="0.01"
              type="number"
              className="mt-2 h-11 w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 text-sm outline-none focus:border-[var(--accent)]"
            />
          </label>
          <label className="block">
            <span className="text-sm font-semibold text-[var(--foreground)]">Pago em</span>
            <input
              value={paidAt}
              onChange={(event) => setPaidAt(event.target.value)}
              required
              type="datetime-local"
              className="mt-2 h-11 w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 text-sm outline-none focus:border-[var(--accent)]"
            />
          </label>
          <label className="block">
            <span className="text-sm font-semibold text-[var(--foreground)]">Notas</span>
            <input
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              className="mt-2 h-11 w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 text-sm outline-none focus:border-[var(--accent)]"
            />
          </label>
        </div>
        <button
          disabled={isSubmitting || pendingAmount <= 0}
          className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-[var(--accent)] px-4 text-sm font-black text-[#020617] hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60 md:w-fit"
        >
          {isSubmitting ? (
            <SmartButtonLoading message="Registrando..." />
          ) : (
            <>
              <CreditCard size={16} aria-hidden="true" />
              Registrar pagamento
            </>
          )}
        </button>
      </form>
      {message ? <p className="mt-3 text-sm font-semibold text-[var(--foreground)]">{message}</p> : null}
      {error ? <p className="mt-3 text-sm font-semibold text-red-300">{error}</p> : null}
    </section>
  );
}
