import type { Metadata } from "next";
import { Search } from "lucide-react";
import { ProductCard } from "@/components/product/product-card";
import { franchises, products } from "@/lib/mock-data";

export const metadata: Metadata = {
  title: "Catalogo",
};

export default function CatalogPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-[var(--foreground)]">Catalogo</h1>
          <p className="mt-2 text-sm text-[var(--muted)]">
            Produtos preparados para atendimento pelo WhatsApp.
          </p>
        </div>
        <label className="flex h-11 min-w-0 items-center gap-2 rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 md:w-80">
          <Search size={17} className="text-[var(--muted)]" aria-hidden="true" />
          <input
            type="search"
            placeholder="Buscar produto"
            className="min-w-0 flex-1 bg-transparent text-sm outline-none"
          />
        </label>
      </div>

      <div className="mb-6 flex gap-2 overflow-x-auto pb-2">
        <button className="h-9 rounded-full bg-[var(--yellow)] px-4 text-sm font-black text-[#020617]">
          Todos
        </button>
        {franchises.map((franchise) => (
          <button
            key={franchise.id}
            className="h-9 rounded-full border border-[var(--border)] bg-[var(--surface)] px-4 text-sm font-bold text-[var(--foreground)] hover:bg-cyan-400/15"
          >
            {franchise.name}
          </button>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {products.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </div>
  );
}
