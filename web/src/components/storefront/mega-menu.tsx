import Link from "next/link";
import { ChevronDown } from "lucide-react";
import type { CatalogCategory } from "@/lib/catalog";

type FranchiseOption = {
  id: string;
  name: string;
  slug: string;
};

const universeGroups = [
  {
    categories: ["Animes", "Games"],
    label: "Anime & Games",
  },
  {
    categories: ["Heróis/Vilões"],
    label: "Marvel & DC",
  },
  {
    categories: ["Disney"],
    label: "Disney & Animação",
  },
  {
    categories: ["Filmes e Séries"],
    label: "Filmes & Séries",
  },
  {
    categories: ["Música"],
    label: "Música & Cultura Pop",
  },
  {
    categories: ["Esporte"],
    label: "Esportes",
  },
];

function categoryHref(category: string) {
  return `/catalogo?category=${encodeURIComponent(category)}`;
}

function franchiseHref(slug: string) {
  return `/catalogo?franchise=${encodeURIComponent(slug)}`;
}

function getGroupCategories(groupCategories: string[], categories: CatalogCategory[]) {
  return categories.filter((category) => groupCategories.includes(category.name));
}

export function MegaMenu({
  categories,
  franchises,
}: {
  categories: CatalogCategory[];
  franchises: FranchiseOption[];
}) {
  const highlightedFranchises = franchises.slice(0, 8);

  return (
    <details className="group relative">
      <summary className="inline-flex h-10 cursor-pointer list-none items-center gap-1 rounded-full px-4 text-sm font-bold text-[var(--foreground)] hover:bg-cyan-400/15 hover:text-white [&::-webkit-details-marker]:hidden">
        Catálogo
        <ChevronDown
          size={15}
          aria-hidden="true"
          className="transition group-open:rotate-180"
        />
      </summary>
      <div className="absolute left-0 top-12 w-[760px] max-w-[calc(100vw-2rem)] rounded-xl border border-[var(--border)] bg-[#020617] p-4 shadow-[0_28px_70px_rgba(2,6,23,0.56)]">
        <div className="grid gap-4 md:grid-cols-3">
          <Link
            href="/catalogo"
            prefetch={false}
            className="rounded-lg border border-cyan-300/20 bg-cyan-400/10 p-3 text-sm font-black text-slate-100 hover:bg-cyan-400/16 md:col-span-3"
          >
            Todos os produtos
          </Link>
          {universeGroups.map((group) => {
            const groupCategories = getGroupCategories(group.categories, categories);
            const firstCategory = groupCategories[0];

            return (
              <section key={group.label} className="rounded-lg bg-slate-900/64 p-3">
                <h3 className="text-xs font-black uppercase tracking-[0.14em] text-[var(--yellow)]">
                  {group.label}
                </h3>
                <div className="mt-3 grid gap-2">
                  {groupCategories.length > 0 ? (
                    groupCategories.map((category) => (
                      <Link
                        key={category.slug}
                        href={categoryHref(category.slug)}
                        prefetch={false}
                        className="rounded-md px-2 py-1 text-sm font-semibold text-slate-200 hover:bg-cyan-400/12"
                      >
                        {category.name}
                      </Link>
                    ))
                  ) : (
                    <Link
                      href={firstCategory ? categoryHref(firstCategory.slug) : "/catalogo"}
                      prefetch={false}
                      className="rounded-md px-2 py-1 text-sm font-semibold text-slate-400 hover:bg-cyan-400/12"
                    >
                      Ver categoria
                    </Link>
                  )}
                </div>
              </section>
            );
          })}
          <section className="rounded-lg bg-slate-900/64 p-3 md:col-span-3">
            <h3 className="text-xs font-black uppercase tracking-[0.14em] text-[var(--yellow)]">
              Franquias em destaque
            </h3>
            <div className="mt-3 flex flex-wrap gap-2">
              {highlightedFranchises.length > 0 ? (
                highlightedFranchises.map((franchise) => (
                  <Link
                    key={franchise.id}
                    href={franchiseHref(franchise.slug)}
                    prefetch={false}
                    className="rounded-full border border-cyan-300/20 bg-cyan-400/8 px-3 py-1 text-xs font-bold text-slate-200 hover:bg-cyan-400/16"
                  >
                    {franchise.name}
                  </Link>
                ))
              ) : (
                <span className="text-sm text-slate-400">
                  Franquias aparecem aqui quando houver dados suficientes no catálogo.
                </span>
              )}
            </div>
          </section>
        </div>
      </div>
    </details>
  );
}

export function MobileMegaMenu({
  categories,
  franchises,
}: {
  categories: CatalogCategory[];
  franchises: FranchiseOption[];
}) {
  return (
    <details className="rounded-lg border border-[var(--border)] bg-slate-950/48">
      <summary className="flex h-11 cursor-pointer list-none items-center justify-between px-3 text-sm font-black text-[var(--foreground)] [&::-webkit-details-marker]:hidden">
        Catálogo
        <ChevronDown size={16} aria-hidden="true" />
      </summary>
      <div className="grid gap-2 border-t border-[var(--border)] p-3">
        <Link
          href="/catalogo"
          prefetch={false}
          className="rounded-md px-2 py-2 text-sm font-black text-slate-100 hover:bg-cyan-400/12"
        >
          Todos os produtos
        </Link>
        {categories.slice(0, 8).map((category) => (
          <Link
            key={category.slug}
            href={categoryHref(category.slug)}
            prefetch={false}
            className="rounded-md px-2 py-2 text-sm font-semibold text-slate-200 hover:bg-cyan-400/12"
          >
            {category.name}
          </Link>
        ))}
        {franchises.slice(0, 8).map((franchise) => (
          <Link
            key={franchise.id}
            href={franchiseHref(franchise.slug)}
            prefetch={false}
            className="rounded-md px-2 py-2 text-sm font-semibold text-slate-300 hover:bg-cyan-400/12"
          >
            {franchise.name}
          </Link>
        ))}
      </div>
    </details>
  );
}
