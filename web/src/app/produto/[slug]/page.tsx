import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { clsx } from "clsx";
import { MessageCircle, PackageCheck, Timer, Truck } from "lucide-react";
import { ProductStatusBadge } from "@/components/ui/status-badge";
import { CartButton } from "@/components/storefront/cart-button";
import { PriceDisplay } from "@/components/storefront/price-display";
import { ProductGallery } from "@/components/storefront/product-gallery";
import { ProductGrid } from "@/components/storefront/product-grid";
import { WishlistButton } from "@/components/storefront/wishlist-button";
import { getCatalogProductBySlug, getCatalogProducts } from "@/lib/catalog";
import { getProductVariantStatusMeta } from "@/lib/status-labels";
import { createProductWhatsAppUrl } from "@/lib/whatsapp";
import type { Product } from "@/types/product";

type Props = {
  params: Promise<{ slug: string }>;
};

function getSpecialPills(product: {
  specialLabel?: string;
  specialTags?: string[];
  type: string;
}) {
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

function getHowItWorks(productSource: string) {
  if (productSource === "Pronta-entrega") {
    return {
      icon: PackageCheck,
      title: "Reserva e envio",
      text: "Produto disponível para reserva via atendimento. Após confirmação, você acompanha o pedido pela sua conta.",
    };
  }

  if (productSource === "Pré-venda") {
    return {
      icon: Timer,
      title: "Pré-venda acompanhada",
      text: "Pré-vendas dependem de prazo do fornecedor e serão acompanhadas pelo sistema.",
    };
  }

  return {
    icon: Truck,
    title: "Encomenda sob consulta",
    text: "Confirmamos disponibilidade, prazo e condições pelo WhatsApp antes de fechar.",
  };
}

function uniqueRelatedProducts(products: Product[], currentProductId: string) {
  const seen = new Set<string>();

  return products.filter((product) => {
    if (product.id === currentProductId || seen.has(product.id)) {
      return false;
    }

    seen.add(product.id);
    return true;
  });
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
    alternates: {
      canonical: `/produto/${product.slug}`,
    },
    openGraph: {
      title: `${product.name} | Smart Funkos`,
      description: product.description,
      images: product.imageUrl ? [product.imageUrl] : ["/brand/SmartFunko.png"],
    },
  };
}

export default async function ProductPage({ params }: Props) {
  const { slug } = await params;
  const product = await getCatalogProductBySlug(slug);

  if (!product) {
    notFound();
  }

  const specialPills = getSpecialPills(product);
  const isSpecial = product.isSpecial || specialPills.length > 0;
  const howItWorks = getHowItWorks(product.source);
  const HowItWorksIcon = howItWorks.icon;
  const relatedGroups = await Promise.all([
    getCatalogProducts({
      pageSize: 8,
      query: product.franchise,
      sort: "specials_first",
    }),
    product.supplierSlug
      ? getCatalogProducts({
          pageSize: 8,
          supplier: product.supplierSlug,
          sort: "specials_first",
        })
      : Promise.resolve([]),
    product.category
      ? getCatalogProducts({
          category: product.category,
          pageSize: 8,
          sort: "specials_first",
          subcategory: product.subcategory,
        })
      : Promise.resolve([]),
    getCatalogProducts({
      filter: "specials",
      pageSize: 8,
      sort: "specials_first",
    }),
  ]);
  const relatedProducts = uniqueRelatedProducts(relatedGroups.flat(), product.id);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="grid gap-8 lg:grid-cols-[0.85fr_1.15fr]">
        <div className="max-w-xl">
          {isSpecial ? (
            <div className="mb-3 inline-flex rounded-full bg-yellow-300 px-4 py-2 text-xs font-black uppercase tracking-[0.12em] text-slate-950 shadow-[0_14px_30px_rgba(250,204,21,0.2)]">
              Produto Special
            </div>
          ) : null}
          <ProductGallery product={product} />
        </div>

        <section
          className={clsx(
            "rounded-lg border bg-[var(--surface)] p-5",
            isSpecial
              ? "border-yellow-300/50 shadow-[0_20px_60px_rgba(250,204,21,0.12)]"
              : "border-[var(--border)]",
          )}
        >
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

          <h1 className="mt-5 text-3xl font-black leading-tight text-[var(--foreground)] sm:text-4xl">
            {product.name}
          </h1>
          <p className="mt-2 text-sm text-[var(--muted)]">
            {product.franchise} · #{product.funkoNumber} · SKU {product.sku}
          </p>
          {product.supplierName && product.supplierSlug ? (
            <Link
              href={`/fornecedores/${product.supplierSlug}`}
              className="mt-3 inline-flex rounded-md bg-[var(--surface-strong)] px-3 py-1 text-xs font-semibold text-[var(--foreground)] hover:text-[var(--accent)]"
            >
              {product.supplierName}
            </Link>
          ) : null}

          <div className="mt-6 border-y border-[var(--border)] py-5">
            <PriceDisplay
              marketPrice={product.marketPrice}
              price={product.price}
              size="lg"
            />
          </div>

          <dl className="mt-5 grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="font-semibold text-[var(--foreground)]">Franquia</dt>
              <dd className="text-[var(--muted)]">{product.franchise}</dd>
            </div>
            <div>
              <dt className="font-semibold text-[var(--foreground)]">Número Funko</dt>
              <dd className="text-[var(--muted)]">#{product.funkoNumber}</dd>
            </div>
            <div>
              <dt className="font-semibold text-[var(--foreground)]">Categoria</dt>
              <dd className="text-[var(--muted)]">
                {[product.category, product.subcategory].filter(Boolean).join(" · ") || "Colecionável"}
              </dd>
            </div>
            <div>
              <dt className="font-semibold text-[var(--foreground)]">Fornecedor/collab</dt>
              <dd className="text-[var(--muted)]">{product.supplierName ?? "Smart Funkos"}</dd>
            </div>
            <div>
              <dt className="font-semibold text-[var(--foreground)]">Condição</dt>
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
              <dd className="text-[var(--muted)]">
                {getProductVariantStatusMeta(product.status).label}
              </dd>
            </div>
          </dl>

          <p className="mt-5 text-sm leading-6 text-[var(--muted)]">
            {product.description}
          </p>

          <div className="mt-6 grid gap-3 sm:grid-cols-[1fr_auto]">
            <a
              href={createProductWhatsAppUrl(product)}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-[var(--green)] px-5 text-sm font-black text-[#052e16] hover:brightness-110"
            >
              <MessageCircle size={18} aria-hidden="true" />
              Tenho interesse
            </a>
            <WishlistButton
              className="h-11 justify-center"
              productId={product.id}
              productName={product.name}
              showLabel
            />
          </div>
          <CartButton className="mt-3 w-full" product={product} />
        </section>
      </div>

      <section className="mt-8 grid gap-4 lg:grid-cols-[0.8fr_1.2fr]">
        <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5">
          <HowItWorksIcon className="text-[var(--yellow)]" size={24} aria-hidden="true" />
          <h2 className="mt-4 text-lg font-black text-[var(--foreground)]">
            {howItWorks.title}
          </h2>
          <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{howItWorks.text}</p>
        </div>
        <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5">
          <h2 className="text-lg font-black text-[var(--foreground)]">Próximos passos</h2>
          <div className="mt-4 grid gap-3 text-sm text-[var(--muted)] sm:grid-cols-3">
            <p>1. Envie interesse pelo WhatsApp com SKU e link preenchidos.</p>
            <p>2. A equipe confirma disponibilidade, prazo e condição final.</p>
            <p>3. O pedido manual pode ser acompanhado pela sua conta.</p>
          </div>
        </div>
      </section>

      <section className="mt-10">
        <div className="mb-5">
          <h2 className="text-2xl font-black text-[var(--foreground)]">Produtos relacionados</h2>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Sugestões por franquia, categoria, fornecedor ou specials.
          </p>
        </div>
        <ProductGrid
          emptyDescription="Ainda não há produtos relacionados ativos para este item."
          emptyTitle="Nenhum relacionado por enquanto"
          products={relatedProducts.slice(0, 4)}
        />
      </section>
    </div>
  );
}
