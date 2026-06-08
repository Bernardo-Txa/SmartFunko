"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Save } from "lucide-react";
import { SmartButtonLoading } from "@/components/ui/smart-loading";
import { inventoryStatusOptions } from "@/lib/status-labels";

type InventoryAdjustItem = {
  id: string;
  landed_cost: number | string | null;
  location: string | null;
  purchase_cost: number | string | null;
  status: string;
};

type ApiPayload = {
  error?: {
    message?: string;
  };
};

function nullableNumber(value: FormDataEntryValue | null) {
  const text = String(value ?? "").trim();
  return text ? Number(text) : null;
}

function nullableText(value: FormDataEntryValue | null) {
  const text = String(value ?? "").trim();
  return text || null;
}

export function InventoryAdjustForm({ item }: { item: InventoryAdjustItem }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function submitAdjust(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);

    try {
      const response = await fetch(`/api/v1/admin/inventory/${item.id}/adjust`, {
        body: JSON.stringify({
          landedCost: nullableNumber(formData.get("landedCost")),
          location: nullableText(formData.get("location")),
          notes: String(formData.get("notes") ?? "").trim(),
          purchaseCost: nullableNumber(formData.get("purchaseCost")),
          status: String(formData.get("status") ?? item.status),
        }),
        headers: { "content-type": "application/json" },
        method: "POST",
      });
      const body = (await response.json()) as ApiPayload;

      if (!response.ok) {
        throw new Error(body.error?.message ?? "Falha ao ajustar estoque");
      }

      setMessage("Ajuste registrado.");
      router.refresh();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Falha ao ajustar estoque");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function releaseReservation() {
    setError("");
    setMessage("");
    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/v1/admin/inventory/${item.id}/release`, {
        method: "POST",
      });
      const body = (await response.json()) as ApiPayload;

      if (!response.ok) {
        throw new Error(body.error?.message ?? "Falha ao liberar reserva");
      }

      setMessage("Reserva liberada.");
      router.refresh();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Falha ao liberar reserva");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5">
      <h2 className="text-lg font-bold text-[var(--foreground)]">Ações manuais</h2>
      <form onSubmit={submitAdjust} className="mt-4 grid gap-4">
        <div className="grid gap-4 md:grid-cols-2">
          <label className="block">
            <span className="text-sm font-semibold text-[var(--foreground)]">Status</span>
            <select
              name="status"
              defaultValue={item.status}
              className="mt-2 h-11 w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 text-sm outline-none focus:border-[var(--accent)]"
            >
              {inventoryStatusOptions.map(({ label, value }) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-sm font-semibold text-[var(--foreground)]">Localização</span>
            <input
              name="location"
              defaultValue={item.location ?? ""}
              className="mt-2 h-11 w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 text-sm outline-none focus:border-[var(--accent)]"
            />
          </label>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="block">
            <span className="text-sm font-semibold text-[var(--foreground)]">Custo compra</span>
            <input
              name="purchaseCost"
              defaultValue={item.purchase_cost ?? ""}
              min={0}
              step="0.01"
              type="number"
              className="mt-2 h-11 w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 text-sm outline-none focus:border-[var(--accent)]"
            />
          </label>
          <label className="block">
            <span className="text-sm font-semibold text-[var(--foreground)]">Custo final</span>
            <input
              name="landedCost"
              defaultValue={item.landed_cost ?? ""}
              min={0}
              step="0.01"
              type="number"
              className="mt-2 h-11 w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 text-sm outline-none focus:border-[var(--accent)]"
            />
          </label>
        </div>
        <label className="block">
          <span className="text-sm font-semibold text-[var(--foreground)]">Justificativa</span>
          <textarea
            name="notes"
            required
            className="mt-2 min-h-24 w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
          />
        </label>
        <div className="flex flex-wrap gap-3">
          <button
            disabled={isSubmitting}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-[var(--accent)] px-4 text-sm font-black text-[#020617] hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? (
              <SmartButtonLoading message="Registrando..." />
            ) : (
              <>
                <Save size={16} aria-hidden="true" />
                Registrar ajuste
              </>
            )}
          </button>
          {item.status === "reserved" ? (
            <button
              type="button"
              onClick={releaseReservation}
              disabled={isSubmitting}
              className="h-11 rounded-md border border-[var(--border)] px-4 text-sm font-semibold text-[var(--foreground)] hover:bg-[var(--surface-strong)] disabled:cursor-not-allowed disabled:opacity-60"
            >
              Liberar reserva
            </button>
          ) : null}
        </div>
      </form>
      {message ? <p className="mt-4 text-sm font-semibold text-[var(--foreground)]">{message}</p> : null}
      {error ? <p className="mt-4 text-sm font-semibold text-red-300">{error}</p> : null}
    </section>
  );
}
