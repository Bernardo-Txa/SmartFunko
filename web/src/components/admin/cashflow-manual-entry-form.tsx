"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { SmartButtonLoading } from "@/components/ui/smart-loading";
import { cashEntryCategoryOptions, cashEntryTypeOptions } from "@/lib/status-labels";

export function CashflowManualEntryForm() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function submitEntry(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");
    setIsSubmitting(true);

    const form = event.currentTarget;
    const formData = new FormData(form);
    const occurredAt = String(formData.get("occurredAt") ?? "");

    try {
      const response = await fetch("/api/v1/admin/cashflow/manual-entry", {
        body: JSON.stringify({
          amount: Number(formData.get("amount") ?? 0),
          category: String(formData.get("category") ?? "manual_adjustment"),
          description: String(formData.get("description") ?? "").trim(),
          occurredAt: occurredAt ? new Date(occurredAt).toISOString() : undefined,
          type: String(formData.get("type") ?? "expense"),
        }),
        headers: { "content-type": "application/json" },
        method: "POST",
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error?.message ?? "Falha ao criar lancamento");
      }

      form.reset();
      setMessage("Lancamento criado.");
      router.refresh();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Falha ao criar lancamento");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5">
      <h2 className="text-lg font-bold text-[var(--foreground)]">Lançamento manual</h2>
      <form onSubmit={submitEntry} className="mt-4 grid gap-4 md:grid-cols-[150px_210px_140px_150px_1fr_auto] md:items-end">
        <label className="block">
          <span className="text-sm font-semibold text-[var(--foreground)]">Tipo</span>
          <select
            name="type"
            defaultValue="expense"
            className="mt-2 h-10 w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 text-sm outline-none focus:border-[var(--accent)]"
          >
            {cashEntryTypeOptions.map(({ label, value }) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="text-sm font-semibold text-[var(--foreground)]">Categoria</span>
          <select
            name="category"
            defaultValue="manual_adjustment"
            className="mt-2 h-10 w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 text-sm outline-none focus:border-[var(--accent)]"
          >
            {cashEntryCategoryOptions.map(({ label, value }) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="text-sm font-semibold text-[var(--foreground)]">Valor</span>
          <input
            name="amount"
            min={0.01}
            required
            step="0.01"
            type="number"
            className="mt-2 h-10 w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 text-sm outline-none focus:border-[var(--accent)]"
          />
        </label>
        <label className="block">
          <span className="text-sm font-semibold text-[var(--foreground)]">Data</span>
          <input
            name="occurredAt"
            type="datetime-local"
            className="mt-2 h-10 w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 text-sm outline-none focus:border-[var(--accent)]"
          />
        </label>
        <label className="block">
          <span className="text-sm font-semibold text-[var(--foreground)]">Descrição</span>
          <input
            name="description"
            required
            className="mt-2 h-10 w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 text-sm outline-none focus:border-[var(--accent)]"
          />
        </label>
        <button
          disabled={isSubmitting}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-[var(--accent)] px-4 text-sm font-black text-[#020617] hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting ? (
            <SmartButtonLoading message="Criando..." />
          ) : (
            <>
              <Plus size={16} aria-hidden="true" />
              Criar
            </>
          )}
        </button>
      </form>
      {message ? <p className="mt-3 text-sm font-semibold text-[var(--foreground)]">{message}</p> : null}
      {error ? <p className="mt-3 text-sm font-semibold text-red-300">{error}</p> : null}
    </section>
  );
}
