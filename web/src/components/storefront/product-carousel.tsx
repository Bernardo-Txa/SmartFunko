import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { ProductCard } from "@/components/product/product-card";
import { EmptyState } from "@/components/storefront/empty-state";
import type { Product } from "@/types/product";

export function ProductCarousel({
  description,
  href,
  products,
  title,
}: {
  description?: string;
  href?: string;
  products: Product[];
  title: string;
}) {
  return (
    <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-5 flex items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-[var(--foreground)]">{title}</h2>
          {description ? (
            <p className="mt-1 text-sm leading-6 text-[var(--muted)]">{description}</p>
          ) : null}
        </div>
        {href ? (
          <Link
            href={href}
            prefetch={false}
            className="hidden h-10 items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface)] px-4 text-sm font-bold text-[var(--foreground)] hover:bg-cyan-400/15 sm:inline-flex"
          >
            Abrir
            <ArrowRight size={16} aria-hidden="true" />
          </Link>
        ) : null}
      </div>

      {products.length > 0 ? (
        <div className="catalog-scroll -mx-4 flex snap-x gap-4 overflow-x-auto px-4 pb-3 sm:mx-0 sm:px-0">
          {products.map((product) => (
            <div key={product.id} className="w-[78vw] shrink-0 snap-start sm:w-72 lg:w-80">
              <ProductCard product={product} priority={false} />
            </div>
          ))}
        </div>
      ) : (
        <EmptyState
          actionHref="/catalogo"
          actionLabel="Ver catalogo"
          description="Quando houver produtos ativos nessa vitrine, eles aparecem aqui."
          title="Vitrine sem produtos no momento"
        />
      )}
    </section>
  );
}
