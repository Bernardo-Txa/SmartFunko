"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Save, X } from "lucide-react";
import { SmartButtonLoading } from "@/components/ui/smart-loading";

type WishlistPriority = "low" | "medium" | "high";

const priorityOptions: Array<{ label: string; value: WishlistPriority }> = [
  { label: "Alta", value: "high" },
  { label: "Média", value: "medium" },
  { label: "Baixa", value: "low" },
];

export function WishlistItemEditForm({
  itemId,
  notes,
  priority,
}: {
  itemId: string;
  notes: string | null;
  priority: WishlistPriority;
}) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [currentNotes, setCurrentNotes] = useState(notes ?? "");
  const [currentPriority, setCurrentPriority] = useState<WishlistPriority>(priority);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  function resetForm() {
    setCurrentNotes(notes ?? "");
    setCurrentPriority(priority);
    setError("");
    setMessage("");
  }

  async function saveWishlistItem(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");
    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/v1/me/wishlist/${itemId}`, {
        body: JSON.stringify({
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
      setIsEditing(false);
      router.refresh();
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Não foi possível atualizar este desejo agora.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!isEditing) {
    return (
      <button
        type="button"
        onClick={() => {
          resetForm();
          setIsEditing(true);
        }}
        className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-cyan-300/24 px-4 text-sm font-black text-slate-100 hover:bg-cyan-400/12"
      >
        <Pencil size={16} aria-hidden="true" />
        Editar desejo
      </button>
    );
  }

  return (
    <form
      onSubmit={saveWishlistItem}
      className="w-full rounded-xl border border-cyan-300/18 bg-slate-950/70 p-3 sm:min-w-[420px]"
    >
      <div className="grid gap-3 sm:grid-cols-2">
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
          <span className="text-xs font-bold text-[var(--muted)]">Notas</span>
          <input
            value={currentNotes}
            onChange={(event) => setCurrentNotes(event.target.value)}
            className="mt-1 h-10 w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 text-sm text-[var(--foreground)] outline-none focus:border-[var(--accent)]"
          />
        </label>
      </div>
      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <button
          disabled={isSubmitting}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-[var(--accent)] px-3 text-sm font-black text-[#020617] hover:brightness-110 disabled:cursor-wait disabled:opacity-60"
        >
          {isSubmitting ? (
            <SmartButtonLoading message="Salvando..." />
          ) : (
            <>
              <Save size={15} aria-hidden="true" />
              Salvar
            </>
          )}
        </button>
        <button
          type="button"
          disabled={isSubmitting}
          onClick={() => {
            resetForm();
            setIsEditing(false);
          }}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-[var(--border)] px-3 text-sm font-black text-slate-200 hover:bg-slate-800 disabled:cursor-wait disabled:opacity-60"
        >
          <X size={15} aria-hidden="true" />
          Cancelar
        </button>
      </div>
      {message ? <p className="mt-2 text-xs font-semibold text-[var(--foreground)]">{message}</p> : null}
      {error ? <p className="text-xs font-semibold text-red-300">{error}</p> : null}
    </form>
  );
}
