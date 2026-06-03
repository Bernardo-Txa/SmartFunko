import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { clsx } from "clsx";
import { MessageCircle } from "lucide-react";
import { ProductMedia } from "@/components/product/product-card";
import { ProductStatusBadge } from "@/components/ui/status-badge";
import { formatCurrency } from "@/lib/format";
import { getCatalogProductBySlug } from "@/lib/catalog";
import { createProductWhatsAppUrl } from "@/lib/whatsapp";

type Props = {
  params: Promise<{ slug: string }>;
};

const statusLabels = {
  available: "Disponivel",
  order_only: "Sob encomenda",
  preorder: "Pre-venda",
  sold_out: "Esgotado",
};

function getSpecialPills(product: {
  specialTags?: string[];
  type: string;
}) {
  if (product.specialTags?.length) {
    return product.specialTags;
  }

  if (product.type !== "Comum") {
    return [product.type];
  }

  return [];
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const product = await getCatalogProductBySlug(slug);

  if (!product) {
    return { title: "Produto" };
  }

  return {
    title: product.name,
    description: product.description,
  };
}

export default async function ProductPage({ params }: Props) {
  const { slug } = await params;
  const product = await getCatalogProductBySlug(slug);

  if (!product) {
    notFound();
  }

  const specialPills = getSpecialPills(product);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="grid gap-8 lg:grid-cols-[0.85fr_1.15fr]">
        <div className="max-w-xl">
          <ProductMedia
            product={product}
            priority
            sizes="(min-width: 1024px) 42vw, 100vw"
          />
          {product.images && product.images.length > 1 ? (
            <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
              {product.images.map((imageUrl, index) => (
                <div
                  key={imageUrl}
                  className={clsx(
                    "relative h-20 w-20 shrink-0 overflow-hidden rounded-md border bg-slate-950/50",
                    index === 0 ? "border-[var(--accent)]" : "border-[var(--border)]",
                  )}
                >
                  <Image
                    src={imageUrl}
                    alt={`${product.imageAlt ?? product.name} ${index + 1}`}
                    fill
                    sizes="80px"
                    className="object-contain p-2"
                  />
                </div>
              ))}
            </div>
          ) : null}
        </div>

        <section className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5">
          <div className="flex flex-wrap items-center gap-2">
            {specialPills.map((label) => (
              <span
                key={label}
                className="rounded-full bg-yellow-300 px-3 py-1 text-[11px] font-black uppercase text-slate-950"
              >
                {label}
              </span>
            ))}
            <ProductStatusBadge status={product.status} />
            <span className="rounded-md bg-[var(--surface-strong)] px-2 py-1 text-xs font-semibold text-[var(--muted)]">
              {product.source}
            </span>
          </div>

          <h1 className="mt-5 text-3xl font-bold leading-tight text-[var(--foreground)]">
            {product.name}
          </h1>
          <p className="mt-2 text-sm text-[var(--muted)]">
            {product.franchise} · #{product.funkoNumber} · {product.sku}
          </p>

          <div className="mt-6 border-y border-[var(--border)] py-5">
            <p className="text-3xl font-bold text-[var(--foreground)]">
              {formatCurrency(product.price)}
            </p>
            {product.marketPrice ? (
              <p className="mt-1 text-sm text-[var(--muted)]">
                Mercado: {formatCurrency(product.marketPrice)}
              </p>
            ) : null}
          </div>

          <dl className="mt-5 grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="font-semibold text-[var(--foreground)]">Condicao</dt>
              <dd className="text-[var(--muted)]">{product.condition}</dd>
            </div>
            <div>
              <dt className="font-semibold text-[var(--foreground)]">Tipo</dt>
              <dd className="text-[var(--muted)]">{product.type}</dd>
            </div>
            <div>
              <dt className="font-semibold text-[var(--foreground)]">Origem</dt>
              <dd className="text-[var(--muted)]">{product.source}</dd>
            </div>
            <div>
              <dt className="font-semibold text-[var(--foreground)]">Status</dt>
              <dd className="text-[var(--muted)]">{statusLabels[product.status]}</dd>
            </div>
          </dl>

          <p className="mt-5 text-sm leading-6 text-[var(--muted)]">
            {product.description}
          </p>

          <a
            href={createProductWhatsAppUrl(product)}
            target="_blank"
            rel="noreferrer"
            className="mt-6 inline-flex h-11 w-full items-center justify-center gap-2 rounded-full bg-[var(--green)] px-5 text-sm font-black text-[#052e16] hover:brightness-110 sm:w-auto"
          >
            <MessageCircle size={18} aria-hidden="true" />
            Comprar pelo WhatsApp
          </a>
        </section>
      </div>
    </div>
  );
}
