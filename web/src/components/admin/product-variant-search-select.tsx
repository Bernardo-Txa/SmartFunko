"use client";

import { useEffect, useId, useState } from "react";
import { Plus, Search, X } from "lucide-react";
import { SmartButtonLoading, SmartInlineLoading } from "@/components/ui/smart-loading";
import { formatCurrency } from "@/lib/format";
import { getProductVariantStatusMeta } from "@/lib/status-labels";

export type ProductVariantSearchOption = {
  id: string;
  isNew?: boolean;
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

type QuickCreateResponse = {
  data?: {
    searchOption: ProductVariantSearchOption;
  };
  error?: {
    message?: string;
  };
};

type Props = {
  allowQuickCreate?: boolean;
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
  allowQuickCreate = false,
  className = "",
  label = "Produto/variante",
  name,
  onSelect,
  placeholder = "Buscar por nome ou SKU",
  selected,
}: Props) {
  const inputId = useId();
  const [draftQuery, setDraftQuery] = useState("");
  const [quickProduct, setQuickProduct] = useState({
    category: "",
    franchise: "",
    imageUrl: "",
    name: "",
    notes: "",
    salePrice: "",
    sku: "",
    subcategory: "",
  });
  const [options, setOptions] = useState<ProductVariantSearchOption[]>([]);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [createError, setCreateError] = useState("");
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

  function updateQuickProduct(key: keyof typeof quickProduct, value: string) {
    setQuickProduct((current) => ({ ...current, [key]: value }));
  }

  async function quickCreateProduct() {
    setCreateError("");
    setIsCreating(true);

    try {
      const response = await fetch("/api/v1/admin/products/quick-create", {
        body: JSON.stringify({
          category: quickProduct.category || null,
          franchise: quickProduct.franchise || null,
          imageUrl: quickProduct.imageUrl || null,
          name: quickProduct.name,
          notes: quickProduct.notes || null,
          salePrice: Number(quickProduct.salePrice),
          sku: quickProduct.sku || null,
          subcategory: quickProduct.subcategory || null,
        }),
        headers: { "content-type": "application/json" },
        method: "POST",
      });
      const payload = (await response.json()) as QuickCreateResponse;

      if (!response.ok || !payload.data?.searchOption) {
        throw new Error(payload.error?.message ?? "Falha ao criar produto");
      }

      const createdOption = { ...payload.data.searchOption, isNew: true };
      setOptions((current) => [createdOption, ...current.filter((option) => option.id !== createdOption.id)]);
      onSelect(createdOption);
      setDraftQuery("");
      setIsOpen(false);
      setIsCreateOpen(false);
      setQuickProduct({
        category: "",
        franchise: "",
        imageUrl: "",
        name: "",
        notes: "",
        salePrice: "",
        sku: "",
        subcategory: "",
      });
    } catch (requestError) {
      setCreateError(requestError instanceof Error ? requestError.message : "Falha ao criar produto");
    } finally {
      setIsCreating(false);
    }
  }

  return (
    <div className={`relative block ${className}`}>
      <label htmlFor={inputId} className="text-sm font-semibold text-[var(--foreground)]">{label}</label>
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
          <SmartButtonLoading
            className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--yellow)]"
            message="Buscando produto..."
            showMessage={false}
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
        <div className="absolute left-0 right-0 top-full z-30 mt-2 overflow-hidden rounded-md border border-[var(--border)] bg-[var(--surface)] shadow-xl">
          {allowQuickCreate ? (
            <button
              type="button"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => {
                setQuickProduct((current) => ({
                  ...current,
                  name: selected ? current.name : draftQuery.trim() || current.name,
                }));
                setCreateError("");
                setIsCreateOpen(true);
              }}
              className="flex w-full items-center gap-2 border-b border-[var(--border)] px-3 py-3 text-left text-sm font-black text-[var(--foreground)] hover:bg-[var(--surface-strong)]"
            >
              <Plus size={16} aria-hidden="true" />
              Criar novo produto
            </button>
          ) : null}
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
                    {option.isNew ? " · Recém-criado" : ""}
                  </span>
                </button>
              ))}
            </div>
          ) : isLoading ? (
            <div className="px-3 py-3">
              <SmartInlineLoading message="Buscando..." />
            </div>
          ) : (
            <div className="px-3 py-3 text-sm text-[var(--muted)]">Nenhum produto encontrado.</div>
          )}
        </div>
      ) : null}
      {isCreateOpen ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/70 p-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={`${inputId}-quick-create-title`}
            className="w-full max-w-3xl rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[0_24px_80px_rgba(2,6,23,0.38)]"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 id={`${inputId}-quick-create-title`} className="text-lg font-black text-[var(--foreground)]">
                  Criar novo produto
                </h2>
                <p className="mt-1 text-sm text-[var(--muted)]">
                  Produto ativo com variante sob encomenda, sem criar estoque.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateOpen(false)}
                className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-[var(--border)] text-[var(--muted)] hover:bg-[var(--surface-strong)]"
                aria-label="Fechar"
              >
                <X size={16} />
              </button>
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <label className="block">
                <span className="text-sm font-semibold text-[var(--foreground)]">Nome</span>
                <input
                  value={quickProduct.name}
                  onChange={(event) => updateQuickProduct("name", event.target.value)}
                  required
                  className="mt-2 h-11 w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 text-sm outline-none focus:border-[var(--accent)]"
                />
              </label>
              <label className="block">
                <span className="text-sm font-semibold text-[var(--foreground)]">Preco de venda</span>
                <input
                  value={quickProduct.salePrice}
                  onChange={(event) => updateQuickProduct("salePrice", event.target.value)}
                  min={0.01}
                  step="0.01"
                  type="number"
                  required
                  className="mt-2 h-11 w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 text-sm outline-none focus:border-[var(--accent)]"
                />
              </label>
            </div>
            <div className="mt-4 grid gap-4 md:grid-cols-3">
              <label className="block">
                <span className="text-sm font-semibold text-[var(--foreground)]">SKU/codigo</span>
                <input
                  value={quickProduct.sku}
                  onChange={(event) => updateQuickProduct("sku", event.target.value)}
                  placeholder="Opcional"
                  className="mt-2 h-11 w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 text-sm outline-none focus:border-[var(--accent)]"
                />
              </label>
              <label className="block">
                <span className="text-sm font-semibold text-[var(--foreground)]">Categoria</span>
                <input
                  value={quickProduct.category}
                  onChange={(event) => updateQuickProduct("category", event.target.value)}
                  className="mt-2 h-11 w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 text-sm outline-none focus:border-[var(--accent)]"
                />
              </label>
              <label className="block">
                <span className="text-sm font-semibold text-[var(--foreground)]">Subcategoria</span>
                <input
                  value={quickProduct.subcategory}
                  onChange={(event) => updateQuickProduct("subcategory", event.target.value)}
                  className="mt-2 h-11 w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 text-sm outline-none focus:border-[var(--accent)]"
                />
              </label>
            </div>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <label className="block">
                <span className="text-sm font-semibold text-[var(--foreground)]">Franquia</span>
                <input
                  value={quickProduct.franchise}
                  onChange={(event) => updateQuickProduct("franchise", event.target.value)}
                  className="mt-2 h-11 w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 text-sm outline-none focus:border-[var(--accent)]"
                />
              </label>
              <label className="block">
                <span className="text-sm font-semibold text-[var(--foreground)]">Imagem URL</span>
                <input
                  value={quickProduct.imageUrl}
                  onChange={(event) => updateQuickProduct("imageUrl", event.target.value)}
                  type="url"
                  className="mt-2 h-11 w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 text-sm outline-none focus:border-[var(--accent)]"
                />
              </label>
            </div>
            <label className="mt-4 block">
              <span className="text-sm font-semibold text-[var(--foreground)]">Observacao interna</span>
              <textarea
                value={quickProduct.notes}
                onChange={(event) => updateQuickProduct("notes", event.target.value)}
                className="mt-2 min-h-20 w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
              />
            </label>

            {createError ? <p className="mt-4 text-sm font-semibold text-red-300">{createError}</p> : null}
            <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setIsCreateOpen(false)}
                className="inline-flex h-10 items-center justify-center rounded-md border border-[var(--border)] px-4 text-sm font-semibold text-[var(--foreground)] hover:bg-[var(--surface-strong)]"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={quickCreateProduct}
                disabled={isCreating || quickProduct.name.trim().length < 2 || Number(quickProduct.salePrice) <= 0}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-[var(--accent)] px-4 text-sm font-black text-[#020617] hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isCreating ? <SmartButtonLoading message="Criando..." /> : "Salvar e selecionar"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
