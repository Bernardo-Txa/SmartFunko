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
  page?: string;
  q?: string;
  sort?: CatalogProductSort;
  supplier?: string;
};

export type CommercialPageConfig = {
  ctaMessage?: string;
  emptyDescription: string;
  filter: CatalogProductFilter;
  pathname: string;
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
    if (value !== undefined && value !== "") {
      search.set(key, String(value));
    }
  }

  const query = search.toString();
  return query ? `${pathname}?${query}` : pathname;
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
  const page = Number(params?.page ?? 1);
  const query = params?.q ?? "";
  const sort = params?.sort ?? config.sort ?? "ready_first";
  const supplier = params?.supplier ?? "";

  const [categories, suppliers, productPage] = await Promise.all([
    getCatalogCategories(),
    getCatalogSuppliers(),
    getCatalogProductsPage({
      category,
      filter: config.filter,
      page,
      pageSize: 24,
      query,
      sort,
      supplier,
    }),
  ]);

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
          currentSort={sort}
          currentSupplier={supplier}
          pathname={config.pathname}
          query={query}
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
        emptyDescription={config.emptyDescription}
        emptyTitle={`Nenhum produto em ${config.title.toLowerCase()}`}
        products={productPage.data}
      />

      <nav className="mt-8 flex flex-wrap items-center justify-center gap-2" aria-label="Paginação">
        <Link
          href={pageHref(config.pathname, {
            category,
            page: Math.max(1, productPage.meta.page - 1),
            q: query,
            sort,
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
            page: Math.min(productPage.meta.totalPages, productPage.meta.page + 1),
            q: query,
            sort,
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
