import Link from "next/link";
import { CatalogFilter } from "@/components/storefront/catalog-filter";
import { ProductGrid } from "@/components/storefront/product-grid";
import {
  getCatalogCategories,
  getCatalogFranchises,
  getCatalogProductsPage,
  normalizeCatalogTokenValue,
  type CatalogProductSort,
} from "@/lib/catalog";

export type CatalogPageSearchParams = {
  category?: string;
  franchise?: string;
  page?: string;
  q?: string;
  sort?: CatalogProductSort;
  subcategory?: string;
};

function buildHref(
  pathname: string,
  params: Record<string, string | number | undefined>,
) {
  const search = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") {
      search.set(key, String(value));
    }
  }

  const query = search.toString();
  return query ? `${pathname}?${query}` : pathname;
}

function normalizeSort(value: string | undefined): CatalogProductSort {
  if (value === "newest" || value === "price_asc" || value === "price_desc" || value === "name") {
    return value;
  }

  return "relevance";
}

export async function CatalogPageContent({
  searchParams,
}: {
  searchParams?: Promise<CatalogPageSearchParams>;
}) {
  const params = await searchParams;
  const category = normalizeCatalogTokenValue(params?.category);
  const franchise = normalizeCatalogTokenValue(params?.franchise);
  const page = Number(params?.page ?? 1);
  const query = params?.q ?? "";
  const sort = normalizeSort(params?.sort);
  const subcategory = normalizeCatalogTokenValue(params?.subcategory);

  const [categories, franchises, productPage] = await Promise.all([
    getCatalogCategories(),
    getCatalogFranchises(),
    getCatalogProductsPage({
      category,
      franchise,
      page,
      pageSize: 24,
      query,
      sort,
      subcategory,
    }),
  ]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <section className="mb-6">
        <p className="text-xs font-black uppercase tracking-[0.2em] text-[var(--yellow)]">
          Smart Funkos
        </p>
        <h1 className="mt-2 text-3xl font-black text-[var(--foreground)] sm:text-4xl">
          Catálogo Smart Funkos
        </h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--muted)]">
          Explore produtos, categorias e linhas em um só lugar.
        </p>
      </section>

      <section className="mb-6">
        <CatalogFilter
          key={[category, franchise, sort, subcategory, query].join(":")}
          categories={categories}
          currentCategory={category}
          currentFranchise={franchise}
          currentSort={sort}
          currentSubcategory={subcategory}
          franchises={franchises}
          pathname="/catalogo"
          query={query}
        />
      </section>

      <p className="mb-4 text-sm text-[var(--muted)]">
        {productPage.meta.total} produto(s) encontrado(s). Página {productPage.meta.page} de{" "}
        {productPage.meta.totalPages}.
      </p>

      <ProductGrid
        emptyActionHref="/catalogo"
        emptyActionLabel="Limpar filtros"
        emptyDescription="Nenhum produto encontrado. Tente ajustar a busca, categoria ou linha."
        emptyTitle="Nenhum produto encontrado."
        products={productPage.data}
      />

      <nav className="mt-8 flex flex-wrap items-center justify-center gap-2" aria-label="Paginação">
        <Link
          href={buildHref("/catalogo", {
            category,
            franchise,
            page: Math.max(1, productPage.meta.page - 1),
            q: query,
            sort,
            subcategory,
          })}
          prefetch={false}
          aria-disabled={productPage.meta.page <= 1}
          className="inline-flex h-10 items-center rounded-md border border-[var(--border)] px-3 text-sm font-semibold text-[var(--foreground)] aria-disabled:pointer-events-none aria-disabled:opacity-50"
        >
          Anterior
        </Link>
        <span className="px-3 text-sm font-semibold text-[var(--muted)]">
          {productPage.meta.page} / {productPage.meta.totalPages}
        </span>
        <Link
          href={buildHref("/catalogo", {
            category,
            franchise,
            page: Math.min(productPage.meta.totalPages, productPage.meta.page + 1),
            q: query,
            sort,
            subcategory,
          })}
          prefetch={false}
          aria-disabled={productPage.meta.page >= productPage.meta.totalPages}
          className="inline-flex h-10 items-center rounded-md border border-[var(--border)] px-3 text-sm font-semibold text-[var(--foreground)] aria-disabled:pointer-events-none aria-disabled:opacity-50"
        >
          Próxima
        </Link>
      </nav>
    </div>
  );
}
