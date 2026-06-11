"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function RankingEntryActions({
  entryId,
  rewardNotes,
  rewardStatus,
}: {
  entryId: string;
  rewardNotes?: string | null;
  rewardStatus: string;
}) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    setError("");
    setIsSubmitting(true);

    try {
      const formData = new FormData(form);
      const response = await fetch(`/api/v1/admin/rewards/ranking/entries/${entryId}`, {
        body: JSON.stringify({
          rewardNotes: String(formData.get("rewardNotes") ?? "").trim() || null,
          rewardStatus: String(formData.get("rewardStatus") ?? "pending"),
        }),
        headers: { "content-type": "application/json" },
        method: "PATCH",
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error?.message ?? "Falha ao atualizar brinde");
      }

      router.refresh();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Falha ao atualizar brinde");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-2">
      <select
        name="rewardStatus"
        defaultValue={rewardStatus}
        className="h-9 rounded-md border border-[var(--border)] bg-[var(--background)] px-2 text-xs outline-none focus:border-[var(--accent)]"
      >
        <option value="none">Sem brinde</option>
        <option value="pending">Pendente</option>
        <option value="delivered">Entregue</option>
        <option value="cancelled">Cancelado</option>
      </select>
      <input
        name="rewardNotes"
        defaultValue={rewardNotes ?? ""}
        placeholder="Observação"
        className="h-9 rounded-md border border-[var(--border)] bg-[var(--background)] px-2 text-xs outline-none focus:border-[var(--accent)]"
      />
      <button
        disabled={isSubmitting}
        className="h-9 rounded-md bg-[var(--accent)] px-3 text-xs font-black text-[#020617] hover:brightness-110 disabled:opacity-60"
      >
        {isSubmitting ? "Salvando..." : "Salvar brinde"}
      </button>
      {error ? <p className="text-xs font-semibold text-red-300">{error}</p> : null}
    </form>
  );
}
