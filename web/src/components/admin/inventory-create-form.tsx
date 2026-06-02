"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import {
  ProductVariantSearchSelect,
  type ProductVariantSearchOption,
} from "@/components/admin/product-variant-search-select";

export function InventoryCreateForm() {
  const router = useRouter();
  const [selectedVariant, setSelectedVariant] = useState<ProductVariantSearchOption | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);

    try {
      if (!selectedVariant) {
        throw new Error("Selecione um produto");
      }

      const response = await fetch("/api/v1/admin/inventory", {
        body: JSON.stringify({
          landedCost: Number(formData.get("landedCost") || 0) || null,
          location: String(formData.get("location") ?? "") || null,
          notes: String(formData.get("notes") ?? "") || null,
          productVariantId: selectedVariant.id,
          purchaseCost: Number(formData.get("purchaseCost") || 0) || null,
          sku: String(formData.get("sku") ?? ""),
          status: String(formData.get("status") ?? "available"),
        }),
        headers: { "content-type": "application/json" },
        method: "POST",
      });
      const body = await response.json();

      if (!response.ok) {
        throw new Error(body.error?.message ?? "Falha ao criar unidade");
      }

      event.currentTarget.reset();
      setSelectedVariant(null);
      setMessage("Unidade de estoque criada.");
      router.refresh();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Falha ao criar unidade");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5">
      <h2 className="text-lg font-bold text-[var(--foreground)]">Adicionar unidade</h2>
      <form onSubmit={handleSubmit} className="mt-4 grid gap-4">
        <div className="grid gap-4 md:grid-cols-[1.5fr_1fr_1fr]">
          <ProductVariantSearchSelect
            name="productVariantId"
            selected={selectedVariant}
            onSelect={setSelectedVariant}
          />
          <label className="block">
            <span className="text-sm font-semibold text-[var(--foreground)]">SKU unidade</span>
            <input
              name="sku"
              required
              className="mt-2 h-11 w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 text-sm outline-none focus:border-[var(--accent)]"
            />
          </label>
          <label className="block">
            <span className="text-sm font-semibold text-[var(--foreground)]">Status</span>
            <select
              name="status"
              defaultValue="available"
              className="mt-2 h-11 w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 text-sm outline-none focus:border-[var(--accent)]"
            >
              <option value="available">Disponivel</option>
              <option value="in_transit">Em transito</option>
              <option value="unavailable">Indisponivel</option>
              <option value="damaged">Avariado</option>
            </select>
          </label>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          <label className="block">
            <span className="text-sm font-semibold text-[var(--foreground)]">Local</span>
            <input
              name="location"
              className="mt-2 h-11 w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 text-sm outline-none focus:border-[var(--accent)]"
            />
          </label>
          <label className="block">
            <span className="text-sm font-semibold text-[var(--foreground)]">Custo compra</span>
            <input
              name="purchaseCost"
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
              min={0}
              step="0.01"
              type="number"
              className="mt-2 h-11 w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 text-sm outline-none focus:border-[var(--accent)]"
            />
          </label>
        </div>
        <label className="block">
          <span className="text-sm font-semibold text-[var(--foreground)]">Notas internas</span>
          <textarea
            name="notes"
            className="mt-2 min-h-20 w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
          />
        </label>
        {message ? <p className="text-sm font-semibold text-[var(--foreground)]">{message}</p> : null}
        {error ? <p className="text-sm font-semibold text-red-700">{error}</p> : null}
        <button
          disabled={isSubmitting}
          className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-[var(--accent)] px-4 text-sm font-black text-[#020617] hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60 md:w-auto"
        >
          <Plus size={16} />
          {isSubmitting ? "Criando..." : "Adicionar unidade"}
        </button>
      </form>
    </section>
  );
}
