"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Search, SlidersHorizontal } from "lucide-react";
import { SmartButtonLoading } from "@/components/ui/smart-loading";
import {
  normalizeCatalogTokenValue,
  type CatalogCategory,
  type CatalogProductSort,
} from "@/lib/catalog";
import { productTypeOptions } from "@/lib/product-types";

type CatalogFranchise = {
  id: string;
  name: string;
  slug: string;
};

type Props = {
  categories: CatalogCategory[];
  currentCategory: string;
  currentFranchise: string;
  currentProductType: string;
  currentSort: CatalogProductSort;
  currentSubcategory: string;
  pathname: string;
  query: string;
  franchises: CatalogFranchise[];
};

function buildHref(pathname: string, params: Record<string, string>) {
  const search = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value.trim()) {
      search.set(key, value.trim());
    }
  }

  const query = search.toString();
  return query ? `${pathname}?${query}` : pathname;
}

export function CatalogFilter({
  categories,
  currentCategory,
  currentFranchise,
  currentProductType,
  currentSort,
  currentSubcategory,
  pathname,
  query,
  franchises,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [selectedCategory, setSelectedCategory] = useState(normalizeCatalogTokenValue(currentCategory));
  const [selectedSubcategory, setSelectedSubcategory] = useState(
    normalizeCatalogTokenValue(currentSubcategory),
  );
  const [selectedFranchise, setSelectedFranchise] = useState(
    normalizeCatalogTokenValue(currentFranchise),
  );
  const [selectedProductType, setSelectedProductType] = useState(currentProductType);
  const [selectedSort, setSelectedSort] = useState<CatalogProductSort>(currentSort);
  const [searchValue, setSearchValue] = useState(query);

  const activeCategory = useMemo(
    () => categories.find((category) => category.slug === selectedCategory),
    [categories, selectedCategory],
  );
  const subcategoryOptions = activeCategory?.subcategories ?? [];
  const hasActiveFilters = Boolean(
    searchValue.trim() ||
      selectedCategory ||
      selectedSubcategory ||
      selectedFranchise ||
      selectedProductType ||
      selectedSort !== "relevance",
  );

  function clearFilters() {
    setSelectedCategory("");
    setSelectedSubcategory("");
    setSelectedFranchise("");
    setSelectedProductType("");
    setSelectedSort("relevance");
    setSearchValue("");
    startTransition(() => {
      router.push(pathname);
    });
  }

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        startTransition(() => {
          router.push(
            buildHref(pathname, {
              category: selectedCategory,
              franchise: selectedFranchise,
              productType: selectedProductType,
              q: searchValue,
              sort: selectedSort,
              subcategory: selectedCategory ? selectedSubcategory : "",
            }),
          );
        });
      }}
      className="rounded-lg border border-cyan-300/18 bg-slate-950/52 p-4 shadow-[0_18px_44px_rgba(2,6,23,0.14)] backdrop-blur"
    >
      <div className="grid gap-4">
        <div className="grid gap-3 xl:grid-cols-[minmax(320px,1fr)_auto] xl:items-end">
          <label className="block min-w-0">
            <span className="mb-1.5 block text-xs font-black uppercase tracking-[0.14em] text-slate-400">
              Busca
            </span>
            <span className="relative block">
              <Search
                aria-hidden="true"
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
                size={17}
              />
              <input
                value={searchValue}
                onChange={(event) => setSearchValue(event.target.value)}
                name="q"
                type="search"
                placeholder="Nome, SKU, franquia ou categoria"
                className="h-11 w-full rounded-md border border-cyan-300/18 bg-[#071124]/88 px-10 text-sm text-[var(--foreground)] outline-none transition focus:border-cyan-200/70"
              />
            </span>
          </label>

          <div className="grid grid-cols-2 gap-2 sm:flex sm:justify-end">
            <button
              type="submit"
              disabled={isPending}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-yellow-300 px-4 text-sm font-black text-[#020617] shadow-[0_10px_24px_rgba(250,204,21,0.14)] hover:bg-yellow-200 disabled:cursor-wait disabled:opacity-70"
            >
              {isPending ? (
                <SmartButtonLoading message="Filtrando..." />
              ) : (
                <>
                  <SlidersHorizontal size={16} aria-hidden="true" />
                  Filtrar
                </>
              )}
            </button>
            <button
              type="button"
              disabled={isPending || !hasActiveFilters}
              onClick={clearFilters}
              className="inline-flex h-11 items-center justify-center rounded-md border border-cyan-300/18 px-4 text-sm font-bold text-[var(--muted)] hover:bg-cyan-400/10 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Limpar
            </button>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          <label className="block min-w-0">
            <span className="mb-1.5 block text-xs font-black uppercase tracking-[0.14em] text-slate-400">
              Categoria
            </span>
            <select
              value={selectedCategory}
              onChange={(event) => {
                setSelectedCategory(event.target.value);
                setSelectedSubcategory("");
              }}
              name="category"
              className="h-11 w-full min-w-0 rounded-md border border-cyan-300/18 bg-[#071124]/88 px-3 text-sm font-semibold text-[var(--foreground)] outline-none transition focus:border-cyan-200/70"
            >
              <option value="">Todas</option>
              {categories.map((category) => (
                <option key={category.slug} value={category.slug}>
                  {category.name}
                </option>
              ))}
            </select>
          </label>

          <label className="block min-w-0">
            <span className="mb-1.5 block text-xs font-black uppercase tracking-[0.14em] text-slate-400">
              Linha
            </span>
            <select
              value={selectedCategory ? selectedSubcategory : ""}
              onChange={(event) => setSelectedSubcategory(event.target.value)}
              disabled={!selectedCategory}
              name="subcategory"
              className="h-11 w-full min-w-0 rounded-md border border-cyan-300/18 bg-[#071124]/88 px-3 text-sm font-semibold text-[var(--foreground)] outline-none transition focus:border-cyan-200/70 disabled:cursor-not-allowed disabled:text-[var(--muted)]"
            >
              <option value="">{selectedCategory ? "Todas" : "Selecione categoria"}</option>
              {subcategoryOptions.map((subcategory) => (
                <option key={subcategory.slug} value={subcategory.slug}>
                  {subcategory.name}
                </option>
              ))}
            </select>
          </label>

          <label className="block min-w-0">
            <span className="mb-1.5 block text-xs font-black uppercase tracking-[0.14em] text-slate-400">
              Franquia
            </span>
            <select
              value={selectedFranchise}
              onChange={(event) => setSelectedFranchise(event.target.value)}
              name="franchise"
              className="h-11 w-full min-w-0 rounded-md border border-cyan-300/18 bg-[#071124]/88 px-3 text-sm font-semibold text-[var(--foreground)] outline-none transition focus:border-cyan-200/70"
            >
              <option value="">Todas</option>
              {franchises.map((franchise) => (
                <option key={franchise.id} value={franchise.slug}>
                  {franchise.name}
                </option>
              ))}
            </select>
          </label>

          <label className="block min-w-0">
            <span className="mb-1.5 block text-xs font-black uppercase tracking-[0.14em] text-slate-400">
              Tipo
            </span>
            <select
              value={selectedProductType}
              onChange={(event) => setSelectedProductType(event.target.value)}
              name="productType"
              className="h-11 w-full min-w-0 rounded-md border border-cyan-300/18 bg-[#071124]/88 px-3 text-sm font-semibold text-[var(--foreground)] outline-none transition focus:border-cyan-200/70"
            >
              <option value="">Todos</option>
              {productTypeOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="block min-w-0">
            <span className="mb-1.5 block text-xs font-black uppercase tracking-[0.14em] text-slate-400">
              Ordem
            </span>
            <select
              value={selectedSort}
              onChange={(event) => setSelectedSort(event.target.value as CatalogProductSort)}
              name="sort"
              className="h-11 w-full min-w-0 rounded-md border border-cyan-300/18 bg-[#071124]/88 px-3 text-sm font-semibold text-[var(--foreground)] outline-none transition focus:border-cyan-200/70"
            >
              <option value="relevance">Relevância</option>
              <option value="specials_first">Acervo primeiro</option>
              <option value="newest">Novidades</option>
              <option value="price_asc">Menor preço</option>
              <option value="price_desc">Maior preço</option>
              <option value="name">Nome</option>
            </select>
          </label>
        </div>
      </div>
    </form>
  );
}
