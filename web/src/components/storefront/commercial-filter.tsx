import Link from "next/link";
import { Search, SlidersHorizontal } from "lucide-react";
import type { CatalogCategory, CatalogProductSort, CatalogSupplier } from "@/lib/catalog";

const sorts: Array<{ label: string; value: CatalogProductSort }> = [
  { label: "Pronta-entrega primeiro", value: "ready_first" },
  { label: "Novidades", value: "newest" },
  { label: "Menor preço", value: "price_asc" },
  { label: "Maior preço", value: "price_desc" },
  { label: "Specials primeiro", value: "specials_first" },
  { label: "Nome", value: "name" },
];

export function CommercialFilter({
  categories,
  currentCategory,
  currentSort,
  currentSupplier,
  pathname,
  query,
  suppliers,
}: {
  categories: CatalogCategory[];
  currentCategory: string;
  currentSort: CatalogProductSort;
  currentSupplier: string;
  pathname: string;
  query: string;
  suppliers: CatalogSupplier[];
}) {
  return (
    <form className="rounded-xl border border-cyan-400/20 bg-[#030816]/88 p-3 shadow-[0_18px_44px_rgba(2,6,23,0.2)]">
      <div className="grid gap-3 lg:grid-cols-[minmax(220px,1.3fr)_minmax(150px,0.8fr)_minmax(150px,0.8fr)_minmax(170px,0.8fr)_auto]">
        <label className="relative block">
          <span className="sr-only">Buscar produto</span>
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
            size={17}
          />
          <input
            defaultValue={query}
            name="q"
            type="search"
            placeholder="Buscar nesta vitrine"
            className="h-11 w-full rounded-lg border border-cyan-400/20 bg-[#071124] px-10 text-sm text-slate-100 outline-none focus:border-cyan-300/70"
          />
        </label>

        <label className="block">
          <span className="sr-only">Categoria</span>
          <select
            name="category"
            defaultValue={currentCategory}
            className="h-11 w-full rounded-lg border border-cyan-400/20 bg-[#071124] px-3 text-sm font-semibold text-slate-100 outline-none focus:border-cyan-300/70"
          >
            <option value="">Categorias</option>
            {categories.map((category) => (
              <option key={category.name} value={category.name}>
                {category.name}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="sr-only">Fornecedor</span>
          <select
            name="supplier"
            defaultValue={currentSupplier}
            className="h-11 w-full rounded-lg border border-cyan-400/20 bg-[#071124] px-3 text-sm font-semibold text-slate-100 outline-none focus:border-cyan-300/70"
          >
            <option value="">Fornecedores</option>
            {suppliers.map((supplier) => (
              <option key={supplier.id} value={supplier.slug}>
                {supplier.name}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="sr-only">Ordenação</span>
          <select
            name="sort"
            defaultValue={currentSort}
            className="h-11 w-full rounded-lg border border-cyan-400/20 bg-[#071124] px-3 text-sm font-semibold text-slate-100 outline-none focus:border-cyan-300/70"
          >
            {sorts.map((sort) => (
              <option key={sort.value} value={sort.value}>
                {sort.label}
              </option>
            ))}
          </select>
        </label>

        <div className="grid grid-cols-[1fr_auto] gap-2">
          <button className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-[var(--yellow)] px-4 text-sm font-black text-[#020617] hover:brightness-110">
            <SlidersHorizontal size={16} aria-hidden="true" />
            Filtrar
          </button>
          <Link
            href={pathname}
            prefetch={false}
            className="inline-flex h-11 items-center justify-center rounded-lg border border-cyan-400/20 px-3 text-sm font-bold text-slate-300 hover:bg-cyan-400/10"
          >
            Limpar
          </Link>
        </div>
      </div>
    </form>
  );
}

