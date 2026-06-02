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
      <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(255,255,255,0.045)_1px,transparent_1px),linear-gradient(0deg,rgba(255,255,255,0.035)_1px,transparent_1px)] bg-[length:28px_28px]" />
      <div className="absolute inset-x-8 bottom-5 h-12 rounded-full bg-cyan-300/25 blur-2xl" />
      <div className="absolute left-4 top-4 rounded-full border border-cyan-200/20 bg-slate-950/54 px-3 py-1 text-xs font-bold text-cyan-100 backdrop-blur">
        #{product.funkoNumber}
      </div>
      <div className="relative z-10 flex h-[72%] w-[68%] flex-col justify-between rounded-[22px] border border-cyan-200/24 bg-slate-950/68 p-4 shadow-[0_26px_28px_rgba(0,0,0,0.34)] backdrop-blur">
        <div>
          <span className="inline-flex rounded-full bg-white px-3 py-1 text-xl font-black leading-none text-slate-950">
            POP
          </span>
          <p className="mt-3 text-xs font-bold uppercase tracking-[0.18em] text-cyan-100">
            {product.franchise}
          </p>
        </div>
        <div>
          <strong className="block text-5xl font-black leading-none text-white">
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
