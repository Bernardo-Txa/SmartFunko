import Link from "next/link";
import { MessageCircle } from "lucide-react";
import type { Product } from "@/lib/mock-data";
import { formatCurrency } from "@/lib/format";
import { createProductWhatsAppUrl } from "@/lib/whatsapp";
import { ProductStatusBadge } from "@/components/ui/status-badge";

const toneClass: Record<Product["tone"], string> = {
  teal: "bg-teal-700",
  pink: "bg-pink-700",
  amber: "bg-amber-700",
  indigo: "bg-indigo-700",
};

export function ProductArtwork({ product }: { product: Product }) {
  return (
    <div
      className={`flex aspect-[4/5] w-full items-center justify-center rounded-lg ${toneClass[product.tone]} p-4 text-white`}
      aria-label={product.name}
    >
      <div className="flex h-full w-full flex-col justify-between rounded-md border border-white/35 bg-white/10 p-4">
        <span className="text-xs font-semibold">{product.franchise}</span>
        <span className="text-5xl font-bold leading-none">#{product.funkoNumber}</span>
        <span className="text-xs font-semibold">{product.type}</span>
      </div>
    </div>
  );
}

export function ProductCard({ product }: { product: Product }) {
  return (
    <article className="rounded-lg border border-[var(--border)] bg-white p-3">
      <Link href={`/produto/${product.slug}`} aria-label={product.name}>
        <ProductArtwork product={product} />
      </Link>

      <div className="mt-4 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <Link
              href={`/produto/${product.slug}`}
              className="line-clamp-2 text-sm font-semibold text-[var(--foreground)] hover:text-[var(--accent)]"
            >
              {product.name}
            </Link>
            <p className="mt-1 text-xs text-[var(--muted)]">{product.sku}</p>
          </div>
          <ProductStatusBadge status={product.status} />
        </div>

        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="text-lg font-bold text-[var(--foreground)]">
              {formatCurrency(product.price)}
            </p>
            <p className="text-xs text-[var(--muted)]">{product.source}</p>
          </div>
          <a
            href={createProductWhatsAppUrl(product)}
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-10 items-center gap-2 rounded-md bg-[var(--accent)] px-3 text-sm font-semibold text-white hover:bg-[var(--accent-strong)]"
          >
            <MessageCircle size={16} aria-hidden="true" />
            WhatsApp
          </a>
        </div>
      </div>
    </article>
  );
}
