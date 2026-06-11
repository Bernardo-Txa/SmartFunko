import type { Metadata } from "next";
import Link from "next/link";
import { Heart } from "lucide-react";
import { clsx } from "clsx";
import { ProductMedia } from "@/components/product/product-card";
import { CartButton } from "@/components/storefront/cart-button";
import { EmptyState } from "@/components/storefront/empty-state";
import { WishlistRemoveButton } from "@/components/storefront/wishlist-remove-button";
import { PriceDisplay } from "@/components/storefront/price-display";
import { ProductStatusBadge } from "@/components/ui/status-badge";
import { requireUserPage } from "@/server/auth/require-user-page";
import { WishlistService, type WishlistProductListItem } from "@/server/wishlist/wishlist-service";
import type { Product } from "@/types/product";

export const metadata: Metadata = {
  title: "Minha lista de desejos",
  description: "Favoritos e desejos do cliente na Smart Funkos.",
};

function UnlinkedCustomerState() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="rounded-xl border border-cyan-300/18 bg-[#030816] p-6 shadow-[0_24px_70px_rgba(2,6,23,0.28)]">
        <h1 className="text-3xl font-black text-[var(--foreground)]">Minha lista de desejos</h1>
        <p className="mt-2 text-sm text-[var(--muted)]">
          Nenhum cadastro de cliente vinculado a este login ainda.
        </p>
      </div>
    </div>
  );
}

function WishlistErrorState() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="rounded-xl border border-red-300/24 bg-red-950/20 p-6">
        <h1 className="text-3xl font-black text-[var(--foreground)]">Minha lista de desejos</h1>
        <p className="mt-2 text-sm text-red-100">
          Não foi possível carregar sua lista agora. Tente novamente em instantes.
        </p>
      </div>
    </div>
  );
}

function mapWishlistProduct(product: NonNullable<WishlistProductListItem["product"]>): Product {
  return {
    category: product.category ?? undefined,
    condition: "Novo",
    description: "Produto Smart Funkos salvo na sua lista de desejos.",
    franchise: product.franchise ?? product.category ?? "Smart Funkos",
    funkoNumber: product.funkoNumber ?? "000",
    id: product.id,
    imageAlt: product.name,
    imageUrl: product.imageUrl ?? undefined,
    isSpecial: product.isSpecial,
    name: product.name,
    price: product.currentPrice ?? 0,
    sku: product.sku ?? product.slug,
    slug: product.slug,
    source:
      product.source === "preorder"
        ? "Pré-venda"
        : product.source === "national"
          ? "Encomenda nacional"
          : product.source === "international"
            ? "Importado"
            : "Pronta-entrega",
    specialLabel: product.specialLabel ?? undefined,
    specialTags: product.specialTags,
    status:
      product.status === "hidden" || product.status === null
        ? "sold_out"
        : product.status,
    tone: "teal",
    type: product.isSpecial ? "Especial" : "Comum",
    variantId: product.variantId ?? undefined,
  };
}

function getSpecialPills(product: Product) {
  const pills = [
    product.specialLabel,
    ...(product.specialTags ?? []),
    product.type !== "Comum" ? product.type : undefined,
  ].filter(Boolean) as string[];

  return Array.from(new Set(pills)).slice(0, 3);
}

function WishlistCard({ item }: { item: WishlistProductListItem }) {
  const product = item.product;

  if (!product) {
    return (
      <article className="relative flex h-full flex-col rounded-2xl border border-cyan-400/20 bg-[#030816] p-4 shadow-[0_18px_44px_rgba(2,6,23,0.26)]">
        <h2 className="text-lg font-black text-slate-100">Produto removido do catálogo público</h2>
        <p className="mt-2 text-sm text-slate-400">
          Este desejo continua registrado, mas o produto não está mais disponível para visualização.
        </p>
        <div className="mt-auto pt-5">
          <WishlistRemoveButton itemId={item.id} />
        </div>
      </article>
    );
  }

  const catalogProduct = mapWishlistProduct(product);
  const specialPills = getSpecialPills(catalogProduct);
  const isSpecial = catalogProduct.isSpecial || specialPills.length > 0;
  const cartProduct = {
    id: catalogProduct.id,
    imageUrl: catalogProduct.imageUrl,
    name: catalogProduct.name,
    price: catalogProduct.price,
    sku: catalogProduct.sku,
    slug: catalogProduct.slug,
    variantId: catalogProduct.variantId,
  };

  return (
    <article
      className={clsx(
        "relative flex h-full flex-col rounded-2xl border bg-[#030816] p-4 shadow-[0_18px_44px_rgba(2,6,23,0.26)]",
        isSpecial
          ? "border-yellow-300/55 shadow-[0_20px_54px_rgba(250,204,21,0.16)]"
          : "border-cyan-400/20",
      )}
    >
      {isSpecial ? (
        <div className="absolute right-3 top-3 z-20 rounded-full bg-yellow-300 px-3 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-slate-950 shadow-[0_10px_22px_rgba(250,204,21,0.22)]">
          Special
        </div>
      ) : null}

      <Link href={`/produto/${catalogProduct.slug}`} prefetch={false} aria-label={catalogProduct.name}>
        <ProductMedia
          product={catalogProduct}
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 240px"
        />
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
          <ProductStatusBadge status={catalogProduct.status} />
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <p className="text-xs font-black uppercase text-sky-300">
            {catalogProduct.franchise}
          </p>
        </div>

        <Link
          href={`/produto/${catalogProduct.slug}`}
          prefetch={false}
          className="mt-1 line-clamp-2 min-h-12 text-base font-black leading-6 text-slate-100 hover:text-[var(--accent)]"
        >
          {catalogProduct.name}
        </Link>

        <div className="mt-3 flex flex-wrap gap-2">
          <span className="inline-flex h-7 items-center rounded-md bg-slate-800 px-2 text-xs font-semibold text-slate-300 ring-1 ring-slate-700">
            {catalogProduct.source}
          </span>
        </div>

        {item.notes ? (
          <p className="mt-3 line-clamp-2 min-h-5 text-xs text-slate-400">{item.notes}</p>
        ) : (
          <p className="mt-3 min-h-5 text-xs text-slate-500">Salvo na lista de desejos</p>
        )}

        <div className="mt-auto pt-5">
          <PriceDisplay
            price={catalogProduct.price}
            size="sm"
          />

          <div className="mt-5 grid gap-2">
            <CartButton
              className="h-11 w-full rounded-lg bg-[var(--green)] px-3 text-xs text-[#052e16] hover:brightness-110"
              label="Comprar"
              product={cartProduct}
            />
            <WishlistRemoveButton itemId={item.id} />
          </div>
        </div>
      </div>
    </article>
  );
}

export default async function AccountWishlistPage() {
  const { customer } = await requireUserPage("/conta/wishlist");

  if (!customer) {
    return <UnlinkedCustomerState />;
  }

  let wishlist: WishlistProductListItem[];

  try {
    wishlist = await new WishlistService().listWishlistWithProducts(customer.id);
  } catch {
    return <WishlistErrorState />;
  }

  const totalItems = wishlist.length;
  const totalLabel = totalItems === 1 ? "1 item salvo" : `${totalItems} itens salvos`;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <header className="rounded-2xl border border-cyan-300/18 bg-[#030816]/90 px-5 py-4 shadow-[0_18px_54px_rgba(2,6,23,0.24)] sm:px-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-3">
              <span className="inline-grid h-10 w-10 place-items-center rounded-full border border-pink-300/24 bg-pink-500/10">
                <Heart className="text-pink-200" size={19} aria-hidden="true" />
              </span>
              <div>
                <h1 className="text-2xl font-black leading-tight text-[var(--foreground)] sm:text-3xl">
                  Minha lista de desejos
                </h1>
                <p className="mt-1 max-w-2xl text-sm leading-6 text-[var(--muted)]">
                  Produtos salvos para acompanhar e comprar depois.
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <span className="inline-flex h-10 items-center rounded-full border border-cyan-300/20 bg-slate-950/70 px-4 text-sm font-black text-cyan-100">
              {totalLabel}
            </span>
            <Link
              href="/catalogo"
              prefetch={false}
              className="inline-flex h-11 items-center justify-center rounded-full border border-yellow-300/45 px-4 text-sm font-black text-yellow-100 hover:bg-yellow-300/12"
            >
              Ver catálogo
            </Link>
          </div>
        </div>
      </header>

      {wishlist.length === 0 ? (
        <div className="mt-6">
          <EmptyState
            actionHref="/catalogo"
            actionLabel="Ver catálogo"
            description="Explore o catálogo e toque no coração para guardar os produtos que quer acompanhar."
            title="Você ainda não salvou nenhum desejo."
          />
        </div>
      ) : (
        <section className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {wishlist.map((item) => (
            <WishlistCard key={item.id} item={item} />
          ))}
        </section>
      )}
    </div>
  );
}
