import { ProductCard } from "@/components/product/product-card";
import { EmptyState } from "@/components/storefront/empty-state";
import type { Product } from "@/types/product";

export function ProductGrid({
  emptyActionHref = "/catalogo",
  emptyActionLabel = "Ver catalogo",
  emptyDescription = "Nenhum produto ativo foi encontrado com esses critérios.",
  emptyTitle = "Nenhum produto encontrado",
  products,
}: {
  emptyActionHref?: string;
  emptyActionLabel?: string;
  emptyDescription?: string;
  emptyTitle?: string;
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
        <ProductCard key={product.id} priority={index < 4} product={product} />
      ))}
    </div>
  );
}

