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

export function ProductArtwork({
  aspectClassName = "aspect-[4/5]",
  compact = false,
  product,
}: {
  aspectClassName?: string;
  compact?: boolean;
  product: Product;
}) {
  return (
    <div
      className={clsx(
        "relative flex w-full items-center justify-center overflow-hidden rounded-[14px] bg-gradient-to-br text-slate-950",
        aspectClassName,
        compact ? "p-3" : "p-4",
        toneClass[product.tone],
      )}
      aria-label={product.name}
    >
      <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(15,23,42,0.035)_1px,transparent_1px),linear-gradient(0deg,rgba(15,23,42,0.028)_1px,transparent_1px)] bg-[length:28px_28px]" />
      <div
        className={clsx(
          "relative z-10 flex flex-col justify-between rounded-2xl border border-slate-200 bg-white/80 shadow-[0_18px_32px_rgba(15,23,42,0.16)]",
          compact ? "h-[76%] w-[66%] p-3" : "h-[72%] w-[68%] p-4",
        )}
      >
        <div>
          <span
            className={clsx(
              "inline-flex rounded-full bg-slate-950 font-black leading-none text-white",
              compact ? "px-2.5 py-0.5 text-base" : "px-3 py-1 text-xl",
            )}
          >
            POP
          </span>
          <p className={clsx("font-bold uppercase text-slate-500", compact ? "mt-2 text-[10px]" : "mt-3 text-xs")}>
            {product.franchise}
          </p>
        </div>
        <div>
          <strong
            className={clsx(
              "block font-black leading-none text-slate-950",
              compact ? "text-3xl" : "text-5xl",
            )}
          >
            {product.funkoNumber}
          </strong>
          <span className={clsx("mt-2 inline-flex rounded-full bg-[var(--yellow)] px-2 font-black text-slate-950", compact ? "py-0.5 text-[10px]" : "py-1 text-xs")}>
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
    return (
      <ProductArtwork
        aspectClassName="aspect-[4/3]"
        compact
        product={product}
      />
    );
  }

  return (
    <SafeProductImage
      src={product.imageUrl}
      alt={product.imageAlt ?? product.name}
      aspectClassName="aspect-[4/3]"
      fallback={
        <ProductArtwork
          aspectClassName="aspect-[4/3]"
          compact
          product={product}
        />
      }
      imageClassName="p-2.5 sm:p-3"
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
        "group relative flex h-full flex-col rounded-2xl border bg-[#030816]/96 p-3 shadow-[0_12px_30px_rgba(2,6,23,0.22)] transition duration-200 hover:-translate-y-0.5 hover:border-cyan-200/30 hover:shadow-[0_18px_38px_rgba(2,6,23,0.30)]",
        isSpecial
          ? "border-yellow-300/32 shadow-[0_14px_34px_rgba(250,204,21,0.10)]"
          : "border-cyan-400/20",
      )}
    >
      <div className="relative">
        <Link href={`/produto/${product.slug}`} prefetch={false} aria-label={product.name}>
          <ProductMedia product={product} priority={priority} />
        </Link>

        {cardSpecialLabel ? (
          <div className="absolute left-2.5 top-2.5 z-20 max-w-[calc(100%-5.75rem)] truncate rounded-full border border-yellow-200/55 bg-yellow-300/88 px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.08em] text-slate-950 shadow-[0_8px_16px_rgba(250,204,21,0.14)] backdrop-blur">
            {cardSpecialLabel}
          </div>
        ) : null}

        <ProductQuickActions
          cartProduct={cartProduct}
          productId={product.id}
          productName={product.name}
        />
      </div>

      <div className="mt-3 flex flex-1 flex-col">
        <div className="flex min-h-5 flex-wrap items-center gap-1.5">
          <ProductStatusBadge
            className="h-5 rounded-full px-2 text-[9px] tracking-[0.04em]"
            status={product.status}
          />
          {specialPills.length > 1 ? (
            <span className="inline-flex h-5 items-center rounded-full border border-white/10 bg-slate-900/64 px-1.5 text-[9px] font-black text-slate-400">
              +{specialPills.length - 1}
            </span>
          ) : null}
        </div>

        <div className="mt-2 flex min-h-5 flex-wrap items-center gap-1.5">
          <p className="text-[10px] font-black uppercase tracking-[0.13em] text-sky-300/90">
            {product.franchise}
          </p>
          {product.supplierName && product.supplierSlug ? (
            <Link
              href={`/fornecedores/${product.supplierSlug}`}
              prefetch={false}
              className="rounded-full border border-cyan-300/10 bg-slate-900/70 px-2 py-0.5 text-[9px] font-bold text-slate-400 hover:border-cyan-200/28 hover:text-[var(--accent)]"
            >
              {product.supplierName}
            </Link>
          ) : null}
        </div>

        <Link
          href={`/produto/${product.slug}`}
          prefetch={false}
          className="mt-1 line-clamp-2 min-h-10 text-sm font-black leading-5 text-slate-100 transition group-hover:text-white hover:text-[var(--accent)]"
        >
          {product.name}
        </Link>

        <p className="mt-1.5 min-h-4 text-[11px] font-medium text-slate-500">
          #{product.funkoNumber} · SKU {product.sku}
        </p>

        <div className="mt-2 flex flex-wrap gap-1.5 text-[10px]">
          <span className="inline-flex h-5 items-center rounded-full border border-white/8 bg-slate-900/58 px-2 font-semibold text-slate-400">
            {product.source}
          </span>
          {product.condition !== "Novo" ? (
            <span className="inline-flex h-5 items-center rounded-full border border-white/8 bg-slate-900/58 px-2 font-semibold text-slate-400">
              {product.condition}
            </span>
          ) : null}
        </div>

        <div className="mt-auto pt-3.5">
          <PriceDisplay
            marketPrice={product.marketPrice}
            price={product.price}
            size="sm"
          />

          <div className="mt-3">
            <a
              href={createProductWhatsAppUrl(product)}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-9 w-full min-w-0 items-center justify-center gap-1.5 rounded-lg border border-emerald-300/24 bg-emerald-500/16 px-3 text-[11px] font-black text-emerald-100 shadow-[0_8px_18px_rgba(16,185,129,0.10)] transition hover:border-emerald-200/36 hover:bg-emerald-500/24 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-200/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#030816]"
            >
              <MessageCircle size={14} aria-hidden="true" />
              Tenho interesse
            </a>
          </div>
        </div>
      </div>
    </article>
  );
}
