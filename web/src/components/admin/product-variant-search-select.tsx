"use client";

import { useEffect, useId, useState } from "react";
import { Loader2, Search, X } from "lucide-react";
import { formatCurrency } from "@/lib/format";
import { getProductVariantStatusMeta } from "@/lib/status-labels";

export type ProductVariantSearchOption = {
  id: string;
  productId: string;
  productName: string;
  productSlug: string;
  salePrice: number;
  sku: string;
  source: "own_stock" | "national" | "international" | "preorder";
  status: "available" | "order_only" | "preorder" | "sold_out" | "hidden";
};

type ApiResponse = {
  data?: ProductVariantSearchOption[];
  error?: {
    message?: string;
  };
};

type Props = {
  className?: string;
  label?: string;
  name?: string;
  onSelect: (option: ProductVariantSearchOption | null) => void;
  placeholder?: string;
  selected: ProductVariantSearchOption | null;
};

function formatOptionLabel(option: ProductVariantSearchOption) {
  return `${option.productName} - ${option.sku} - ${formatCurrency(option.salePrice)}`;
}

export function ProductVariantSearchSelect({
  className = "",
  label = "Produto/variante",
  name,
  onSelect,
  placeholder = "Buscar por nome ou SKU",
  selected,
}: Props) {
  const inputId = useId();
  const [draftQuery, setDraftQuery] = useState("");
  const [options, setOptions] = useState<ProductVariantSearchOption[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const query = selected ? formatOptionLabel(selected) : draftQuery;

  useEffect(() => {
    const term = draftQuery.trim();

    if (!isOpen || selected || term.length < 2) {
      return;
    }

    const controller = new AbortController();
    const timeout = window.setTimeout(async () => {
      setError("");

      try {
        const response = await fetch(
          `/api/v1/admin/product-variants/search?q=${encodeURIComponent(term)}&limit=20`,
          { signal: controller.signal },
        );
        const payload = (await response.json()) as ApiResponse;

        if (!response.ok) {
          throw new Error(payload.error?.message ?? "Falha ao buscar produtos");
        }

        setOptions(payload.data ?? []);
      } catch (requestError) {
        if (requestError instanceof DOMException && requestError.name === "AbortError") {
          return;
        }

        setOptions([]);
        setError(requestError instanceof Error ? requestError.message : "Falha ao buscar produtos");
      } finally {
        setIsLoading(false);
      }
    }, 280);

    return () => {
      controller.abort();
      window.clearTimeout(timeout);
    };
  }, [draftQuery, isOpen, selected]);

  function clearSelection() {
    onSelect(null);
    setDraftQuery("");
    setOptions([]);
    setError("");
    setIsLoading(false);
    setIsOpen(false);
  }

  return (
    <label className={`relative block ${className}`}>
      <span className="text-sm font-semibold text-[var(--foreground)]">{label}</span>
      {name ? <input type="hidden" name={name} value={selected?.id ?? ""} /> : null}
      <div className="relative mt-2">
        <Search
          aria-hidden="true"
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]"
          size={16}
        />
        <input
          id={inputId}
          value={query}
          onChange={(event) => {
            const value = event.target.value;

            if (selected) {
              onSelect(null);
            }

            setDraftQuery(value);
            setIsLoading(value.trim().length >= 2);

            if (value.trim().length < 2) {
              setOptions([]);
              setError("");
            }

            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          onBlur={() => window.setTimeout(() => setIsOpen(false), 120)}
          placeholder={placeholder}
          className="h-11 w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-9 text-sm outline-none focus:border-[var(--accent)]"
        />
        {isLoading ? (
          <Loader2
            aria-hidden="true"
            className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-[var(--muted)]"
            size={16}
          />
        ) : selected ? (
          <button
            type="button"
            onClick={clearSelection}
            className="absolute right-2 top-1/2 inline-flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-md text-[var(--muted)] hover:bg-[var(--surface-strong)]"
            aria-label="Limpar produto"
          >
            <X size={15} />
          </button>
        ) : null}
      </div>

      {isOpen && !selected ? (
        <div className="absolute left-0 right-0 top-full z-30 mt-2 overflow-hidden rounded-md border border-[var(--border)] bg-[#020617] shadow-xl">
          {draftQuery.trim().length < 2 ? (
            <div className="px-3 py-3 text-sm text-[var(--muted)]">Digite 2 caracteres para buscar.</div>
          ) : error ? (
            <div className="px-3 py-3 text-sm font-semibold text-red-300">{error}</div>
          ) : options.length > 0 ? (
            <div className="max-h-72 overflow-y-auto py-1">
              {options.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => {
                    onSelect(option);
                    setDraftQuery("");
                    setIsOpen(false);
                  }}
                  className="grid w-full gap-1 px-3 py-2 text-left hover:bg-[var(--surface-strong)]"
                >
                  <span className="text-sm font-semibold text-[var(--foreground)]">{option.productName}</span>
                  <span className="text-xs text-[var(--muted)]">
                    {option.sku} · {formatCurrency(option.salePrice)} · {getProductVariantStatusMeta(option.status).label}
                  </span>
                </button>
              ))}
            </div>
          ) : isLoading ? (
            <div className="px-3 py-3 text-sm text-[var(--muted)]">Buscando...</div>
          ) : (
            <div className="px-3 py-3 text-sm text-[var(--muted)]">Nenhum produto encontrado.</div>
          )}
        </div>
      ) : null}
    </label>
  );
}
