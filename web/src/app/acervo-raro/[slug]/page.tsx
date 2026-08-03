import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  Award,
  BadgeCheck,
  Box,
  Calendar,
  ExternalLink,
  Fingerprint,
  Gem,
  MessageCircle,
  ShieldCheck,
} from "lucide-react";
import { RareDetailGallery } from "@/components/acervo-raro/rare-detail-gallery";
import { formatCurrency, formatDate } from "@/lib/format";
import { absoluteUrl, canonicalUrl, cleanDescription, ogImages } from "@/lib/seo";
import { createWhatsAppTextUrl } from "@/lib/whatsapp";
import {
  getRareCollectibleInstallmentText,
  getRareCollectibleStatusLabel,
  RareCollectibleService,
  type RareCollectible,
} from "@/server/rare-collectibles/rare-collectible-service";

type Props = {
  params: Promise<{ slug: string }>;
};

function createRareWhatsAppUrl(item: RareCollectible) {
  const message = [
    `Olá! Tenho interesse na peça do Acervo Raro: ${item.name}.`,
    item.signerName ? `Autografante: ${item.signerName}` : undefined,
    item.serialNumber ? `Número de série: ${item.serialNumber}` : undefined,
    `Preço: ${formatCurrency(item.price)}`,
    `Link: ${canonicalUrl(`/acervo-raro/${item.slug}`)}`,
    "",
    "Pode confirmar disponibilidade e condições?",
  ]
    .filter((line): line is string => line !== undefined)
    .join("\n");

  return createWhatsAppTextUrl(message);
}

function DetailValue({
  label,
  value,
}: {
  label: string;
  value?: string | number | null;
}) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  return (
    <div className="rounded-md border border-white/8 bg-slate-950/34 p-3">
      <dt className="text-xs font-black uppercase tracking-[0.12em] text-slate-400">{label}</dt>
      <dd className="mt-1 text-sm font-semibold text-[var(--foreground)]">{value}</dd>
    </div>
  );
}

function DocumentImage({
  label,
  url,
}: {
  label: string;
  url?: string | null;
}) {
  if (!url) {
    return null;
  }

  return (
    <Link
      href={url}
      target="_blank"
      rel="noreferrer"
      className="group grid gap-2 rounded-lg border border-amber-200/18 bg-slate-950/46 p-3 hover:border-amber-100/50"
    >
      <div className="relative aspect-[4/3] overflow-hidden rounded-md bg-white">
        <Image
          src={url}
          alt={label}
          fill
          sizes="(min-width: 1024px) 22vw, 100vw"
          className="object-contain p-2 transition duration-300 group-hover:scale-[1.035]"
        />
      </div>
      <span className="inline-flex items-center justify-between gap-2 text-sm font-black text-[var(--foreground)]">
        {label}
        <ExternalLink size={15} aria-hidden="true" className="text-amber-100" />
      </span>
    </Link>
  );
}

function createJsonLd(item: RareCollectible) {
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    additionalProperty: [
      item.signerName
        ? {
            "@type": "PropertyValue",
            name: "Autografante",
            value: item.signerName,
          }
        : undefined,
      item.serialNumber
        ? {
            "@type": "PropertyValue",
            name: "Número de série",
            value: item.serialNumber,
          }
        : undefined,
      item.authenticationCode
        ? {
            "@type": "PropertyValue",
            name: "Código de autenticação",
            value: item.authenticationCode,
          }
        : undefined,
    ].filter(Boolean),
    brand: {
      "@type": "Brand",
      name: "Smart Funkos",
    },
    category: item.category,
    description: cleanDescription(item.description, item.story || "Peça do Acervo Raro Smart Funkos."),
    image: [item.coverImageUrl, ...item.galleryImages.map((image) => image.imageUrl)]
      .filter((url): url is string => Boolean(url))
      .map(absoluteUrl),
    name: item.name,
    offers: {
      "@type": "Offer",
      availability: item.status === "available" ? "https://schema.org/InStock" : "https://schema.org/LimitedAvailability",
      price: item.price.toFixed(2),
      priceCurrency: "BRL",
      url: canonicalUrl(`/acervo-raro/${item.slug}`),
    },
    sku: item.sku,
    url: canonicalUrl(`/acervo-raro/${item.slug}`),
  };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const item = await new RareCollectibleService().getPublicRareCollectibleBySlug(slug);

  if (!item) {
    return {
      title: {
        absolute: "Peça não encontrada — Acervo Raro",
      },
      robots: {
        follow: false,
        index: false,
      },
    };
  }

  const title = item.seoTitle || `${item.name} — Acervo Raro`;
  const description = cleanDescription(
    item.seoDescription || item.description || item.story,
    "Peça única do Acervo Raro Smart Funkos.",
  );

  return {
    title: {
      absolute: title,
    },
    description,
    alternates: {
      canonical: `/acervo-raro/${item.slug}`,
    },
    openGraph: {
      description,
      images: ogImages(item.shareImageUrl || item.coverImageUrl, item.name),
      title,
      type: "website",
      url: `/acervo-raro/${item.slug}`,
    },
    twitter: {
      card: "summary_large_image",
      description,
      images: [item.shareImageUrl || item.coverImageUrl || "/og/smart-funkos-og.png"],
      title,
    },
  };
}

export default async function AcervoRaroDetailPage({ params }: Props) {
  const { slug } = await params;
  const item = await new RareCollectibleService().getPublicRareCollectibleBySlug(slug);

  if (!item) {
    notFound();
  }

  const whatsappUrl = item.whatsappUrl || createRareWhatsAppUrl(item);
  const primaryActionHref = item.purchaseMode === "checkout" && item.checkoutUrl ? item.checkoutUrl : whatsappUrl;
  const primaryActionLabel = item.purchaseMode === "checkout" && item.checkoutUrl ? "Comprar peça" : "Consultar disponibilidade";
  const documentImages = [
    { label: "Certificado", url: item.certificateImageUrl },
    { label: "Número de série", url: item.serialImageUrl },
    { label: "Código de autenticação", url: item.authenticationImageUrl },
    { label: "Embalagem", url: item.packagingImageUrl },
  ];

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(createJsonLd(item)) }}
      />
      <Link
        href="/acervo-raro"
        className="mb-5 inline-flex text-sm font-bold text-amber-100 hover:text-amber-50"
      >
        Voltar ao Acervo Raro
      </Link>

      <section className="grid gap-8 lg:grid-cols-[0.92fr_1.08fr]">
        <div className="lg:sticky lg:top-28 lg:self-start">
          <RareDetailGallery
            coverImageUrl={item.coverImageUrl}
            images={item.galleryImages}
            title={item.name}
          />
        </div>

        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-2 rounded-full border border-amber-200/30 bg-amber-200/10 px-3 py-1 text-xs font-black uppercase tracking-[0.14em] text-amber-100">
              <Gem size={14} aria-hidden="true" />
              Acervo Raro
            </span>
            <span className="rounded-full border border-white/12 bg-white/6 px-3 py-1 text-xs font-black uppercase tracking-[0.12em] text-slate-200">
              {getRareCollectibleStatusLabel(item.status)}
            </span>
            <span className="rounded-full border border-emerald-200/20 bg-emerald-400/10 px-3 py-1 text-xs font-black uppercase tracking-[0.12em] text-emerald-100">
              {item.badgeLabel}
            </span>
          </div>

          <h1 className="mt-5 text-4xl font-black leading-tight text-[var(--foreground)] sm:text-5xl">
            {item.name}
          </h1>
          <p className="mt-3 max-w-2xl text-base leading-7 text-[var(--muted)]">
            {item.shortTitle || item.story || "Peça única com disponibilidade limitada no Acervo Raro Smart Funkos."}
          </p>

          <div className="mt-6 rounded-lg border border-amber-200/18 bg-slate-950/44 p-5">
            <span className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">
              Valor da peça
            </span>
            <strong className="mt-2 block text-4xl font-black text-[var(--foreground)]">
              {formatCurrency(item.price)}
            </strong>
            <p className="mt-1 text-sm font-semibold text-slate-400">
              {getRareCollectibleInstallmentText(item)}
            </p>
            {item.availabilityMessage ? (
              <p className="mt-4 rounded-md border border-amber-200/18 bg-amber-200/8 px-3 py-2 text-sm font-semibold text-amber-100">
                {item.availabilityMessage}
              </p>
            ) : null}
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-[1fr_auto]">
            <Link
              href={primaryActionHref}
              target={primaryActionHref.startsWith("http") ? "_blank" : undefined}
              rel={primaryActionHref.startsWith("http") ? "noreferrer" : undefined}
              className="inline-flex h-12 items-center justify-center gap-2 rounded-md bg-amber-200 px-5 text-sm font-black text-slate-950 shadow-[0_18px_42px_rgba(245,158,11,0.16)] hover:bg-amber-100"
            >
              <BadgeCheck size={18} aria-hidden="true" />
              {primaryActionLabel}
            </Link>
            <Link
              href={whatsappUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-12 items-center justify-center gap-2 rounded-md border border-emerald-200/30 bg-emerald-500/90 px-5 text-sm font-black text-[#042f1a] hover:bg-emerald-400"
            >
              <MessageCircle size={18} aria-hidden="true" />
              WhatsApp
            </Link>
          </div>

          <p className="mt-4 text-xs font-semibold text-slate-400">
            Disponibilidade limitada. Reservas e compras dependem de confirmação final da Smart Funkos.
          </p>
        </div>
      </section>

      <section className="mt-10 grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
        <article className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5">
          <h2 className="text-2xl font-black text-[var(--foreground)]">História da peça</h2>
          <div className="mt-4 grid gap-4 text-sm leading-7 text-[var(--muted)]">
            {item.story ? <p className="whitespace-pre-line">{item.story}</p> : null}
            {item.description ? <p className="whitespace-pre-line">{item.description}</p> : null}
            {!item.story && !item.description ? (
              <p>Detalhes completos ainda não foram publicados para esta peça.</p>
            ) : null}
          </div>
        </article>

        <article className="rounded-lg border border-amber-200/20 bg-slate-950/44 p-5">
          <h2 className="flex items-center gap-2 text-2xl font-black text-[var(--foreground)]">
            <ShieldCheck size={24} aria-hidden="true" className="text-amber-100" />
            Garantia de autenticidade
          </h2>
          <dl className="mt-5 grid gap-3">
            <DetailValue label="Certificadora" value={item.certifierName} />
            <DetailValue label="Tipo de certificado" value={item.certificateType} />
            <DetailValue label="Código verificável" value={item.authenticationCode} />
            <DetailValue label="Número de série" value={item.serialNumber} />
            <DetailValue label="Procedência" value={item.authenticityNotes} />
          </dl>
          {item.verificationUrl ? (
            <Link
              href={item.verificationUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-4 inline-flex h-10 items-center justify-center gap-2 rounded-md border border-amber-200/24 px-4 text-sm font-black text-amber-100 hover:bg-amber-200/8"
            >
              <Fingerprint size={16} aria-hidden="true" />
              Verificar certificado
            </Link>
          ) : null}
        </article>
      </section>

      <section className="mt-6 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5">
        <h2 className="text-2xl font-black text-[var(--foreground)]">Detalhes técnicos</h2>
        <dl className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <DetailValue label="Categoria" value={item.category} />
          <DetailValue label="Autografante" value={item.signerName} />
          <DetailValue label="Relevância" value={item.signerRole} />
          <DetailValue label="Data do autógrafo" value={item.autographDate ? formatDate(item.autographDate) : null} />
          <DetailValue label="Local/evento" value={item.autographLocation} />
          <DetailValue label="Ano" value={item.collectibleYear} />
          <DetailValue label="Edição" value={item.edition} />
          <DetailValue label="Quantidade" value={item.quantityAvailable} />
          <DetailValue label="Conservação" value={item.conditionNotes} />
        </dl>
        {item.includedItems.length > 0 ? (
          <div className="mt-5 rounded-md border border-white/8 bg-slate-950/34 p-4">
            <h3 className="flex items-center gap-2 font-black text-[var(--foreground)]">
              <Box size={18} aria-hidden="true" className="text-amber-100" />
              Itens inclusos
            </h3>
            <ul className="mt-3 grid gap-2 text-sm text-[var(--muted)] sm:grid-cols-2">
              {item.includedItems.map((includedItem) => (
                <li key={includedItem} className="rounded-md border border-white/8 bg-slate-950/28 px-3 py-2">
                  {includedItem}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </section>

      {documentImages.some((document) => document.url) ? (
        <section className="mt-6 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5">
          <h2 className="flex items-center gap-2 text-2xl font-black text-[var(--foreground)]">
            <Calendar size={23} aria-hidden="true" className="text-amber-100" />
            Documentos e registros visuais
          </h2>
          <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {documentImages.map((document) => (
              <DocumentImage key={document.label} label={document.label} url={document.url} />
            ))}
          </div>
        </section>
      ) : null}

      <section className="mt-8 rounded-lg border border-amber-200/18 bg-slate-950/44 p-5 text-center">
        <Award className="mx-auto text-amber-100" size={28} aria-hidden="true" />
        <h2 className="mt-3 text-xl font-black text-[var(--foreground)]">Peça de disponibilidade limitada</h2>
        <p className="mx-auto mt-2 max-w-2xl text-sm leading-6 text-[var(--muted)]">
          O Acervo Raro trabalha com itens únicos ou extremamente limitados. A confirmação de compra ou reserva é feita individualmente para preservar controle de procedência e disponibilidade.
        </p>
      </section>
    </main>
  );
}
