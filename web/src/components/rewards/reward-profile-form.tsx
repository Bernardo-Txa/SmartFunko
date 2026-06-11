"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Save } from "lucide-react";
import { SmartButtonLoading } from "@/components/ui/smart-loading";

export function RewardProfileForm({
  publicNickname,
  showInRankings,
}: {
  publicNickname?: string | null;
  showInRankings: boolean;
}) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    setError("");
    setMessage("");
    setIsSubmitting(true);

    try {
      const formData = new FormData(form);
      const response = await fetch("/api/v1/me/rewards/profile", {
        body: JSON.stringify({
          publicNickname: String(formData.get("publicNickname") ?? "").trim() || null,
          showInRankings: formData.get("showInRankings") === "on",
        }),
        headers: { "content-type": "application/json" },
        method: "PATCH",
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error?.message ?? "Falha ao salvar perfil do clube");
      }

      setMessage("Perfil do clube atualizado.");
      router.refresh();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Falha ao salvar perfil do clube");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-3 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5">
      <h2 className="text-lg font-bold text-[var(--foreground)]">Perfil no ranking</h2>
      <label className="block">
        <span className="text-sm font-semibold text-[var(--foreground)]">Apelido público</span>
        <input
          name="publicNickname"
          defaultValue={publicNickname ?? ""}
          placeholder="Ex.: Caçador de Grails"
          className="mt-2 h-11 w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 text-sm outline-none focus:border-[var(--accent)]"
        />
      </label>
      <label className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--foreground)]">
        <input name="showInRankings" type="checkbox" defaultChecked={showInRankings} className="h-4 w-4 accent-[var(--accent)]" />
        Mostrar meu apelido nos rankings
      </label>
      {message ? <p className="text-sm font-semibold text-[var(--foreground)]">{message}</p> : null}
      {error ? <p className="text-sm font-semibold text-red-300">{error}</p> : null}
      <button
        disabled={isSubmitting}
        className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-[var(--accent)] px-4 text-sm font-black text-[#020617] hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isSubmitting ? <SmartButtonLoading message="Salvando..." /> : <><Save size={16} aria-hidden="true" />Salvar</>}
      </button>
    </form>
  );
}
