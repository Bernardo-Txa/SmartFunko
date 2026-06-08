"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Save } from "lucide-react";
import { SmartButtonLoading } from "@/components/ui/smart-loading";

function nullableText(formData: FormData, key: string) {
  const value = String(formData.get(key) ?? "").trim();
  return value.length > 0 ? value : null;
}

function nullableNumber(formData: FormData, key: string) {
  const value = String(formData.get(key) ?? "").trim();
  return value.length > 0 ? Number(value) : null;
}

function dateTime(formData: FormData, key: string) {
  const value = String(formData.get(key) ?? "").trim();
  return value.length > 0 ? new Date(value).toISOString() : null;
}

export function RaffleCampaignForm() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    setError("");
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/v1/admin/raffles", {
        body: JSON.stringify({
          description: nullableText(formData, "description"),
          drawAt: dateTime(formData, "drawAt"),
          endsAt: dateTime(formData, "endsAt"),
          maxNumbersPerCustomer: nullableNumber(formData, "maxNumbersPerCustomer"),
          numberEnd: Number(formData.get("numberEnd") ?? 100),
          numberStart: Number(formData.get("numberStart") ?? 1),
          pricePerNumber: Number(formData.get("pricePerNumber") ?? 0),
          prizeDescription: nullableText(formData, "prizeDescription"),
          prizeImageUrl: nullableText(formData, "prizeImageUrl"),
          prizeTitle: String(formData.get("prizeTitle") ?? "").trim(),
          reservationMinutes: Number(formData.get("reservationMinutes") ?? 15),
          rules: nullableText(formData, "rules"),
          slug: nullableText(formData, "slug"),
          startsAt: dateTime(formData, "startsAt"),
          title: String(formData.get("title") ?? "").trim(),
        }),
        headers: { "content-type": "application/json" },
        method: "POST",
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error?.message ?? "Falha ao criar rifa");
      }

      router.push(`/admin/rifas/${payload.data.id}`);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Falha ao criar rifa");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-5 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5">
      <div className="grid gap-4 md:grid-cols-2">
        <label className="block">
          <span className="text-sm font-semibold text-[var(--foreground)]">Titulo</span>
          <input name="title" required className="mt-2 h-11 w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 text-sm outline-none focus:border-[var(--accent)]" />
        </label>
        <label className="block">
          <span className="text-sm font-semibold text-[var(--foreground)]">Slug opcional</span>
          <input name="slug" className="mt-2 h-11 w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 text-sm outline-none focus:border-[var(--accent)]" />
        </label>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <label className="block md:col-span-2">
          <span className="text-sm font-semibold text-[var(--foreground)]">Premio</span>
          <input name="prizeTitle" required className="mt-2 h-11 w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 text-sm outline-none focus:border-[var(--accent)]" />
        </label>
        <label className="block">
          <span className="text-sm font-semibold text-[var(--foreground)]">Imagem do premio</span>
          <input name="prizeImageUrl" type="url" className="mt-2 h-11 w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 text-sm outline-none focus:border-[var(--accent)]" />
        </label>
      </div>
      <label className="block">
        <span className="text-sm font-semibold text-[var(--foreground)]">Descricao</span>
        <textarea name="description" className="mt-2 min-h-24 w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm outline-none focus:border-[var(--accent)]" />
      </label>
      <label className="block">
        <span className="text-sm font-semibold text-[var(--foreground)]">Descricao do premio</span>
        <textarea name="prizeDescription" className="mt-2 min-h-24 w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm outline-none focus:border-[var(--accent)]" />
      </label>
      <div className="grid gap-4 md:grid-cols-5">
        <label className="block">
          <span className="text-sm font-semibold text-[var(--foreground)]">Numero inicial</span>
          <input name="numberStart" type="number" min={1} defaultValue={1} required className="mt-2 h-11 w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 text-sm outline-none focus:border-[var(--accent)]" />
        </label>
        <label className="block">
          <span className="text-sm font-semibold text-[var(--foreground)]">Numero final</span>
          <input name="numberEnd" type="number" min={1} defaultValue={100} required className="mt-2 h-11 w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 text-sm outline-none focus:border-[var(--accent)]" />
        </label>
        <label className="block">
          <span className="text-sm font-semibold text-[var(--foreground)]">Preco por numero</span>
          <input name="pricePerNumber" type="number" min={0.01} step="0.01" required className="mt-2 h-11 w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 text-sm outline-none focus:border-[var(--accent)]" />
        </label>
        <label className="block">
          <span className="text-sm font-semibold text-[var(--foreground)]">Limite por cliente</span>
          <input name="maxNumbersPerCustomer" type="number" min={1} className="mt-2 h-11 w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 text-sm outline-none focus:border-[var(--accent)]" />
        </label>
        <label className="block">
          <span className="text-sm font-semibold text-[var(--foreground)]">Reserva em minutos</span>
          <input name="reservationMinutes" type="number" min={1} defaultValue={15} required className="mt-2 h-11 w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 text-sm outline-none focus:border-[var(--accent)]" />
        </label>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <label className="block">
          <span className="text-sm font-semibold text-[var(--foreground)]">Inicio</span>
          <input name="startsAt" type="datetime-local" className="mt-2 h-11 w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 text-sm outline-none focus:border-[var(--accent)]" />
        </label>
        <label className="block">
          <span className="text-sm font-semibold text-[var(--foreground)]">Encerramento</span>
          <input name="endsAt" type="datetime-local" className="mt-2 h-11 w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 text-sm outline-none focus:border-[var(--accent)]" />
        </label>
        <label className="block">
          <span className="text-sm font-semibold text-[var(--foreground)]">Sorteio</span>
          <input name="drawAt" type="datetime-local" className="mt-2 h-11 w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 text-sm outline-none focus:border-[var(--accent)]" />
        </label>
      </div>
      <label className="block">
        <span className="text-sm font-semibold text-[var(--foreground)]">Regulamento</span>
        <textarea name="rules" className="mt-2 min-h-32 w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm outline-none focus:border-[var(--accent)]" />
      </label>
      {error ? <p className="text-sm font-semibold text-red-300">{error}</p> : null}
      <button disabled={isSubmitting} className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-[var(--accent)] px-4 text-sm font-black text-[#020617] hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60 md:w-fit">
        {isSubmitting ? <SmartButtonLoading message="Criando..." /> : <><Save size={16} aria-hidden="true" />Criar rifa</>}
      </button>
    </form>
  );
}
