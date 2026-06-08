"use client";

import Link from "next/link";
import { useState } from "react";
import { Search, SlidersHorizontal } from "lucide-react";
import { SmartButtonLoading } from "@/components/ui/smart-loading";
import type {
  CatalogCategory,
  CatalogProductFilter,
  CatalogProductSort,
  CatalogSupplier,
} from "@/lib/catalog";

type Props = {
  categories: CatalogCategory[];
  currentCategory: string;
  currentFilter: CatalogProductFilter;
  currentSort: CatalogProductSort;
  currentSubcategory: string;
  currentSupplier: string;
  query: string;
  suppliers: CatalogSupplier[];
};

const filters: Array<{ label: string; value: CatalogProductFilter }> = [
  { label: "Todos", value: "all" },
  { label: "Pronta-entrega", value: "ready" },
  { label: "Pré-venda", value: "preorder" },
  { label: "Encomendas", value: "order" },
  { label: "Especiais", value: "specials" },
  { label: "Novidades", value: "new" },
];

const sorts: Array<{ label: string; value: CatalogProductSort }> = [
  { label: "Pronta-entrega primeiro", value: "ready_first" },
  { label: "Novidades", value: "newest" },
  { label: "Menor preço", value: "price_asc" },
  { label: "Maior preço", value: "price_desc" },
  { label: "Specials primeiro", value: "specials_first" },
  { label: "Nome", value: "name" },
];

export function CatalogCategoryFilter({
  categories,
  currentCategory,
  currentFilter,
  currentSort,
  currentSubcategory,
  currentSupplier,
  query,
  suppliers,
}: Props) {
  const [selectedCategoryName, setSelectedCategoryName] = useState(currentCategory);
  const [selectedSubcategoryName, setSelectedSubcategoryName] = useState(currentSubcategory);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const activeCategory = categories.find((category) => category.name === selectedCategoryName);
  const subcategoryOptions = activeCategory?.subcategories ?? [];
  const hasSelectedCategory = Boolean(activeCategory);

  return (
    <form
      onSubmit={() => setIsSubmitting(true)}
      className="rounded-xl border border-cyan-400/20 bg-[#030816]/88 p-3 shadow-[0_18px_44px_rgba(2,6,23,0.2)]"
    >
      <div className="grid gap-3 lg:grid-cols-[minmax(220px,1.4fr)_minmax(150px,0.8fr)_minmax(150px,0.8fr)_minmax(150px,0.8fr)_minmax(150px,0.7fr)_minmax(160px,0.7fr)_auto]">
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
            placeholder="Buscar produto"
            className="h-11 w-full rounded-lg border border-cyan-400/20 bg-[#071124] px-10 text-sm text-slate-100 outline-none focus:border-cyan-300/70"
          />
        </label>

        <label className="block">
          <span className="sr-only">Categoria</span>
          <select
            name="category"
            value={selectedCategoryName}
            onChange={(event) => {
              setSelectedCategoryName(event.target.value);
              setSelectedSubcategoryName("");
            }}
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

        <label className="block">
          <span className="sr-only">Linha</span>
          <select
            name="subcategory"
            value={hasSelectedCategory ? selectedSubcategoryName : ""}
            disabled={!hasSelectedCategory}
            onChange={(event) => setSelectedSubcategoryName(event.target.value)}
            className="h-11 w-full rounded-lg border border-cyan-400/20 bg-[#071124] px-3 text-sm font-semibold text-slate-100 outline-none focus:border-cyan-300/70 disabled:cursor-not-allowed disabled:text-slate-500"
          >
            <option value="">{hasSelectedCategory ? "Linhas" : "Escolha categoria"}</option>
            {subcategoryOptions.map((item) => (
              <option key={item.name} value={item.name}>
                {item.name}
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
          <span className="sr-only">Vitrine</span>
          <select
            name="filter"
            defaultValue={currentFilter}
            className="h-11 w-full rounded-lg border border-cyan-400/20 bg-[#071124] px-3 text-sm font-semibold text-slate-100 outline-none focus:border-cyan-300/70"
          >
            {filters.map((filter) => (
              <option key={filter.value} value={filter.value}>
                {filter.label}
              </option>
            ))}
          </select>
        </label>

        <div className="grid grid-cols-[1fr_auto] gap-2">
          <button
            disabled={isSubmitting}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-[var(--yellow)] px-4 text-sm font-black text-[#020617] hover:brightness-110 disabled:cursor-wait disabled:opacity-70"
          >
            {isSubmitting ? (
              <SmartButtonLoading message="Filtrando..." />
            ) : (
              <>
                <SlidersHorizontal size={16} aria-hidden="true" />
                Filtrar
              </>
            )}
          </button>
          <Link
            href="/catalogo"
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
