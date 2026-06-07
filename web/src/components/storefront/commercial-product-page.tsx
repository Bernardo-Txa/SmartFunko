import Link from "next/link";
import { MessageCircle } from "lucide-react";
import { CommercialFilter } from "@/components/storefront/commercial-filter";
import { ProductGrid } from "@/components/storefront/product-grid";
import {
  getCatalogCategories,
  getCatalogProductsPage,
  getCatalogSuppliers,
  type CatalogProductFilter,
  type CatalogProductSort,
} from "@/lib/catalog";
import { createWhatsAppTextUrl } from "@/lib/whatsapp";

export type CommercialPageSearchParams = {
  category?: string;
  filter?: CatalogProductFilter;
  page?: string;
  q?: string;
  sort?: CatalogProductSort;
  subcategory?: string;
  supplier?: string;
};

export type CommercialPageConfig = {
  allowFilterParam?: boolean;
  ctaMessage?: string;
  emptyDescription: string;
  filter: CatalogProductFilter;
  pathname: string;
  showSubcategoryFilter?: boolean;
  sort?: CatalogProductSort;
  subtitle: string;
  title: string;
};

function pageHref(
  pathname: string,
  params: Record<string, string | number | undefined>,
) {
  const search = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "" && value !== "all") {
      search.set(key, String(value));
    }
  }

  const query = search.toString();
  return query ? `${pathname}?${query}` : pathname;
}

function hasActiveFilters({
  category,
  filter,
  query,
  subcategory,
  supplier,
}: {
  category: string;
  filter: CatalogProductFilter;
  query: string;
  subcategory: string;
  supplier: string;
}) {
  return Boolean(category || query || subcategory || supplier || filter !== "all");
}

export async function CommercialProductPage({
  config,
  searchParams,
}: {
  config: CommercialPageConfig;
  searchParams?: Promise<CommercialPageSearchParams>;
}) {
  const params = await searchParams;
  const category = params?.category ?? "";
  const filter = config.allowFilterParam ? params?.filter ?? config.filter : config.filter;
  const page = Number(params?.page ?? 1);
  const query = params?.q ?? "";
  const sort = params?.sort ?? config.sort ?? "ready_first";
  const subcategory = config.showSubcategoryFilter ? params?.subcategory ?? "" : "";
  const supplier = params?.supplier ?? "";

  const [categories, suppliers, productPage] = await Promise.all([
    getCatalogCategories(),
    getCatalogSuppliers(),
    getCatalogProductsPage({
      category,
      filter,
      page,
      pageSize: 24,
      query,
      sort,
      subcategory,
      supplier,
    }),
  ]);
  const isFiltered = hasActiveFilters({
    category,
    filter,
    query,
    subcategory,
    supplier,
  });
  const emptyDescription = isFiltered
    ? "Nenhum produto ativo combina com os filtros atuais. Ajuste a busca, fornecedor, categoria ou vitrine comercial."
    : config.emptyDescription;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <section className="mb-6">
        <p className="text-xs font-black uppercase tracking-[0.2em] text-[var(--yellow)]">
          Smart Funkos
        </p>
        <h1 className="mt-2 text-3xl font-black text-[var(--foreground)] sm:text-4xl">
          {config.title}
        </h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--muted)]">
          {config.subtitle}
        </p>
        {config.ctaMessage ? (
          <a
            href={createWhatsAppTextUrl(config.ctaMessage)}
            target="_blank"
            rel="noreferrer"
            className="mt-5 inline-flex h-11 items-center gap-2 rounded-full bg-[var(--green)] px-5 text-sm font-black text-[#052e16] hover:brightness-110"
          >
            <MessageCircle size={17} aria-hidden="true" />
            Falar no WhatsApp
          </a>
        ) : null}
      </section>

      <section className="mb-6">
        <CommercialFilter
          categories={categories}
          currentCategory={category}
          currentFilter={filter}
          currentSort={sort}
          currentSubcategory={subcategory}
          currentSupplier={supplier}
          pathname={config.pathname}
          query={query}
          showFilter={config.allowFilterParam}
          showSubcategory={config.showSubcategoryFilter}
          suppliers={suppliers}
        />
      </section>

      <p className="mb-4 text-sm text-[var(--muted)]">
        {productPage.meta.total} produto(s) encontrado(s). Página {productPage.meta.page} de{" "}
        {productPage.meta.totalPages}.
      </p>

      <ProductGrid
        emptyActionHref={config.pathname}
        emptyActionLabel="Limpar filtros"
        emptyDescription={emptyDescription}
        emptyTitle={`Nenhum produto em ${config.title.toLowerCase()}`}
        products={productPage.data}
      />

      <nav className="mt-8 flex flex-wrap items-center justify-center gap-2" aria-label="Paginação">
        <Link
          href={pageHref(config.pathname, {
            category,
            filter: config.allowFilterParam ? filter : undefined,
            page: Math.max(1, productPage.meta.page - 1),
            q: query,
            sort,
            subcategory: config.showSubcategoryFilter ? subcategory : undefined,
            supplier,
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
          href={pageHref(config.pathname, {
            category,
            filter: config.allowFilterParam ? filter : undefined,
            page: Math.min(productPage.meta.totalPages, productPage.meta.page + 1),
            q: query,
            sort,
            subcategory: config.showSubcategoryFilter ? subcategory : undefined,
            supplier,
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
