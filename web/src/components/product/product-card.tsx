import Image from "next/image";
import Link from "next/link";
import { clsx } from "clsx";
import { MessageCircle } from "lucide-react";
import type { Product } from "@/types/product";
import { formatCurrency } from "@/lib/format";
import { createProductWhatsAppUrl } from "@/lib/whatsapp";
import { ProductStatusBadge } from "@/components/ui/status-badge";

const toneClass: Record<Product["tone"], string> = {
  teal: "from-white via-cyan-50 to-slate-100",
  pink: "from-white via-pink-50 to-slate-100",
  amber: "from-white via-yellow-50 to-slate-100",
  indigo: "from-white via-indigo-50 to-slate-100",
};

function getSpecialPills(product: Product) {
  if (product.specialTags?.length) {
    return product.specialTags.slice(0, 3);
  }

  if (product.type !== "Comum") {
    return [product.type];
  }

  return [];
}

export function ProductArtwork({ product }: { product: Product }) {
  return (
    <div
      className={clsx(
        "relative flex aspect-[4/5] w-full items-center justify-center overflow-hidden rounded-[14px] bg-gradient-to-br p-4 text-slate-950",
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
  sizes = "(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw",
}: {
  priority?: boolean;
  product: Product;
  sizes?: string;
}) {
  if (!product.imageUrl) {
    return <ProductArtwork product={product} />;
  }

  return (
    <div className="relative flex aspect-[4/5] w-full items-center justify-center overflow-hidden rounded-[14px] bg-slate-50 shadow-[inset_0_0_0_1px_rgba(15,23,42,0.05)]">
      <Image
        src={product.imageUrl}
        alt={product.imageAlt ?? product.name}
        fill
        priority={priority}
        quality={72}
        sizes={sizes}
        className="object-contain p-4"
      />
    </div>
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

  return (
    <article className="flex h-full flex-col rounded-2xl border border-cyan-400/20 bg-[#030816] p-4 shadow-[0_18px_44px_rgba(2,6,23,0.26)]">
      <Link href={`/produto/${product.slug}`} prefetch={false} aria-label={product.name}>
        <ProductMedia product={product} priority={priority} />
      </Link>

      <div className="mt-4 flex flex-1 flex-col">
        <div className="flex min-h-7 flex-wrap gap-2">
          {specialPills.map((label) => (
            <span
              key={label}
              className="inline-flex h-7 items-center rounded-full bg-yellow-300 px-3 text-[11px] font-black uppercase text-slate-950"
            >
              {label}
            </span>
          ))}
          <ProductStatusBadge status={product.status} />
        </div>

        <p className="mt-3 text-xs font-black uppercase text-sky-300">
          {product.franchise}
        </p>

        <Link
          href={`/produto/${product.slug}`}
          prefetch={false}
          className="mt-1 line-clamp-2 min-h-12 text-base font-black leading-6 text-slate-100 hover:text-[var(--accent)]"
        >
          {product.name}
        </Link>

        <p className="mt-2 min-h-5 text-xs text-slate-400">
          #{product.funkoNumber} · SKU {product.sku}
        </p>

        <div className="mt-3 flex flex-wrap gap-2">
          <span className="inline-flex h-7 items-center rounded-md bg-slate-800 px-2 text-xs font-semibold text-slate-300 ring-1 ring-slate-700">
            {product.source}
          </span>
          {product.condition !== "Novo" ? (
            <span className="inline-flex h-7 items-center rounded-md bg-slate-800 px-2 text-xs font-semibold text-slate-300 ring-1 ring-slate-700">
              {product.condition}
            </span>
          ) : null}
        </div>

        <div className="mt-auto pt-5">
          <p className="text-xl font-black text-slate-100">
            {formatCurrency(product.price)}
          </p>
          {product.marketPrice ? (
            <p className="mt-1 text-xs text-slate-500">
              Mercado {formatCurrency(product.marketPrice)}
            </p>
          ) : null}

          <a
            href={createProductWhatsAppUrl(product)}
            target="_blank"
            rel="noreferrer"
            className="mt-5 inline-flex h-11 w-full items-center justify-center gap-2 rounded-full bg-[var(--green)] px-4 text-sm font-black text-[#052e16] hover:brightness-110"
          >
            <MessageCircle size={16} aria-hidden="true" />
            WhatsApp
          </a>
        </div>
      </div>
    </article>
  );
}
