import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CommercialFilter } from "@/components/storefront/commercial-filter";
import { ProductCard } from "@/components/product/product-card";
import {
  getCatalogCategories,
  getCatalogFranchises,
  getCatalogProductsPage,
  getCatalogSupplierBySlug,
  type CatalogProductSort,
} from "@/lib/catalog";

type Props = {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<{
    category?: string;
    franchise?: string;
    page?: string;
    q?: string;
    sort?: CatalogProductSort;
    subcategory?: string;
  }>;
};

function supplierHref(
  slug: string,
  params: Record<string, string | number | undefined>,
) {
  const search = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") {
      search.set(key, String(value));
    }
  }

  const query = search.toString();
  return query ? `/fornecedores/${slug}?${query}` : `/fornecedores/${slug}`;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const supplier = await getCatalogSupplierBySlug(slug);

  if (!supplier) {
    return {
      title: "Fornecedor",
    };
  }

  return {
    title: supplier.name,
    description: supplier.description ?? `Produtos vinculados a ${supplier.name}.`,
    alternates: {
      canonical: `/fornecedores/${supplier.slug}`,
    },
    openGraph: {
      title: `${supplier.name} | Smart Funkos`,
      description:
        supplier.description ?? `Produtos vinculados a ${supplier.name} na Smart Funkos.`,
      images:
        supplier.banner_url || supplier.logo_url
          ? [supplier.banner_url ?? supplier.logo_url ?? "/brand/SmartFunko.png"]
          : ["/brand/SmartFunko.png"],
    },
  };
}

export default async function SupplierDetailPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const supplier = await getCatalogSupplierBySlug(slug);

  if (!supplier) {
    notFound();
  }

  const queryParams = await searchParams;
  const page = Number(queryParams?.page ?? 1);
  const category = queryParams?.category ?? "";
  const franchise = queryParams?.franchise ?? "";
  const query = queryParams?.q ?? "";
  const sort = queryParams?.sort ?? "relevance";
  const subcategory = queryParams?.subcategory ?? "";
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
      supplier: slug,
    }),
  ]);

  const filterState = {
    category,
    franchise,
    page,
    q: query,
    sort,
    subcategory,
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <section
        className="mb-6 overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-[0_24px_64px_rgba(2,6,23,0.22)]"
        style={
          supplier.accent_color
            ? { borderColor: `${supplier.accent_color}66` }
            : undefined
        }
      >
        {supplier.banner_url ? (
          <div className="relative h-52 border-b border-[var(--border)] sm:h-72">
            <Image
              src={supplier.banner_url}
              alt={supplier.name}
              fill
              sizes="100vw"
              className="object-cover"
              priority
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#020617]/84 via-[#020617]/10 to-transparent" />
          </div>
        ) : null}
        <div className="p-5 sm:p-7">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            {supplier.logo_url ? (
              <div className="relative h-24 w-24 overflow-hidden rounded-2xl border border-[var(--border)] bg-white shadow-[0_16px_34px_rgba(2,6,23,0.20)]">
                <Image
                  src={supplier.logo_url}
                  alt={supplier.name}
                  fill
                  sizes="96px"
                  className="object-contain p-2"
                />
              </div>
            ) : (
              <div className="flex h-24 w-24 items-center justify-center rounded-2xl border border-[var(--border)] bg-[var(--surface-strong)] text-2xl font-black text-[var(--foreground)]">
                {supplier.name.slice(0, 2).toUpperCase()}
              </div>
            )}
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-[var(--yellow)]">
                Collab / fornecedor
              </p>
              <h1 className="mt-1 text-3xl font-black text-[var(--foreground)]">{supplier.name}</h1>
              {supplier.description ? (
                <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--muted)]">
                  {supplier.description}
                </p>
              ) : null}
              {supplier.website_url ? (
                <a
                  href={supplier.website_url}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-3 inline-flex rounded-full border border-cyan-200/24 bg-cyan-400/10 px-3 py-1.5 text-sm font-bold text-[var(--accent)] hover:bg-cyan-400/16"
                >
                  Site oficial
                </a>
              ) : null}
            </div>
          </div>
        </div>
      </section>

      <section className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-2xl font-black text-[var(--foreground)]">Produtos</h2>
          <p className="mt-1 text-sm text-[var(--muted)]">
            {productPage.meta.total} produto(s) encontrados para este fornecedor.
          </p>
        </div>
        <Link
          href="/fornecedores"
          prefetch={false}
          className="inline-flex h-10 items-center rounded-full border border-[var(--border)] bg-slate-950/40 px-4 text-sm font-semibold text-[var(--foreground)] hover:bg-cyan-400/10"
        >
          Ver outras collabs
        </Link>
      </section>

      <section className="mb-5">
        <CommercialFilter
          categories={categories}
          currentCategory={category}
          currentFranchise={franchise}
          currentSort={sort}
          currentSubcategory={subcategory}
          currentSupplier={supplier.slug}
          franchises={franchises}
          pathname={`/fornecedores/${supplier.slug}`}
          query={query}
          showSubcategory
          suppliers={[]}
        />
      </section>

      {productPage.data.length > 0 ? (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {productPage.data.map((product, index) => (
            <ProductCard key={product.id} priority={index < 2} product={product} />
          ))}
        </div>
      ) : (
        <p className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 text-sm text-[var(--muted)]">
          Nenhum produto encontrado para esta collab. Tente ajustar busca, categoria ou ordenação.
        </p>
      )}

      {productPage.meta.totalPages > 1 ? (
        <nav className="mt-8 flex flex-wrap items-center justify-center gap-2" aria-label="Paginacao">
          <Link
            href={supplierHref(slug, {
              ...filterState,
              page: Math.max(1, productPage.meta.page - 1),
            })}
            prefetch={false}
            aria-disabled={productPage.meta.page <= 1}
            className="inline-flex h-10 items-center rounded-full border border-[var(--border)] bg-slate-950/40 px-4 text-sm font-semibold text-[var(--foreground)] hover:bg-cyan-400/10 aria-disabled:pointer-events-none aria-disabled:opacity-50"
          >
            Anterior
          </Link>
          <span className="rounded-full border border-white/10 bg-slate-950/40 px-3 py-2 text-sm font-semibold text-[var(--muted)]">
            {productPage.meta.page} / {productPage.meta.totalPages}
          </span>
          <Link
            href={supplierHref(slug, {
              ...filterState,
              page: Math.min(productPage.meta.totalPages, productPage.meta.page + 1),
            })}
            prefetch={false}
            aria-disabled={productPage.meta.page >= productPage.meta.totalPages}
            className="inline-flex h-10 items-center rounded-full border border-[var(--border)] bg-slate-950/40 px-4 text-sm font-semibold text-[var(--foreground)] hover:bg-cyan-400/10 aria-disabled:pointer-events-none aria-disabled:opacity-50"
          >
            Proxima
          </Link>
        </nav>
      ) : null}
    </div>
  );
}
