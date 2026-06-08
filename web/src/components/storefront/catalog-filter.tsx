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

type CatalogFranchise = {
  id: string;
  name: string;
  slug: string;
};

type Props = {
  categories: CatalogCategory[];
  currentCategory: string;
  currentFranchise: string;
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
  const [selectedSort, setSelectedSort] = useState<CatalogProductSort>(currentSort);
  const [searchValue, setSearchValue] = useState(query);

  const activeCategory = useMemo(
    () => categories.find((category) => category.slug === selectedCategory),
    [categories, selectedCategory],
  );
  const subcategoryOptions = activeCategory?.subcategories ?? [];

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        startTransition(() => {
          router.push(
            buildHref(pathname, {
              category: selectedCategory,
              franchise: selectedFranchise,
              q: searchValue,
              sort: selectedSort,
              subcategory: selectedCategory ? selectedSubcategory : "",
            }),
          );
        });
      }}
      className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-[0_18px_44px_rgba(2,6,23,0.08)]"
    >
      <div className="grid gap-3 lg:grid-cols-[minmax(260px,1.6fr)_minmax(170px,0.8fr)_minmax(170px,0.8fr)_minmax(170px,0.8fr)_minmax(150px,0.7fr)_auto]">
        <label className="relative block">
          <span className="sr-only">Buscar produto</span>
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
            placeholder="Buscar no catálogo"
            className="h-11 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-10 text-sm text-[var(--foreground)] outline-none focus:border-[var(--accent)]"
          />
        </label>

        <label className="block">
          <span className="sr-only">Categoria</span>
          <select
            value={selectedCategory}
            onChange={(event) => {
              setSelectedCategory(event.target.value);
              setSelectedSubcategory("");
            }}
            name="category"
            className="h-11 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 text-sm font-semibold text-[var(--foreground)] outline-none focus:border-[var(--accent)]"
          >
            <option value="">Categorias</option>
            {categories.map((category) => (
              <option key={category.slug} value={category.slug}>
                {category.name}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="sr-only">Linha</span>
          <select
            value={selectedCategory ? selectedSubcategory : ""}
            onChange={(event) => setSelectedSubcategory(event.target.value)}
            disabled={!selectedCategory}
            name="subcategory"
            className="h-11 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 text-sm font-semibold text-[var(--foreground)] outline-none focus:border-[var(--accent)] disabled:cursor-not-allowed disabled:text-[var(--muted)]"
          >
            <option value="">{selectedCategory ? "Linhas" : "Escolha categoria"}</option>
            {subcategoryOptions.map((subcategory) => (
              <option key={subcategory.slug} value={subcategory.slug}>
                {subcategory.name}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="sr-only">Franquia</span>
          <select
            value={selectedFranchise}
            onChange={(event) => setSelectedFranchise(event.target.value)}
            name="franchise"
            className="h-11 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 text-sm font-semibold text-[var(--foreground)] outline-none focus:border-[var(--accent)]"
          >
            <option value="">Franquias</option>
            {franchises.map((franchise) => (
              <option key={franchise.id} value={franchise.slug}>
                {franchise.name}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="sr-only">Ordenação</span>
          <select
            value={selectedSort}
            onChange={(event) => setSelectedSort(event.target.value as CatalogProductSort)}
            name="sort"
            className="h-11 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 text-sm font-semibold text-[var(--foreground)] outline-none focus:border-[var(--accent)]"
          >
            <option value="relevance">Relevância</option>
            <option value="newest">Novidades</option>
            <option value="price_asc">Menor preço</option>
            <option value="price_desc">Maior preço</option>
            <option value="name">Nome</option>
          </select>
        </label>

        <div className="grid grid-cols-[1fr_auto] gap-2">
          <button
            type="submit"
            disabled={isPending}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-[var(--yellow)] px-4 text-sm font-black text-[#020617] hover:brightness-110 disabled:cursor-wait disabled:opacity-70"
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
            disabled={isPending}
            onClick={() => {
              startTransition(() => {
                router.push(pathname);
              });
            }}
            className="inline-flex h-11 items-center justify-center rounded-lg border border-[var(--border)] px-3 text-sm font-bold text-[var(--muted)] hover:bg-[var(--surface-strong)] disabled:cursor-wait disabled:opacity-60"
          >
            Limpar
          </button>
        </div>
      </div>
    </form>
  );
}
