import Link from "next/link";
import { clsx } from "clsx";
import { MessageCircle } from "lucide-react";
import { ProductQuickActions } from "@/components/product/product-quick-actions";
import { SafeProductImage } from "@/components/product/safe-product-image";
import { PriceDisplay } from "@/components/storefront/price-display";
import type { Product } from "@/types/product";
import { createProductWhatsAppUrl } from "@/lib/whatsapp";
import { ProductStatusBadge } from "@/components/ui/status-badge";

const toneClass: Record<Product["tone"], string> = {
  teal: "from-white via-cyan-50 to-slate-100",
  pink: "from-white via-pink-50 to-slate-100",
  amber: "from-white via-yellow-50 to-slate-100",
  indigo: "from-white via-indigo-50 to-slate-100",
};

function getSpecialPills(product: Product) {
  const pills = [
    product.specialLabel,
    ...(product.specialTags ?? []),
    product.type !== "Comum" ? product.type : undefined,
  ].filter(Boolean) as string[];

  if (pills.length > 0) {
    return Array.from(new Set(pills));
  }

  return [];
}

function getCardSpecialLabel(product: Product, specialPills: string[]) {
  if (specialPills[0]) {
    return specialPills[0];
  }

  return product.isSpecial ? "Special" : undefined;
}

export function ProductArtwork({ product }: { product: Product }) {
  return (
    <div
      className={clsx(
        "relative flex aspect-[4/5] w-full items-center justify-center overflow-hidden rounded-[16px] bg-gradient-to-br p-4 text-slate-950",
        toneClass[product.tone],
      )}
      aria-label={product.name}
    >
      <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(15,23,42,0.035)_1px,transparent_1px),linear-gradient(0deg,rgba(15,23,42,0.028)_1px,transparent_1px)] bg-[length:28px_28px]" />
      <div className="relative z-10 flex h-[72%] w-[68%] flex-col justify-between rounded-2xl border border-slate-200 bg-white/80 p-4 shadow-[0_18px_32px_rgba(15,23,42,0.16)]">
        <div>
          <span className="inline-flex rounded-full bg-slate-950 px-3 py-1 text-xl font-black leading-none text-white">
            POP
          </span>
          <p className="mt-3 text-xs font-bold uppercase text-slate-500">
            {product.franchise}
          </p>
        </div>
        <div>
          <strong className="block text-5xl font-black leading-none text-slate-950">
            {product.funkoNumber}
          </strong>
          <span className="mt-2 inline-flex rounded-full bg-[var(--yellow)] px-2 py-1 text-xs font-black text-slate-950">
            {product.type}
          </span>
        </div>
      </div>
    </div>
  );
}

export function ProductMedia({
  product,
  priority = false,
  sizes = "(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 240px",
}: {
  priority?: boolean;
  product: Product;
  sizes?: string;
}) {
  if (!product.imageUrl) {
    return <ProductArtwork product={product} />;
  }

  return (
    <SafeProductImage
      src={product.imageUrl}
      alt={product.imageAlt ?? product.name}
      fallback={<ProductArtwork product={product} />}
      priority={priority}
      sizes={sizes}
    />
  );
}

export function ProductCard({
  priority = false,
  product,
}: {
  priority?: boolean;
  product: Product;
}) {
  const specialPills = getSpecialPills(product);
  const isSpecial = product.isSpecial || specialPills.length > 0;
  const cardSpecialLabel = getCardSpecialLabel(product, specialPills);
  const cartProduct = {
    id: product.id,
    imageUrl: product.imageUrl,
    name: product.name,
    price: product.price,
    sku: product.sku,
    slug: product.slug,
    variantId: product.variantId,
  };

  return (
    <article
      className={clsx(
        "group relative flex h-full flex-col rounded-2xl border bg-[#030816]/96 p-3.5 shadow-[0_16px_38px_rgba(2,6,23,0.24)] transition duration-200 hover:-translate-y-0.5 hover:border-cyan-200/32 hover:shadow-[0_22px_48px_rgba(2,6,23,0.34)] sm:p-4",
        isSpecial
          ? "border-yellow-300/36 shadow-[0_18px_44px_rgba(250,204,21,0.11)]"
          : "border-cyan-400/20",
      )}
    >
      <div className="relative">
        <Link href={`/produto/${product.slug}`} prefetch={false} aria-label={product.name}>
          <ProductMedia product={product} priority={priority} />
        </Link>

        {cardSpecialLabel ? (
          <div className="absolute left-3 top-3 z-20 max-w-[calc(100%-6.5rem)] truncate rounded-full border border-yellow-200/60 bg-yellow-300/92 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.08em] text-slate-950 shadow-[0_10px_22px_rgba(250,204,21,0.18)] backdrop-blur">
            {cardSpecialLabel}
          </div>
        ) : null}

        <ProductQuickActions
          cartProduct={cartProduct}
          productId={product.id}
          productName={product.name}
        />
      </div>

      <div className="mt-4 flex flex-1 flex-col">
        <div className="flex min-h-6 flex-wrap items-center gap-2">
          <ProductStatusBadge
            className="h-6 rounded-full px-2.5 text-[10px] tracking-[0.04em]"
            status={product.status}
          />
          {specialPills.length > 1 ? (
            <span className="inline-flex h-6 items-center rounded-full border border-white/10 bg-slate-900/72 px-2 text-[10px] font-black text-slate-300">
              +{specialPills.length - 1}
            </span>
          ) : null}
        </div>

        <div className="mt-3 flex min-h-7 flex-wrap items-center gap-2">
          <p className="text-[11px] font-black uppercase tracking-[0.14em] text-sky-300">
            {product.franchise}
          </p>
          {product.supplierName && product.supplierSlug ? (
            <Link
              href={`/fornecedores/${product.supplierSlug}`}
              prefetch={false}
              className="rounded-full border border-cyan-300/12 bg-slate-900/80 px-2.5 py-1 text-[10px] font-bold text-slate-300 hover:border-cyan-200/32 hover:text-[var(--accent)]"
            >
              {product.supplierName}
            </Link>
          ) : null}
        </div>

        <Link
          href={`/produto/${product.slug}`}
          prefetch={false}
          className="mt-1 line-clamp-2 min-h-12 text-base font-black leading-6 text-slate-100 transition group-hover:text-white hover:text-[var(--accent)]"
        >
          {product.name}
        </Link>

        <p className="mt-2 min-h-5 text-xs font-medium text-slate-500">
          #{product.funkoNumber} · SKU {product.sku}
        </p>

        <div className="mt-3 flex flex-wrap gap-2 text-[11px]">
          <span className="inline-flex h-6 items-center rounded-full border border-white/10 bg-slate-900/72 px-2.5 font-semibold text-slate-300">
            {product.source}
          </span>
          {product.condition !== "Novo" ? (
            <span className="inline-flex h-6 items-center rounded-full border border-white/10 bg-slate-900/72 px-2.5 font-semibold text-slate-300">
              {product.condition}
            </span>
          ) : null}
        </div>

        <div className="mt-auto pt-5">
          <PriceDisplay
            marketPrice={product.marketPrice}
            price={product.price}
            size="sm"
          />

          <div className="mt-5">
            <a
              href={createProductWhatsAppUrl(product)}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-10 w-full min-w-0 items-center justify-center gap-2 rounded-xl border border-emerald-200/30 bg-emerald-500/90 px-3 text-xs font-black text-[#042f1a] shadow-[0_12px_26px_rgba(16,185,129,0.16)] transition hover:bg-emerald-400 hover:shadow-[0_14px_30px_rgba(16,185,129,0.22)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-200/80 focus-visible:ring-offset-2 focus-visible:ring-offset-[#030816]"
            >
              <MessageCircle size={15} aria-hidden="true" />
              Tenho interesse
            </a>
          </div>
        </div>
      </div>
    </article>
  );
}
