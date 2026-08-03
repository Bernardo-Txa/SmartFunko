import Link from "next/link";
import { Award, Eye, LockKeyhole, MessageCircle, ShieldCheck } from "lucide-react";
import { SafeProductImage } from "@/components/product/safe-product-image";
import { RareImageFallback } from "@/components/acervo-raro/rare-image-fallback";
import { formatCurrency } from "@/lib/format";
import { canonicalUrl } from "@/lib/seo";
import { createWhatsAppTextUrl } from "@/lib/whatsapp";
import {
  getRareCollectibleInstallmentText,
  getRareCollectibleStatusLabel,
  type RareCollectible,
} from "@/server/rare-collectibles/rare-collectible-service";

const statusClassName: Record<RareCollectible["status"], string> = {
  archived: "border-slate-400/30 bg-slate-400/10 text-slate-200",
  available: "border-emerald-300/30 bg-emerald-400/12 text-emerald-100",
  draft: "border-slate-400/30 bg-slate-400/10 text-slate-200",
  reserved: "border-amber-200/34 bg-amber-300/12 text-amber-100",
  sold: "border-rose-200/30 bg-rose-400/12 text-rose-100",
};

function createRareCardWhatsAppUrl(item: RareCollectible) {
  return createWhatsAppTextUrl([
    `Olá! Tenho interesse na peça do Acervo Raro: ${item.name}.`,
    item.signerName ? `Autografante: ${item.signerName}` : undefined,
    `Preço: ${formatCurrency(item.price)}`,
    `Link: ${canonicalUrl(`/acervo-raro/${item.slug}`)}`,
    "",
    "Pode confirmar disponibilidade e condições?",
  ].filter((line): line is string => line !== undefined).join("\n"));
}

function cardDescription(item: RareCollectible) {
  const source = item.story || item.description;

  if (!source) {
    return "Peça de disponibilidade limitada com conferência individual pela Smart Funkos.";
  }

  return source.replace(/\s+/g, " ").trim();
}

export function RareCollectibleCard({ item }: { item: RareCollectible }) {
  const whatsappUrl = item.whatsappUrl || createRareCardWhatsAppUrl(item);

  return (
    <article className="group grid min-w-0 overflow-hidden rounded-lg border border-amber-200/20 bg-[#071020]/92 shadow-[0_24px_70px_rgba(2,6,23,0.28)] transition duration-300 hover:-translate-y-1 hover:border-amber-200/48 hover:shadow-[0_30px_90px_rgba(245,158,11,0.14)]">
      <Link
        href={`/acervo-raro/${item.slug}`}
        className="relative block overflow-hidden border-b border-amber-200/12 bg-[linear-gradient(145deg,rgba(251,191,36,0.08),rgba(2,6,23,0.88)_42%,rgba(14,116,144,0.10))] p-3"
      >
        {item.coverImageUrl ? (
          <SafeProductImage
            src={item.coverImageUrl}
            alt={item.name}
            fallback={<RareImageFallback label={item.category} />}
            sizes="(min-width: 1280px) 25vw, (min-width: 768px) 45vw, 100vw"
            imageClassName="p-5 transition duration-500 group-hover:scale-[1.045]"
          />
        ) : (
          <RareImageFallback label={item.category} />
        )}
        <div className="absolute left-5 top-5 flex flex-wrap gap-2">
          <span className={`rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.08em] ${statusClassName[item.status]}`}>
            {getRareCollectibleStatusLabel(item.status)}
          </span>
        </div>
        <span className="absolute bottom-5 right-5 inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/14 bg-slate-950/70 text-amber-100 shadow-[0_14px_34px_rgba(2,6,23,0.32)] backdrop-blur">
          <Award size={17} aria-hidden="true" />
        </span>
      </Link>

      <div className="grid gap-4 p-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-cyan-200/18 bg-cyan-300/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-cyan-100">
              {item.category}
            </span>
            <span className="inline-flex items-center gap-1 rounded-full border border-amber-200/24 bg-amber-200/8 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.08em] text-amber-100">
              <Award size={12} aria-hidden="true" />
              {item.badgeLabel}
            </span>
          </div>
          <h2 className="mt-3 line-clamp-2 text-lg font-black leading-snug text-[var(--foreground)]">
            <Link href={`/acervo-raro/${item.slug}`} className="hover:text-amber-100">
              {item.shortTitle || item.name}
            </Link>
          </h2>
          {item.signerName ? (
            <p className="mt-2 text-sm font-semibold text-slate-300">
              Autografado por <span className="text-amber-100">{item.signerName}</span>
            </p>
          ) : null}
          <p className="mt-3 line-clamp-3 text-sm leading-6 text-slate-400">
            {cardDescription(item)}
          </p>
        </div>

        <div className="grid gap-3 rounded-md border border-amber-200/14 bg-slate-950/56 p-3">
          <div className="flex items-end justify-between gap-3">
            <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">
              <LockKeyhole size={14} aria-hidden="true" className="text-amber-100" />
              Peça única
            </span>
            <strong className="text-xl font-black text-[var(--foreground)]">
              {formatCurrency(item.price)}
            </strong>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-semibold text-slate-400">
            <span>{getRareCollectibleInstallmentText(item)}</span>
            <span className="inline-flex items-center gap-1 text-emerald-100">
              <ShieldCheck size={13} aria-hidden="true" />
              Autenticidade
            </span>
          </div>
        </div>

        <div className="grid gap-2 sm:grid-cols-2">
          <Link
            href={`/acervo-raro/${item.slug}`}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-amber-200/28 px-4 text-sm font-black text-amber-100 hover:bg-amber-200/8"
          >
            <Eye size={16} aria-hidden="true" />
            Ver detalhes
          </Link>
          <Link
            href={whatsappUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-amber-200 px-4 text-sm font-black text-slate-950 hover:bg-amber-100"
          >
            <MessageCircle size={16} aria-hidden="true" />
            Tenho interesse
          </Link>
        </div>
      </div>
    </article>
  );
}
