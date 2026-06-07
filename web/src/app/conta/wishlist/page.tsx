import type { Metadata } from "next";
import Link from "next/link";
import { Heart } from "lucide-react";
import { ProductGrid } from "@/components/storefront/product-grid";
import { WishlistRemoveButton } from "@/components/storefront/wishlist-remove-button";
import { formatCurrency } from "@/lib/format";
import { getCatalogProductBySlug } from "@/lib/catalog";
import { requireUserPage } from "@/server/auth/require-user-page";
import { WishlistService } from "@/server/wishlist/wishlist-service";
import type { Product } from "@/types/product";

export const metadata: Metadata = {
  title: "Lista de desejos",
  description: "Favoritos e desejos do cliente na Smart Funkos.",
};

type WishlistRow = {
  created_at: string;
  desired_price: number | null;
  id: string;
  notes: string | null;
  priority: "low" | "medium" | "high";
  product_id: string;
  products?: {
    id: string;
    main_image_url: string | null;
    name: string;
    slug: string;
  } | null;
};

const priorityLabels: Record<WishlistRow["priority"], string> = {
  high: "Alta",
  low: "Baixa",
  medium: "Média",
};

function isProduct(product: Product | undefined): product is Product {
  return Boolean(product);
}

export default async function AccountWishlistPage() {
  const { customer } = await requireUserPage("/conta/wishlist");

  if (!customer) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold text-[var(--foreground)]">Lista de desejos</h1>
        <p className="mt-2 text-sm text-[var(--muted)]">
          Nenhum cadastro de cliente vinculado a este login ainda.
        </p>
      </div>
    );
  }

  const wishlist = (await new WishlistService().listWishlist(customer.id)) as unknown as WishlistRow[];
  const products = (
    await Promise.all(
      wishlist.map((item) =>
        item.products?.slug ? getCatalogProductBySlug(item.products.slug) : Promise.resolve(undefined),
      ),
    )
  ).filter(isProduct);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Heart className="text-pink-200" size={24} aria-hidden="true" />
            <h1 className="text-3xl font-bold text-[var(--foreground)]">Lista de desejos</h1>
          </div>
          <p className="mt-2 text-sm text-[var(--muted)]">
            Favoritos salvos no seu cadastro e usados como inteligência de demanda pela Smart Funkos.
          </p>
        </div>
        <Link
          href="/catalogo"
          prefetch={false}
          className="inline-flex h-10 w-fit items-center rounded-full bg-[var(--yellow)] px-4 text-sm font-black text-[#020617] hover:brightness-110"
        >
          Ver catálogo
        </Link>
      </div>

      {wishlist.length > 0 ? (
        <section className="mb-6 grid gap-3">
          {wishlist.map((item) => (
            <article
              key={item.id}
              className="flex flex-col gap-3 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <strong className="text-sm text-[var(--foreground)]">
                  {item.products?.name ?? "Produto removido do catálogo público"}
                </strong>
                <p className="mt-1 text-xs text-[var(--muted)]">
                  Prioridade {priorityLabels[item.priority]}{" "}
                  {item.desired_price ? `· preço desejado ${formatCurrency(Number(item.desired_price))}` : ""}
                </p>
              </div>
              <WishlistRemoveButton itemId={item.id} />
            </article>
          ))}
        </section>
      ) : null}

      <ProductGrid
        emptyDescription="Você ainda não adicionou produtos à sua lista de desejos."
        emptyTitle="Sua lista está vazia"
        products={products}
      />
    </div>
  );
}
