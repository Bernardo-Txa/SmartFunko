import Image from "next/image";
import Link from "next/link";
import { MessageCircle } from "lucide-react";
import type { Product } from "@/lib/mock-data";
import { formatCurrency } from "@/lib/format";
import { createProductWhatsAppUrl } from "@/lib/whatsapp";
import { ProductStatusBadge } from "@/components/ui/status-badge";

const toneClass: Record<Product["tone"], string> = {
  teal: "from-cyan-400/24 via-slate-950 to-blue-700/28",
  pink: "from-pink-500/30 via-slate-950 to-purple-700/30",
  amber: "from-yellow-300/26 via-slate-950 to-orange-600/24",
  indigo: "from-indigo-400/30 via-slate-950 to-cyan-700/20",
};

export function ProductArtwork({ product }: { product: Product }) {
  return (
    <div
      className={`relative flex aspect-[4/5] w-full items-center justify-center overflow-hidden rounded-lg bg-gradient-to-br ${toneClass[product.tone]} p-4 text-white shadow-[inset_0_0_0_1px_rgba(125,211,252,0.18)]`}
      aria-label={product.name}
    >
      <div className="absolute inset-x-8 bottom-5 h-12 rounded-full bg-cyan-300/25 blur-2xl" />
      <div className="absolute left-4 top-4 rounded-full border border-cyan-200/20 bg-slate-950/54 px-3 py-1 text-xs font-bold text-cyan-100 backdrop-blur">
        #{product.funkoNumber}
      </div>
      <Image
        src={product.imageUrl}
        alt={product.name}
        width={600}
        height={600}
        className="relative z-10 h-[82%] w-[82%] object-contain drop-shadow-[0_24px_22px_rgba(0,0,0,0.42)]"
      />
    </div>
  );
}

export function ProductCard({ product }: { product: Product }) {
  return (
    <article className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3 shadow-[0_20px_55px_rgba(2,6,23,0.24)] backdrop-blur">
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
            className="inline-flex h-10 items-center gap-2 rounded-full bg-[var(--green)] px-3 text-sm font-bold text-[#052e16] hover:brightness-110"
          >
            <MessageCircle size={16} aria-hidden="true" />
            WhatsApp
          </a>
        </div>
      </div>
    </article>
  );
}
