"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarPlus } from "lucide-react";

type ApiResponse = {
  error?: {
    message?: string;
  };
};

export function OrderV2CompetenceForm() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function submit(formData: FormData) {
    setError("");
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/v1/admin/order-competencies-v2", {
        body: JSON.stringify({
          code: String(formData.get("code") ?? ""),
          endsOn: String(formData.get("endsOn") ?? ""),
          label: String(formData.get("label") ?? ""),
          startsOn: String(formData.get("startsOn") ?? ""),
        }),
        headers: { "content-type": "application/json" },
        method: "POST",
      });
      const payload = (await response.json()) as ApiResponse;

      if (!response.ok) {
        throw new Error(payload.error?.message ?? "Falha ao criar competencia");
      }

      router.refresh();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Falha ao criar competencia");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form action={submit} className="grid gap-3 md:grid-cols-[1fr_1fr_1fr_1fr_auto]">
      <input
        name="code"
        placeholder="2026-10"
        className="h-11 rounded-md border border-[var(--border)] bg-[var(--background)] px-3 text-sm outline-none focus:border-[var(--accent)]"
        required
      />
      <input
        name="label"
        placeholder="Outubro/2026"
        className="h-11 rounded-md border border-[var(--border)] bg-[var(--background)] px-3 text-sm outline-none focus:border-[var(--accent)]"
        required
      />
      <input
        name="startsOn"
        type="date"
        className="h-11 rounded-md border border-[var(--border)] bg-[var(--background)] px-3 text-sm outline-none focus:border-[var(--accent)]"
        required
      />
      <input
        name="endsOn"
        type="date"
        className="h-11 rounded-md border border-[var(--border)] bg-[var(--background)] px-3 text-sm outline-none focus:border-[var(--accent)]"
        required
      />
      <button
        type="submit"
        disabled={isSubmitting}
        className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-[var(--accent)] px-4 text-sm font-black text-slate-950 hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
      >
        <CalendarPlus size={17} aria-hidden="true" />
        Criar
      </button>
      {error ? <p className="text-sm font-semibold text-red-300 md:col-span-5">{error}</p> : null}
    </form>
  );
}
