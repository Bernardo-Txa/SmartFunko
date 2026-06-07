import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Heart } from "lucide-react";
import { clsx } from "clsx";
import { EmptyState } from "@/components/storefront/empty-state";
import { WishlistItemEditForm } from "@/components/storefront/wishlist-item-edit-form";
import { WishlistRemoveButton } from "@/components/storefront/wishlist-remove-button";
import { formatCurrency, formatDate } from "@/lib/format";
import { requireUserPage } from "@/server/auth/require-user-page";
import { WishlistService, type WishlistProductListItem } from "@/server/wishlist/wishlist-service";

export const metadata: Metadata = {
  title: "Lista de desejos",
  description: "Favoritos e desejos do cliente na Smart Funkos.",
};

type WishlistFilter = "all" | "high" | "desired" | "ready" | "specials";

type Props = {
  searchParams?: Promise<{
    filter?: WishlistFilter;
  }>;
};

const filters: Array<{ label: string; value: WishlistFilter }> = [
  { label: "Todos", value: "all" },
  { label: "Alta prioridade", value: "high" },
  { label: "Com preço desejado", value: "desired" },
  { label: "Pronta-entrega", value: "ready" },
  { label: "Specials", value: "specials" },
];

const priorityLabels: Record<WishlistProductListItem["priority"], string> = {
  high: "Alta",
  low: "Baixa",
  medium: "Média",
};

function filterHref(filter: WishlistFilter) {
  return filter === "all" ? "/conta/wishlist" : `/conta/wishlist?filter=${filter}`;
}

function normalizeFilter(filter: WishlistFilter | undefined): WishlistFilter {
  return filters.some((option) => option.value === filter) ? filter ?? "all" : "all";
}

function itemMatchesFilter(item: WishlistProductListItem, filter: WishlistFilter) {
  if (filter === "high") {
    return item.priority === "high";
  }

  if (filter === "desired") {
    return item.desiredPrice !== null;
  }

  if (filter === "ready") {
    return item.product?.isReady === true;
  }

  if (filter === "specials") {
    return item.product?.isSpecial === true;
  }

  return true;
}

export default async function AccountWishlistPage({ searchParams }: Props) {
  const { customer } = await requireUserPage("/conta/wishlist");
  const params = await searchParams;
  const currentFilter = normalizeFilter(params?.filter);

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

  const wishlist = await new WishlistService().listWishlistWithProducts(customer.id);
  const filteredWishlist = wishlist.filter((item) => itemMatchesFilter(item, currentFilter));

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

      <nav className="mb-5 flex flex-wrap gap-2" aria-label="Filtros da lista de desejos">
        {filters.map((filter) => (
          <Link
            key={filter.value}
            href={filterHref(filter.value)}
            prefetch={false}
            className={clsx(
              "inline-flex h-9 items-center rounded-full border px-3 text-xs font-black",
              currentFilter === filter.value
                ? "border-pink-300/60 bg-pink-500/18 text-pink-100"
                : "border-[var(--border)] text-[var(--muted)] hover:bg-[var(--surface-strong)]",
            )}
          >
            {filter.label}
          </Link>
        ))}
      </nav>

      {filteredWishlist.length === 0 ? (
        <EmptyState
          actionHref={currentFilter === "all" ? "/catalogo" : "/conta/wishlist"}
          actionLabel={currentFilter === "all" ? "Ver catálogo" : "Limpar filtros"}
          description={
            currentFilter === "all"
              ? "Você ainda não adicionou produtos à sua lista de desejos."
              : "Nenhum favorito combina com este filtro."
          }
          title={currentFilter === "all" ? "Sua lista está vazia" : "Nenhum favorito encontrado"}
        />
      ) : (
        <section className="grid gap-4">
          {filteredWishlist.map((item) => (
            <article
              key={item.id}
              className="grid gap-4 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4 lg:grid-cols-[112px_1fr]"
            >
              <div className="relative h-28 w-28 overflow-hidden rounded-lg border border-[var(--border)] bg-white">
                {item.product?.imageUrl ? (
                  <Image
                    src={item.product.imageUrl}
                    alt={item.product.name}
                    fill
                    sizes="112px"
                    className="object-contain p-2"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center px-3 text-center text-xs font-bold text-slate-500">
                    Sem imagem
                  </div>
                )}
              </div>
              <div className="grid gap-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div>
                    {item.product ? (
                      <Link
                        href={`/produto/${item.product.slug}`}
                        className="text-lg font-black text-[var(--foreground)] hover:text-[var(--accent)]"
                      >
                        {item.product.name}
                      </Link>
                    ) : (
                      <h2 className="text-lg font-black text-[var(--foreground)]">
                        Produto removido do catálogo público
                      </h2>
                    )}
                    <p className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs font-semibold text-[var(--muted)]">
                      <span>Prioridade {priorityLabels[item.priority]}</span>
                      <span>Criado em {formatDate(item.createdAt)}</span>
                      {item.product?.sku ? <span>SKU {item.product.sku}</span> : null}
                      {item.product?.funkoNumber ? <span>Funko #{item.product.funkoNumber}</span> : null}
                      {item.product?.category ? <span>{item.product.category}</span> : null}
                    </p>
                  </div>
                  <div className="grid gap-1 text-sm md:text-right">
                    <strong className="text-[var(--foreground)]">
                      {item.product?.currentPrice === null || item.product?.currentPrice === undefined
                        ? "Preço sob consulta"
                        : formatCurrency(item.product.currentPrice)}
                    </strong>
                    <span className="text-xs text-[var(--muted)]">
                      Desejado: {item.desiredPrice === null ? "-" : formatCurrency(item.desiredPrice)}
                    </span>
                  </div>
                </div>
                {item.notes ? (
                  <p className="rounded-md border border-[var(--border)] bg-[var(--surface-strong)] px-3 py-2 text-sm text-[var(--muted)]">
                    {item.notes}
                  </p>
                ) : null}
                <div className="grid gap-3 xl:grid-cols-[1fr_auto] xl:items-start">
                  <WishlistItemEditForm
                    desiredPrice={item.desiredPrice}
                    itemId={item.id}
                    notes={item.notes}
                    priority={item.priority}
                  />
                  <WishlistRemoveButton itemId={item.id} />
                </div>
              </div>
            </article>
          ))}
        </section>
      )}
    </div>
  );
}
