"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";

export function RankingRefreshButton({ month, year }: { month: number; year: number }) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function refreshRanking() {
    if (!window.confirm("Recalcular o ranking pode alterar o snapshot salvo deste mês. Deseja continuar?")) {
      return;
    }

    setIsSubmitting(true);
    try {
      await fetch(`/api/v1/admin/rewards/ranking?year=${year}&month=${month}`, { method: "POST" });
      router.refresh();
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <button
      type="button"
      onClick={refreshRanking}
      disabled={isSubmitting}
      className="inline-flex h-10 items-center gap-2 rounded-md border border-[var(--border)] px-3 text-sm font-bold text-[var(--foreground)] hover:bg-[var(--surface-strong)] disabled:opacity-60"
    >
      <RefreshCw size={15} aria-hidden="true" />
      {isSubmitting ? "Atualizando..." : "Recalcular ranking"}
    </button>
  );
}
