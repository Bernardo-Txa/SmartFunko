"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Save } from "lucide-react";
import { SmartButtonLoading } from "@/components/ui/smart-loading";
import { purchaseBatchTypeOptions } from "@/lib/status-labels";

type SupplierOption = {
  id: string;
  name: string;
};

function numberField(formData: FormData, key: string) {
  return Number(formData.get(key) ?? 0);
}

function nullableText(formData: FormData, key: string) {
  const value = String(formData.get(key) ?? "").trim();
  return value.length > 0 ? value : null;
}

export function PurchaseBatchCreateForm({ suppliers }: { suppliers: SupplierOption[] }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    setError("");
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/v1/admin/purchase-batches", {
        body: JSON.stringify({
          description: nullableText(formData, "description"),
          estimatedPurchaseCost: numberField(formData, "estimatedPurchaseCost"),
          estimatedShippingCost: numberField(formData, "estimatedShippingCost"),
          estimatedTaxesCost: numberField(formData, "estimatedTaxesCost"),
          estimatedTotalCost: numberField(formData, "estimatedTotalCost"),
          name: String(formData.get("name") ?? "").trim(),
          notes: nullableText(formData, "notes"),
          supplierId: nullableText(formData, "supplierId"),
          type: String(formData.get("type") ?? "national"),
        }),
        headers: { "content-type": "application/json" },
        method: "POST",
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error?.message ?? "Falha ao criar lote");
      }

      router.push(`/admin/lotes/${payload.data.id}`);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Falha ao criar lote");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-5 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5">
      <div className="grid gap-4 md:grid-cols-2">
        <label className="block">
          <span className="text-sm font-semibold text-[var(--foreground)]">Nome</span>
          <input
            name="name"
            required
            className="mt-2 h-11 w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 text-sm outline-none focus:border-[var(--accent)]"
          />
        </label>
        <label className="block">
          <span className="text-sm font-semibold text-[var(--foreground)]">Tipo</span>
          <select
            name="type"
            defaultValue="national"
            className="mt-2 h-11 w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 text-sm outline-none focus:border-[var(--accent)]"
          >
            {purchaseBatchTypeOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>
      <label className="block">
        <span className="text-sm font-semibold text-[var(--foreground)]">Fornecedor</span>
        <select
          name="supplierId"
          defaultValue=""
          className="mt-2 h-11 w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 text-sm outline-none focus:border-[var(--accent)]"
        >
          <option value="">Sem fornecedor definido</option>
          {suppliers.map((supplier) => (
            <option key={supplier.id} value={supplier.id}>
              {supplier.name}
            </option>
          ))}
        </select>
      </label>
      <label className="block">
        <span className="text-sm font-semibold text-[var(--foreground)]">Descricao</span>
        <textarea
          name="description"
          className="mt-2 min-h-24 w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
        />
      </label>
      <div className="grid gap-4 md:grid-cols-4">
        <label className="block">
          <span className="text-sm font-semibold text-[var(--foreground)]">Compra estimada</span>
          <input
            name="estimatedPurchaseCost"
            type="number"
            min={0}
            step="0.01"
            defaultValue={0}
            className="mt-2 h-11 w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 text-sm outline-none focus:border-[var(--accent)]"
          />
        </label>
        <label className="block">
          <span className="text-sm font-semibold text-[var(--foreground)]">Frete estimado</span>
          <input
            name="estimatedShippingCost"
            type="number"
            min={0}
            step="0.01"
            defaultValue={0}
            className="mt-2 h-11 w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 text-sm outline-none focus:border-[var(--accent)]"
          />
        </label>
        <label className="block">
          <span className="text-sm font-semibold text-[var(--foreground)]">Taxas estimadas</span>
          <input
            name="estimatedTaxesCost"
            type="number"
            min={0}
            step="0.01"
            defaultValue={0}
            className="mt-2 h-11 w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 text-sm outline-none focus:border-[var(--accent)]"
          />
        </label>
        <label className="block">
          <span className="text-sm font-semibold text-[var(--foreground)]">Total estimado</span>
          <input
            name="estimatedTotalCost"
            type="number"
            min={0}
            step="0.01"
            defaultValue={0}
            className="mt-2 h-11 w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 text-sm outline-none focus:border-[var(--accent)]"
          />
        </label>
      </div>
      <label className="block">
        <span className="text-sm font-semibold text-[var(--foreground)]">Notas internas</span>
        <textarea
          name="notes"
          className="mt-2 min-h-24 w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
        />
      </label>
      {error ? <p className="text-sm font-semibold text-red-300">{error}</p> : null}
      <button
        disabled={isSubmitting}
        className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-[var(--accent)] px-4 text-sm font-black text-[#020617] hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60 md:w-auto"
      >
        {isSubmitting ? (
          <SmartButtonLoading message="Criando..." />
        ) : (
          <>
            <Save size={16} aria-hidden="true" />
            Criar lote
          </>
        )}
      </button>
    </form>
  );
}
