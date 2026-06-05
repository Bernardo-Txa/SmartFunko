"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Loader2, Search } from "lucide-react";
import { formatCurrency } from "@/lib/format";
import { ProductPublishStatusBadge, ProductVariantStatusBadge } from "@/components/ui/status-badge";

type AdminProduct = {
  category_name?: string | null;
  id: string;
  main_image_url?: string | null;
  name: string;
  status: "active" | "inactive" | "archived";
  subcategory_name?: string | null;
  franchises?: {
    name?: string;
  } | Array<{
    name?: string;
  }> | null;
  suppliers?: {
    name?: string;
    slug?: string;
  } | Array<{
    name?: string;
    slug?: string;
  }> | null;
  product_variants?: Array<{
    sale_price: number;
    special_label?: string | null;
    special_tags?: string[] | null;
    sku: string;
    status: "available" | "order_only" | "preorder" | "sold_out" | "hidden";
    type?: "common" | "exclusive" | "chase" | "glow" | "special";
  }>;
};

type ApiResponse = {
  data?: AdminProduct[];
  error?: {
    message?: string;
  };
};

function firstRelation<T>(relation: T | T[] | null | undefined) {
  if (Array.isArray(relation)) {
    return relation[0] ?? null;
  }

  return relation ?? null;
}

export function AdminProductSearch() {
  const [query, setQuery] = useState("");
  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const term = query.trim();

    const controller = new AbortController();
    const timeout = window.setTimeout(async () => {
      setError("");
      setIsLoading(true);

      try {
        const url = term.length >= 2
          ? `/api/v1/admin/products?q=${encodeURIComponent(term)}&limit=50`
          : "/api/v1/admin/products?limit=50";
        const response = await fetch(url, { signal: controller.signal });
        const payload = (await response.json()) as ApiResponse;

        if (!response.ok) {
          throw new Error(payload.error?.message ?? "Falha ao buscar produtos");
        }

        setProducts(payload.data ?? []);
      } catch (requestError) {
        if (requestError instanceof DOMException && requestError.name === "AbortError") {
          return;
        }

        setProducts([]);
        setError(requestError instanceof Error ? requestError.message : "Falha ao buscar produtos");
      } finally {
        setIsLoading(false);
      }
    }, term.length >= 2 ? 280 : 0);

    return () => {
      controller.abort();
      window.clearTimeout(timeout);
    };
  }, [query]);

  function updateQuery(value: string) {
    setQuery(value);
    setIsLoading(true);
  }

  return (
    <section className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5">
      <label className="block">
        <span className="text-sm font-semibold text-[var(--foreground)]">Buscar produto</span>
        <div className="relative mt-2">
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]"
            size={16}
          />
          <input
            value={query}
            onChange={(event) => updateQuery(event.target.value)}
            placeholder="Nome, slug ou codigo"
            className="h-11 w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-9 text-sm outline-none focus:border-[var(--accent)]"
          />
          {isLoading ? (
            <Loader2
              aria-hidden="true"
              className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-[var(--muted)]"
              size={16}
            />
          ) : null}
        </div>
      </label>

      {error ? (
        <p className="mt-4 text-sm font-semibold text-red-300">{error}</p>
      ) : products.length === 0 && !isLoading ? (
        <p className="mt-4 text-sm text-[var(--muted)]">Nenhum produto encontrado.</p>
      ) : (
        <div className="mt-5 overflow-hidden rounded-lg border border-[var(--border)]">
          <table className="w-full min-w-[980px] text-left text-sm">
            <thead className="bg-[var(--surface-strong)] text-[var(--muted)]">
              <tr>
                <th className="px-4 py-3">Produto</th>
                <th className="px-4 py-3">SKU</th>
                <th className="px-4 py-3">Franquia</th>
                <th className="px-4 py-3">Fornecedor</th>
                <th className="px-4 py-3">Categoria</th>
                <th className="px-4 py-3">Preco</th>
                <th className="px-4 py-3">Produto</th>
                <th className="px-4 py-3">Variante</th>
                <th className="px-4 py-3">Acoes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {products.map((product) => {
                const variant = product.product_variants?.[0];
                const franchise = firstRelation(product.franchises);
                const supplier = firstRelation(product.suppliers);
                const isSpecial = Boolean(
                  variant?.special_label ||
                    variant?.special_tags?.length ||
                    (variant?.type && variant.type !== "common"),
                );

                return (
                  <tr key={product.id}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="relative flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-md border border-[var(--border)] bg-slate-950/60">
                          {product.main_image_url ? (
                            <Image
                              src={product.main_image_url}
                              alt={product.name}
                              fill
                              sizes="48px"
                              className="object-contain p-1"
                            />
                          ) : (
                            <span className="text-[10px] font-bold text-[var(--muted)]">POP</span>
                          )}
                        </div>
                        <div>
                          <Link
                            href={`/admin/produtos/${product.id}`}
                            className="font-semibold text-[var(--foreground)] hover:text-[var(--accent)]"
                          >
                            {product.name}
                          </Link>
                          {isSpecial ? (
                            <span className="mt-1 inline-flex rounded-full bg-yellow-300 px-2 py-0.5 text-[10px] font-black uppercase text-slate-950">
                              {variant?.special_label ?? "Special"}
                            </span>
                          ) : null}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-[var(--muted)]">{variant?.sku ?? "-"}</td>
                    <td className="px-4 py-3 text-[var(--muted)]">{franchise?.name ?? "-"}</td>
                    <td className="px-4 py-3 text-[var(--muted)]">{supplier?.name ?? "-"}</td>
                    <td className="px-4 py-3 text-[var(--muted)]">
                      {product.category_name ?? "-"}
                      {product.subcategory_name ? ` / ${product.subcategory_name}` : ""}
                    </td>
                    <td className="px-4 py-3 text-[var(--foreground)]">
                      {variant ? formatCurrency(variant.sale_price) : "-"}
                    </td>
                    <td className="px-4 py-3">
                      <ProductPublishStatusBadge status={product.status} />
                    </td>
                    <td className="px-4 py-3">
                      <ProductVariantStatusBadge status={variant?.status} />
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/admin/produtos/${product.id}`}
                        className="inline-flex h-9 items-center rounded-md border border-[var(--border)] px-3 text-sm font-semibold text-[var(--foreground)] hover:bg-[var(--surface-strong)]"
                      >
                        Editar
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
