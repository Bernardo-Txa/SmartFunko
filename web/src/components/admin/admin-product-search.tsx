"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { Loader2, Search } from "lucide-react";
import { formatCurrency } from "@/lib/format";
import type { ProductStatus } from "@/types/product";
import { ProductStatusBadge } from "@/components/ui/status-badge";

type AdminProduct = {
  id: string;
  main_image_url?: string | null;
  name: string;
  franchises?: {
    name?: string;
  } | null;
  product_variants?: Array<{
    sale_price: number;
    sku: string;
    status: "available" | "order_only" | "preorder" | "sold_out" | "hidden";
  }>;
};

type ApiResponse = {
  data?: AdminProduct[];
  error?: {
    message?: string;
  };
};

type AdminVariantStatus = NonNullable<AdminProduct["product_variants"]>[number]["status"];

function toProductStatus(status: AdminVariantStatus | undefined): ProductStatus {
  return status === "hidden" ? "sold_out" : status ?? "sold_out";
}

export function AdminProductSearch() {
  const [query, setQuery] = useState("");
  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const term = query.trim();

    if (term.length < 2) {
      return;
    }

    const controller = new AbortController();
    const timeout = window.setTimeout(async () => {
      setError("");

      try {
        const response = await fetch(`/api/v1/admin/products?q=${encodeURIComponent(term)}&limit=50`, {
          signal: controller.signal,
        });
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
    }, 280);

    return () => {
      controller.abort();
      window.clearTimeout(timeout);
    };
  }, [query]);

  function updateQuery(value: string) {
    setQuery(value);

    if (value.trim().length < 2) {
      setProducts([]);
      setError("");
      setIsLoading(false);
      return;
    }

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

      {query.trim().length < 2 ? (
        <p className="mt-4 text-sm text-[var(--muted)]">Digite pelo menos 2 caracteres para listar produtos.</p>
      ) : error ? (
        <p className="mt-4 text-sm font-semibold text-red-300">{error}</p>
      ) : products.length === 0 && !isLoading ? (
        <p className="mt-4 text-sm text-[var(--muted)]">Nenhum produto encontrado.</p>
      ) : (
        <div className="mt-5 overflow-hidden rounded-lg border border-[var(--border)]">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="bg-[var(--surface-strong)] text-[var(--muted)]">
              <tr>
                <th className="px-4 py-3">Produto</th>
                <th className="px-4 py-3">SKU</th>
                <th className="px-4 py-3">Franquia</th>
                <th className="px-4 py-3">Preco</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {products.map((product) => {
                const variant = product.product_variants?.[0];

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
                        <span className="font-semibold text-[var(--foreground)]">{product.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-[var(--muted)]">{variant?.sku ?? "-"}</td>
                    <td className="px-4 py-3 text-[var(--muted)]">{product.franchises?.name ?? "-"}</td>
                    <td className="px-4 py-3 text-[var(--foreground)]">
                      {variant ? formatCurrency(variant.sale_price) : "-"}
                    </td>
                    <td className="px-4 py-3">
                      <ProductStatusBadge status={toProductStatus(variant?.status)} />
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
