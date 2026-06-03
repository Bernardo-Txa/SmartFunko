"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ChevronDown, Search } from "lucide-react";
import type { CatalogCategory } from "@/lib/catalog";

type Props = {
  categories: CatalogCategory[];
  currentCategory: string;
  currentSubcategory: string;
  query: string;
};

function catalogHref(params: Record<string, string | number | undefined>) {
  const search = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "" && value !== "all") {
      search.set(key, String(value));
    }
  }

  const query = search.toString();
  return query ? `/catalogo?${query}` : "/catalogo";
}

function uniqueSubcategories(categories: CatalogCategory[]) {
  const names = new Set<string>();

  for (const category of categories) {
    for (const subcategory of category.subcategories) {
      names.add(subcategory.name);
    }
  }

  return Array.from(names)
    .sort((first, second) => first.localeCompare(second, "pt-BR"))
    .map((name) => ({ name }));
}

export function CatalogCategoryFilter({
  categories,
  currentCategory,
  currentSubcategory,
  query,
}: Props) {
  const [term, setTerm] = useState("");
  const selectedCategory = categories.find((category) => category.name === currentCategory);
  const allSubcategories = useMemo(() => uniqueSubcategories(categories), [categories]);
  const subcategoryOptions = selectedCategory?.subcategories ?? allSubcategories;
  const normalizedTerm = term.trim().toLowerCase();
  const filteredSubcategories = useMemo(() => {
    if (!normalizedTerm) {
      return subcategoryOptions;
    }

    return subcategoryOptions.filter((item) => item.name.toLowerCase().includes(normalizedTerm));
  }, [normalizedTerm, subcategoryOptions]);

  return (
    <div>
      <nav className="flex flex-wrap justify-center gap-3" aria-label="Categorias">
        <Link
          href={catalogHref({ q: query })}
          prefetch={false}
          className={`inline-flex h-12 items-center rounded-full px-6 text-sm font-black transition ${
            currentCategory
              ? "bg-[#030816] text-slate-100 hover:bg-cyan-400/10"
              : "bg-[var(--yellow)] text-[#020617] shadow-[0_10px_30px_rgba(250,204,21,0.28)]"
          }`}
        >
          Todos
        </Link>

        {categories.map((category) => (
          <Link
            key={category.name}
            href={catalogHref({
              category: category.name,
              q: query,
            })}
            prefetch={false}
            className={`inline-flex h-12 items-center rounded-full px-6 text-sm font-black transition ${
              currentCategory === category.name
                ? "bg-[var(--yellow)] text-[#020617] shadow-[0_10px_30px_rgba(250,204,21,0.28)]"
                : "bg-[#030816] text-slate-100 hover:bg-cyan-400/10"
            }`}
          >
            {category.name}
          </Link>
        ))}
      </nav>

      <div className="mx-auto mt-3 grid w-full max-w-[820px] gap-3 md:grid-cols-[minmax(0,1fr)_minmax(260px,360px)]">
        <form className="min-w-0">
          <div className="flex h-11 min-w-0 items-center rounded-full border border-cyan-400/20 bg-[#061122]/90 px-4 shadow-[inset_0_0_0_1px_rgba(2,6,23,0.28)] focus-within:border-cyan-300/60">
            <input
              defaultValue={query}
              name="q"
              type="search"
              placeholder="Buscar Funko..."
              className="min-w-0 flex-1 bg-transparent text-sm text-slate-100 outline-none"
            />
            {currentCategory ? (
              <input type="hidden" name="category" value={currentCategory} />
            ) : null}
            {currentSubcategory ? (
              <input type="hidden" name="subcategory" value={currentSubcategory} />
            ) : null}
            <button
              type="submit"
              aria-label="Buscar"
              className="ml-2 inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-[var(--yellow)] text-[#020617] transition hover:brightness-110"
            >
              <Search size={16} aria-hidden="true" />
            </button>
          </div>
        </form>

        <details className="catalog-more relative min-w-0">
          <summary className="flex h-11 cursor-pointer select-none items-center justify-between gap-3 rounded-full border border-cyan-400/20 bg-[#030816] px-5 text-sm font-black text-slate-200 transition hover:bg-cyan-400/10">
            <span className={currentSubcategory ? "truncate text-slate-100" : "text-slate-400"}>
              {currentSubcategory || "Subcategoria"}
            </span>
            <ChevronDown size={16} className="shrink-0" aria-hidden="true" />
          </summary>

          <div className="absolute left-1/2 top-12 z-30 w-[min(520px,calc(100vw-2rem))] -translate-x-1/2 rounded-2xl border border-cyan-400/20 bg-[#061122] p-3 shadow-[0_24px_70px_rgba(2,6,23,0.46)] md:left-auto md:right-0 md:translate-x-0">
            <label className="flex h-10 items-center gap-2 rounded-full border border-cyan-400/20 bg-[#030816] px-3">
              <Search size={16} className="shrink-0 text-slate-400" aria-hidden="true" />
              <input
                value={term}
                onChange={(event) => setTerm(event.target.value)}
                type="search"
                placeholder="Buscar subcategoria..."
                className="min-w-0 flex-1 bg-transparent text-sm text-slate-100 outline-none"
              />
            </label>

            <div className="catalog-scroll mt-3 grid max-h-80 gap-2 overflow-y-auto pr-1">
              <Link
                href={catalogHref({
                  category: currentCategory,
                  q: query,
                })}
                prefetch={false}
                className={`rounded-full px-4 py-2 text-sm font-black transition hover:bg-cyan-400/10 ${
                  currentSubcategory
                    ? "border border-cyan-400/20 bg-[#030816] text-slate-200"
                    : "bg-[var(--yellow)] text-[#020617]"
                }`}
              >
                Todas as subcategorias
              </Link>

              {filteredSubcategories.map((item) => (
                <Link
                  key={item.name}
                  href={catalogHref({
                    category: currentCategory,
                    q: query,
                    subcategory: item.name,
                  })}
                  prefetch={false}
                  className={`min-w-0 rounded-full border border-cyan-400/20 px-4 py-2 text-sm font-bold transition hover:bg-cyan-400/10 ${
                    currentSubcategory === item.name
                      ? "bg-[var(--yellow)] text-[#020617]"
                      : "bg-[#030816] text-slate-200"
                  }`}
                >
                  <span className="block truncate">{item.name}</span>
                </Link>
              ))}

              {filteredSubcategories.length === 0 ? (
                <p className="px-2 py-3 text-sm font-semibold text-slate-400">
                  Nenhuma subcategoria encontrada.
                </p>
              ) : null}
            </div>
          </div>
        </details>
      </div>
    </div>
  );
}
