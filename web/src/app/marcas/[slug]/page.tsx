import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { clsx } from "clsx";
import { ArrowRight } from "lucide-react";
import { ProductCard } from "@/components/product/product-card";
import { getBrandCatalogProfile } from "@/lib/brand-catalog-profiles";
import { getCatalogProductsPage, getCatalogSupplierBySlug, getCatalogSuppliers } from "@/lib/catalog";

type Props = {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<{
    page?: string;
  }>;
};

function pageHref(slug: string, page: number) {
  return page > 1 ? `/marcas/${slug}?page=${page}` : `/marcas/${slug}`;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const supplier = await getCatalogSupplierBySlug(slug);

  if (!supplier) {
    return {
      title: "Marca",
    };
  }

  const profile = getBrandCatalogProfile(supplier);

  return {
    title: `${profile.name} | Marcas`,
    description: profile.headline,
  };
}

export default async function BrandCatalogPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const supplier = await getCatalogSupplierBySlug(slug);

  if (!supplier) {
    notFound();
  }

  const profile = getBrandCatalogProfile(supplier);
  const queryParams = await searchParams;
  const page = Number(queryParams?.page ?? 1);
  const [suppliers, productPage] = await Promise.all([
    getCatalogSuppliers(),
    getCatalogProductsPage({
      page,
      pageSize: 24,
      supplier: slug,
    }),
  ]);
  const tabSuppliers = suppliers.some((item) => item.slug === supplier.slug)
    ? suppliers
    : [supplier, ...suppliers];
  const products = productPage.data;
  const readyCount = products.filter(
    (product) => product.source === "Pronta-entrega" || product.status === "available",
  ).length;
  const specialCount = products.filter(
    (product) => product.isSpecial || product.type !== "Comum" || Boolean(product.specialTags?.length),
  ).length;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <nav className="mb-6 flex gap-2 overflow-x-auto border-b border-[var(--border)] pb-3" aria-label="Marcas">
        {tabSuppliers.map((item) => {
          const tabProfile = getBrandCatalogProfile(item);
          const isActive = item.slug === supplier.slug;

          return (
            <Link
              key={item.id}
              href={`/marcas/${item.slug}`}
              prefetch={false}
              aria-current={isActive ? "page" : undefined}
              className={clsx(
                "inline-flex h-10 shrink-0 items-center rounded-md border px-4 text-sm font-black transition",
                isActive
                  ? tabProfile.theme.activeTabClassName
                  : "border-[var(--border)] bg-[#030816] text-slate-200 hover:border-cyan-300/50 hover:bg-cyan-300/10",
              )}
            >
              {tabProfile.tabLabel}
            </Link>
          );
        })}
      </nav>

      <section className={clsx("mb-6 overflow-hidden rounded-lg border p-5 sm:p-7", profile.theme.heroClassName)}>
        <div className="grid gap-6 lg:grid-cols-[1fr_320px] lg:items-stretch">
          <div className="flex min-h-72 flex-col justify-between">
            <div>
              <span className={clsx("inline-flex rounded-full px-3 py-1 text-xs font-black uppercase", profile.theme.badgeClassName)}>
                Catalogo da marca
              </span>
              <h1 className="mt-5 max-w-3xl text-4xl font-black leading-tight text-white sm:text-5xl">
                {profile.name}
              </h1>
              <p className={clsx("mt-4 max-w-3xl text-lg font-semibold leading-7", profile.theme.accentClassName)}>
                {profile.headline}
              </p>
              <p className="mt-4 max-w-3xl text-sm leading-6 text-slate-300">
                {profile.story}
              </p>
            </div>

            <div className="mt-8 flex flex-wrap gap-2">
              {profile.highlights.map((highlight) => (
                <span
                  key={highlight}
                  className="inline-flex h-8 items-center rounded-md border border-white/12 bg-white/8 px-3 text-xs font-bold text-slate-100"
                >
                  {highlight}
                </span>
              ))}
            </div>
          </div>

          <div className="relative min-h-72 overflow-hidden rounded-lg border border-white/12 bg-black/18">
            {supplier.banner_url ? (
              <Image
                src={supplier.banner_url}
                alt={supplier.name}
                fill
                sizes="(min-width: 1024px) 320px, 100vw"
                className="object-cover"
                priority
              />
            ) : null}
            <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(2,6,23,0.12)_0%,rgba(2,6,23,0.82)_100%)]" />
            <div className="absolute inset-x-5 bottom-5">
              {supplier.logo_url ? (
                <div className="relative mb-4 h-20 w-20 overflow-hidden rounded-md border border-white/20 bg-white">
                  <Image
                    src={supplier.logo_url}
                    alt={supplier.name}
                    fill
                    sizes="80px"
                    className="object-contain p-2"
                  />
                </div>
              ) : (
                <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-md border border-white/16 bg-white/10 text-2xl font-black text-white">
                  {supplier.name.slice(0, 2).toUpperCase()}
                </div>
              )}
              <p className="text-sm font-bold text-slate-100">{profile.catalogTitle}</p>
              {supplier.website_url ? (
                <a
                  href={supplier.website_url}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-3 inline-flex h-9 items-center gap-2 rounded-md bg-white px-3 text-xs font-black text-slate-950 hover:brightness-95"
                >
                  Site oficial
                  <ArrowRight size={14} aria-hidden="true" />
                </a>
              ) : null}
            </div>
          </div>
        </div>
      </section>

      <section className={clsx("mb-6 rounded-lg border p-5", profile.theme.bandClassName)}>
        <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
          <div>
            <h2 className="text-xl font-black text-white">Criterios da marca</h2>
            <p className="mt-2 text-sm leading-6 text-slate-300">
              O catalogo especial prioriza o que mais pesa na compra de cada marca.
            </p>
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            {profile.sellingNotes.map((note) => (
              <div key={note} className="rounded-md border border-white/10 bg-[#030816]/78 p-4 text-sm leading-6 text-slate-300">
                {note}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-2xl font-black text-[var(--foreground)]">{profile.catalogTitle}</h2>
          <p className="mt-1 text-sm text-[var(--muted)]">
            {productPage.meta.total} produto(s) neste catalogo especial.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className="inline-flex h-8 items-center rounded-md bg-[var(--surface)] px-3 text-xs font-bold text-[var(--muted)] ring-1 ring-[var(--border)]">
            {readyCount} pronta-entrega
          </span>
          <span className="inline-flex h-8 items-center rounded-md bg-[var(--surface)] px-3 text-xs font-bold text-[var(--muted)] ring-1 ring-[var(--border)]">
            {specialCount} especiais
          </span>
        </div>
      </section>

      {products.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {products.map((product, index) => (
            <ProductCard key={product.id} priority={index < 4} product={product} />
          ))}
        </div>
      ) : (
        <p className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5 text-sm text-[var(--muted)]">
          {profile.emptyState}
        </p>
      )}

      {productPage.meta.totalPages > 1 ? (
        <nav className="mt-8 flex flex-wrap items-center justify-center gap-2" aria-label="Paginacao">
          <Link
            href={pageHref(slug, Math.max(1, productPage.meta.page - 1))}
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
            href={pageHref(slug, Math.min(productPage.meta.totalPages, productPage.meta.page + 1))}
            prefetch={false}
            aria-disabled={productPage.meta.page >= productPage.meta.totalPages}
            className="inline-flex h-10 items-center rounded-md border border-[var(--border)] px-3 text-sm font-semibold text-[var(--foreground)] aria-disabled:pointer-events-none aria-disabled:opacity-50"
          >
            Proxima
          </Link>
        </nav>
      ) : null}
    </div>
  );
}
