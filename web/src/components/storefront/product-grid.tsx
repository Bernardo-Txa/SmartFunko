import { ProductCard } from "@/components/product/product-card";
import { EmptyState } from "@/components/storefront/empty-state";
import type { Product } from "@/types/product";

export function ProductGrid({
  emptyActionHref = "/catalogo",
  emptyActionLabel = "Ver catalogo",
  emptyDescription = "Nenhum produto ativo foi encontrado com esses critérios.",
  emptyTitle = "Nenhum produto encontrado",
  priorityCount = 2,
  products,
}: {
  emptyActionHref?: string;
  emptyActionLabel?: string;
  emptyDescription?: string;
  emptyTitle?: string;
  priorityCount?: number;
  products: Product[];
}) {
  if (products.length === 0) {
    return (
      <EmptyState
        actionHref={emptyActionHref}
        actionLabel={emptyActionLabel}
        description={emptyDescription}
        title={emptyTitle}
      />
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {products.map((product, index) => (
        <ProductCard key={product.id} priority={index < priorityCount} product={product} />
      ))}
    </div>
  );
}

export function ProductCardSkeleton() {
  return (
    <div className="h-full rounded-2xl border border-cyan-400/20 bg-[#030816] p-4 shadow-[0_18px_44px_rgba(2,6,23,0.26)]">
      <div className="aspect-[4/5] rounded-[14px] bg-slate-800/80" />
      <div className="mt-4 flex gap-2">
        <div className="h-7 w-20 rounded-full bg-slate-800" />
        <div className="h-7 w-24 rounded-full bg-slate-800" />
      </div>
      <div className="mt-4 h-4 w-28 rounded bg-slate-800" />
      <div className="mt-3 h-5 w-full rounded bg-slate-800" />
      <div className="mt-2 h-5 w-2/3 rounded bg-slate-800" />
      <div className="mt-5 h-7 w-32 rounded bg-slate-800" />
      <div className="mt-5 h-10 w-full rounded-lg bg-slate-800" />
    </div>
  );
}

export function ProductGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4" aria-hidden="true">
      {Array.from({ length: count }, (_, index) => (
        <ProductCardSkeleton key={index} />
      ))}
    </div>
  );
}
