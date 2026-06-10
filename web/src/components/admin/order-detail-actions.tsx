"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Copy, Plus } from "lucide-react";
import { PaymentCreateForm } from "@/components/admin/payment-create-form";
import { SmartButtonLoading } from "@/components/ui/smart-loading";
import {
  ProductVariantSearchSelect,
  type ProductVariantSearchOption,
} from "@/components/admin/product-variant-search-select";
import {
  orderItemSourceOptions,
  orderSellerOptions,
  type OrderItemSource,
  type OrderSeller,
} from "@/lib/order-labels";
import { orderItemStatusOptions } from "@/lib/status-labels";

type InventoryOption = {
  id: string;
  product_variant_id: string;
  sku: string;
  status: string;
  location: string | null;
};

type OrderItemOption = {
  id: string;
  status: string;
};

type DraftItem = {
  inventoryItemId: string;
  productVariantId: string;
  quantity: number;
  selectedVariant: ProductVariantSearchOption | null;
  source: OrderItemSource;
  unitPrice: number;
};

function mapVariantSource(source: ProductVariantSearchOption["source"]): DraftItem["source"] {
  if (source === "own_stock") {
    return "stock";
  }

  if (source === "international") {
    return "international_order";
  }

  if (source === "preorder") {
    return "preorder";
  }

  return "national_order";
}

export function OrderDetailActions({
  customerId,
  inventory,
  items,
  orderId,
  orderTotal,
  paidAmount,
  pendingAmount,
  publicLink,
  seller,
}: {
  customerId: string;
  inventory: InventoryOption[];
  items: OrderItemOption[];
  orderId: string;
  orderTotal: number;
  paidAmount: number;
  pendingAmount: number;
  publicLink: string;
  seller: string | null;
}) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [draftItem, setDraftItem] = useState<DraftItem>({
    inventoryItemId: "",
    productVariantId: "",
    quantity: 1,
    selectedVariant: null,
    source: "national_order",
    unitPrice: 0,
  });
  const [selectedSeller, setSelectedSeller] = useState<OrderSeller>((seller || "daniel") as OrderSeller);
  const [itemStatus, setItemStatus] = useState<Record<string, string>>(
    Object.fromEntries(items.map((item) => [item.id, item.status])),
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  const availableInventory = inventory.filter(
    (entry) => entry.product_variant_id === draftItem.productVariantId && entry.status === "available",
  );

  function showSuccess(text: string) {
    setError("");
    setMessage(text);
    router.refresh();
  }

  function handleVariantChange(variant: ProductVariantSearchOption | null) {
    setDraftItem((current) => ({
      ...current,
      inventoryItemId: "",
      productVariantId: variant?.id ?? "",
      selectedVariant: variant,
      source: variant ? mapVariantSource(variant.source) : current.source,
      unitPrice: variant ? Number(variant.salePrice) : current.unitPrice,
    }));
  }

  async function submitJson(url: string, method: string, body?: unknown) {
    setError("");
    setMessage("");
    setIsSubmitting(true);

    try {
      const response = await fetch(url, {
        body: body ? JSON.stringify(body) : undefined,
        headers: body ? { "content-type": "application/json" } : undefined,
        method,
      });
      const payload = response.status === 204 ? null : await response.json();

      if (!response.ok) {
        throw new Error(payload?.error?.message ?? "Falha na operacao");
      }

      return payload?.data;
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Falha na operacao");
      throw requestError;
    } finally {
      setIsSubmitting(false);
    }
  }

  async function addItem(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!draftItem.productVariantId) {
      setMessage("");
      setError("Selecione um produto");
      return;
    }

    await submitJson(`/api/v1/admin/orders/${orderId}/items`, "POST", {
      inventoryItemId: draftItem.source === "stock" ? draftItem.inventoryItemId || null : null,
      productVariantId: draftItem.productVariantId,
      quantity: draftItem.quantity,
      source: draftItem.source,
      unitPrice: draftItem.unitPrice,
    });
    setDraftItem({
      inventoryItemId: "",
      productVariantId: "",
      quantity: 1,
      selectedVariant: null,
      source: "national_order",
      unitPrice: 0,
    });
    showSuccess("Item adicionado.");
  }

  async function updateItemStatus(itemId: string) {
    await submitJson(`/api/v1/admin/order-items/${itemId}/status`, "PATCH", {
      status: itemStatus[itemId],
    });
    showSuccess("Status do item atualizado.");
  }

  async function updateSeller(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await submitJson(`/api/v1/admin/orders/${orderId}`, "PATCH", {
      seller: selectedSeller,
    });
    showSuccess("Vendedor atualizado.");
  }

  async function cancelOrder() {
    await submitJson(`/api/v1/admin/orders/${orderId}/cancel`, "POST", {
      notes: "Cancelado pelo painel administrativo",
    });
    showSuccess("Pedido cancelado.");
  }

  async function copyPublicLink() {
    await navigator.clipboard.writeText(publicLink);
    setError("");
    setMessage("Link publico copiado.");
  }

  return (
    <div className="grid gap-5">
      <section className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-lg font-bold text-[var(--foreground)]">Link do cliente</h2>
            <p className="mt-1 break-all text-sm text-[var(--muted)]">{publicLink}</p>
          </div>
          <button
            type="button"
            onClick={copyPublicLink}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-[var(--border)] px-3 text-sm font-semibold text-[var(--foreground)] hover:bg-[var(--surface-strong)]"
          >
            <Copy size={16} />
            Copiar
          </button>
        </div>
      </section>

      <PaymentCreateForm
        customerId={customerId}
        orderId={orderId}
        orderTotal={orderTotal}
        paidAmount={paidAmount}
        pendingAmount={pendingAmount}
      />

      <section className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5">
        <h2 className="text-lg font-bold text-[var(--foreground)]">Dados da venda</h2>
        <form onSubmit={updateSeller} className="mt-4 grid gap-4 sm:grid-cols-[minmax(180px,280px)_auto] sm:items-end">
          <label className="block">
            <span className="text-sm font-semibold text-[var(--foreground)]">Vendedor</span>
            <select
              value={selectedSeller}
              onChange={(event) => setSelectedSeller(event.target.value as OrderSeller)}
              className="mt-2 h-11 w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 text-sm outline-none focus:border-[var(--accent)]"
            >
              {orderSellerOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <button
            disabled={isSubmitting}
            className="inline-flex h-11 items-center justify-center rounded-md border border-[var(--border)] px-4 text-sm font-semibold text-[var(--foreground)] hover:bg-[var(--surface-strong)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? <SmartButtonLoading message="Salvando..." /> : "Salvar vendedor"}
          </button>
        </form>
      </section>

      <section className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5">
        <h2 className="text-lg font-bold text-[var(--foreground)]">Adicionar item</h2>
        <form onSubmit={addItem} className="mt-4 grid gap-4">
          <div className="grid gap-4 lg:grid-cols-[minmax(220px,1.5fr)_160px_130px_150px]">
            <ProductVariantSearchSelect
              allowQuickCreate
              selected={draftItem.selectedVariant}
              onSelect={handleVariantChange}
            />
            <label className="block">
              <span className="text-sm font-semibold text-[var(--foreground)]">Origem</span>
              <select
                value={draftItem.source}
                onChange={(event) =>
                  setDraftItem((current) => ({
                    ...current,
                    inventoryItemId: event.target.value === "stock" ? current.inventoryItemId : "",
                    source: event.target.value as DraftItem["source"],
                  }))
                }
                className="mt-2 h-11 w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 text-sm outline-none focus:border-[var(--accent)]"
              >
                {orderItemSourceOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="text-sm font-semibold text-[var(--foreground)]">Qtd.</span>
              <input
                value={draftItem.quantity}
                onChange={(event) => setDraftItem((current) => ({ ...current, quantity: Number(event.target.value) }))}
                min={1}
                required
                type="number"
                className="mt-2 h-11 w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 text-sm outline-none focus:border-[var(--accent)]"
              />
            </label>
            <label className="block">
              <span className="text-sm font-semibold text-[var(--foreground)]">Preco</span>
              <input
                value={draftItem.unitPrice}
                onChange={(event) => setDraftItem((current) => ({ ...current, unitPrice: Number(event.target.value) }))}
                min={0}
                required
                step="0.01"
                type="number"
                className="mt-2 h-11 w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 text-sm outline-none focus:border-[var(--accent)]"
              />
            </label>
          </div>
          {draftItem.source === "stock" ? (
            <label className="block">
              <span className="text-sm font-semibold text-[var(--foreground)]">Unidade de estoque</span>
              <select
                value={draftItem.inventoryItemId}
                onChange={(event) => setDraftItem((current) => ({ ...current, inventoryItemId: event.target.value }))}
                className="mt-2 h-11 w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 text-sm outline-none focus:border-[var(--accent)]"
              >
                <option value="">Sem reserva automatica</option>
                {availableInventory.map((entry) => (
                  <option key={entry.id} value={entry.id}>
                    {entry.sku} {entry.location ? `- ${entry.location}` : ""}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          <button
            disabled={isSubmitting}
            className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-md border border-[var(--border)] px-4 text-sm font-semibold text-[var(--foreground)] hover:bg-[var(--surface-strong)] disabled:cursor-not-allowed disabled:opacity-60 md:w-auto"
          >
            {isSubmitting ? (
              <SmartButtonLoading message="Adicionando..." />
            ) : (
              <>
                <Plus size={16} />
                Adicionar item
              </>
            )}
          </button>
        </form>
      </section>

      <section className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5">
        <h2 className="text-lg font-bold text-[var(--foreground)]">Status dos itens</h2>
        <div className="mt-4 grid gap-3">
          {items.map((item) => (
            <div key={item.id} className="grid gap-3 rounded-lg border border-[var(--border)] p-3 md:grid-cols-[1fr_auto]">
              <select
                value={itemStatus[item.id] ?? item.status}
                onChange={(event) =>
                  setItemStatus((current) => ({
                    ...current,
                    [item.id]: event.target.value,
                  }))
                }
                className="h-10 rounded-md border border-[var(--border)] bg-[var(--background)] px-3 text-sm outline-none focus:border-[var(--accent)]"
              >
                {orderItemStatusOptions.map(({ label, value }) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => updateItemStatus(item.id)}
                disabled={isSubmitting}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-[var(--border)] px-3 text-sm font-semibold text-[var(--foreground)] hover:bg-[var(--surface-strong)] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmitting ? <SmartButtonLoading message="Atualizando..." /> : "Atualizar"}
              </button>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5">
        <h2 className="text-lg font-bold text-[var(--foreground)]">Cancelar pedido</h2>
        <p className="mt-1 text-sm text-[var(--muted)]">
          O cancelamento libera estoque reservado vinculado aos itens do pedido.
        </p>
        <button
          type="button"
          onClick={cancelOrder}
          disabled={isSubmitting}
          className="mt-4 inline-flex h-10 items-center justify-center gap-2 rounded-md border border-red-300 px-3 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting ? <SmartButtonLoading message="Cancelando..." /> : "Cancelar pedido"}
        </button>
      </section>

      {message ? (
        <p className="rounded-md border border-[var(--border)] bg-[var(--surface-strong)] px-3 py-2 text-sm font-semibold text-[var(--foreground)]">
          {message}
        </p>
      ) : null}
      {error ? (
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">
          {error}
        </p>
      ) : null}
    </div>
  );
}
