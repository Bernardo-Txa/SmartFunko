import type { Metadata } from "next";
import Link from "next/link";
import { CatalogCategoryFilter } from "@/components/product/catalog-category-filter";
import { ProductCard } from "@/components/product/product-card";
import { getCatalogCategories, getCatalogProductsPage } from "@/lib/catalog";

export const metadata: Metadata = {
  title: "Catalogo",
};

type Props = {
  searchParams: Promise<{
    category?: string;
    page?: string;
    q?: string;
    subcategory?: string;
  }>;
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

export default async function CatalogPage({ searchParams }: Props) {
  const params = await searchParams;
  const category = params.category ?? "";
  const page = Number(params.page ?? 1);
  const query = params.q ?? "";
  const subcategory = params.subcategory ?? "";
  const [categories, productPage] = await Promise.all([
    getCatalogCategories(),
    getCatalogProductsPage({
      category,
      page,
      pageSize: 24,
      query,
      subcategory,
    }),
  ]);
  const { data: products, meta } = productPage;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <section className="mb-8 pt-1">
        <h1 className="sr-only">Catalogo Smart Funkos</h1>

        <CatalogCategoryFilter
          categories={categories}
          currentCategory={category}
          currentSubcategory={subcategory}
          query={query}
        />
      </section>

      <p className="mb-4 text-sm text-[var(--muted)]">
        {meta.total} produto(s) encontrado(s). Pagina {meta.page} de {meta.totalPages}.
      </p>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {products.map((product, index) => (
          <ProductCard key={product.id} priority={index < 4} product={product} />
        ))}
      </div>

      <nav className="mt-8 flex flex-wrap items-center justify-center gap-2" aria-label="Paginacao">
        <Link
          href={catalogHref({
            category,
            page: Math.max(1, meta.page - 1),
            q: query,
            subcategory,
          })}
          prefetch={false}
          aria-disabled={meta.page <= 1}
          className="inline-flex h-10 items-center rounded-md border border-[var(--border)] px-3 text-sm font-semibold text-[var(--foreground)] aria-disabled:pointer-events-none aria-disabled:opacity-50"
        >
          Anterior
        </Link>
        <span className="px-3 text-sm font-semibold text-[var(--muted)]">
          {meta.page} / {meta.totalPages}
        </span>
        <Link
          href={catalogHref({
            category,
            page: Math.min(meta.totalPages, meta.page + 1),
            q: query,
            subcategory,
          })}
          prefetch={false}
          aria-disabled={meta.page >= meta.totalPages}
          className="inline-flex h-10 items-center rounded-md border border-[var(--border)] px-3 text-sm font-semibold text-[var(--foreground)] aria-disabled:pointer-events-none aria-disabled:opacity-50"
        >
          Proxima
        </Link>
      </nav>
    </div>
  );
}
