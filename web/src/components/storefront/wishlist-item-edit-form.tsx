"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Save } from "lucide-react";

type WishlistPriority = "low" | "medium" | "high";

const priorityOptions: Array<{ label: string; value: WishlistPriority }> = [
  { label: "Alta", value: "high" },
  { label: "Média", value: "medium" },
  { label: "Baixa", value: "low" },
];

export function WishlistItemEditForm({
  desiredPrice,
  itemId,
  notes,
  priority,
}: {
  desiredPrice: number | null;
  itemId: string;
  notes: string | null;
  priority: WishlistPriority;
}) {
  const router = useRouter();
  const [currentDesiredPrice, setCurrentDesiredPrice] = useState(
    desiredPrice === null ? "" : String(desiredPrice),
  );
  const [currentNotes, setCurrentNotes] = useState(notes ?? "");
  const [currentPriority, setCurrentPriority] = useState<WishlistPriority>(priority);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function saveWishlistItem(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");
    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/v1/me/wishlist/${itemId}`, {
        body: JSON.stringify({
          desiredPrice: currentDesiredPrice ? Number(currentDesiredPrice) : null,
          notes: currentNotes.trim() || null,
          priority: currentPriority,
        }),
        headers: { "content-type": "application/json" },
        method: "PATCH",
      });
      const payload = response.status === 204 ? null : await response.json();

      if (!response.ok) {
        throw new Error(payload?.error?.message ?? "Falha ao atualizar favorito");
      }

      setMessage("Favorito atualizado.");
      router.refresh();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Falha ao atualizar favorito");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={saveWishlistItem} className="grid gap-3">
      <div className="grid gap-3 sm:grid-cols-[140px_160px_1fr_auto] sm:items-end">
        <label className="block">
          <span className="text-xs font-bold text-[var(--muted)]">Prioridade</span>
          <select
            value={currentPriority}
            onChange={(event) => setCurrentPriority(event.target.value as WishlistPriority)}
            className="mt-1 h-10 w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 text-sm text-[var(--foreground)] outline-none focus:border-[var(--accent)]"
          >
            {priorityOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="text-xs font-bold text-[var(--muted)]">Preço desejado</span>
          <input
            value={currentDesiredPrice}
            onChange={(event) => setCurrentDesiredPrice(event.target.value)}
            min={0}
            step="0.01"
            type="number"
            className="mt-1 h-10 w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 text-sm text-[var(--foreground)] outline-none focus:border-[var(--accent)]"
          />
        </label>
        <label className="block">
          <span className="text-xs font-bold text-[var(--muted)]">Notas</span>
          <input
            value={currentNotes}
            onChange={(event) => setCurrentNotes(event.target.value)}
            className="mt-1 h-10 w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 text-sm text-[var(--foreground)] outline-none focus:border-[var(--accent)]"
          />
        </label>
        <button
          disabled={isSubmitting}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-[var(--accent)] px-3 text-sm font-black text-[#020617] hover:brightness-110 disabled:cursor-wait disabled:opacity-60"
        >
          <Save size={15} aria-hidden="true" />
          Salvar
        </button>
      </div>
      {message ? <p className="text-xs font-semibold text-[var(--foreground)]">{message}</p> : null}
      {error ? <p className="text-xs font-semibold text-red-300">{error}</p> : null}
    </form>
  );
}
