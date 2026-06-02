"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";
import {
  ProductVariantSearchSelect,
  type ProductVariantSearchOption,
} from "@/components/admin/product-variant-search-select";
import { formatCurrency } from "@/lib/format";

type CustomerOption = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  status: string;
};

type InventoryOption = {
  id: string;
  product_variant_id: string;
  sku: string;
  status: string;
  location: string | null;
};

type DraftItem = {
  key: string;
  productVariantId: string;
  selectedVariant: ProductVariantSearchOption | null;
  source: "stock" | "national_order" | "international_order" | "preorder";
  inventoryItemId: string;
  quantity: number;
  unitPrice: number;
};

const sourceLabels = {
  international_order: "Importado",
  national_order: "Encomenda nacional",
  preorder: "Pre-venda",
  stock: "Pronta-entrega",
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

function emptyItem(): DraftItem {
  return {
    inventoryItemId: "",
    key: crypto.randomUUID(),
    productVariantId: "",
    quantity: 1,
    selectedVariant: null,
    source: "national_order",
    unitPrice: 0,
  };
}

export function OrderCreateForm({
  customers,
  inventory,
}: {
  customers: CustomerOption[];
  inventory: InventoryOption[];
}) {
  const router = useRouter();
  const [customerMode, setCustomerMode] = useState<"existing" | "new">("existing");
  const [customerId, setCustomerId] = useState(customers[0]?.id ?? "");
  const [newCustomer, setNewCustomer] = useState({ email: "", name: "", phone: "" });
  const [items, setItems] = useState<DraftItem[]>([emptyItem()]);
  const [discount, setDiscount] = useState(0);
  const [shippingAmount, setShippingAmount] = useState(0);
  const [notes, setNotes] = useState("");
  const [internalNotes, setInternalNotes] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const subtotal = items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
  const total = Math.max(0, subtotal - discount + shippingAmount);

  function updateItem(key: string, patch: Partial<DraftItem>) {
    setItems((current) =>
      current.map((item) => {
        if (item.key !== key) {
          return item;
        }

        const next = { ...item, ...patch };

        if (patch.source && patch.source !== "stock") {
          next.inventoryItemId = "";
        }

        return next;
      }),
    );
  }

  function updateItemVariant(key: string, variant: ProductVariantSearchOption | null) {
    setItems((current) =>
      current.map((item) =>
        item.key === key
          ? {
              ...item,
              inventoryItemId: "",
              productVariantId: variant?.id ?? "",
              selectedVariant: variant,
              source: variant ? mapVariantSource(variant.source) : item.source,
              unitPrice: variant ? Number(variant.salePrice) : item.unitPrice,
            }
          : item,
      ),
    );
  }

  async function createCustomerIfNeeded() {
    if (customerMode === "existing") {
      return customerId;
    }

    const response = await fetch("/api/v1/admin/customers", {
      body: JSON.stringify({
        email: newCustomer.email || null,
        name: newCustomer.name,
        phone: newCustomer.phone || null,
      }),
      headers: { "content-type": "application/json" },
      method: "POST",
    });
    const body = await response.json();

    if (!response.ok) {
      throw new Error(body.error?.message ?? "Falha ao criar cliente");
    }

    return body.data.id as string;
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      const selectedCustomerId = await createCustomerIfNeeded();
      const validItems = items.filter((item) => item.productVariantId);

      if (!selectedCustomerId) {
        throw new Error("Selecione ou cadastre um cliente");
      }

      if (validItems.length === 0) {
        throw new Error("Adicione pelo menos um item ao pedido");
      }

      const response = await fetch("/api/v1/admin/orders", {
        body: JSON.stringify({
          channel: "whatsapp",
          customerId: selectedCustomerId,
          discount,
          internalNotes: internalNotes || null,
          items: validItems.map((item) => ({
            inventoryItemId: item.source === "stock" ? item.inventoryItemId || null : null,
            productVariantId: item.productVariantId,
            quantity: item.quantity,
            source: item.source,
            unitPrice: item.unitPrice,
          })),
          notes: notes || null,
          shippingAmount,
        }),
        headers: { "content-type": "application/json" },
        method: "POST",
      });
      const body = await response.json();

      if (!response.ok) {
        throw new Error(body.error?.message ?? "Falha ao criar pedido");
      }

      router.push(`/admin/pedidos/${body.data.id}`);
      router.refresh();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Falha ao criar pedido");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-5">
      <section className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-bold text-[var(--foreground)]">Cliente</h2>
          <div className="flex rounded-md border border-[var(--border)] p-1 text-sm font-semibold">
            <button
              type="button"
              onClick={() => setCustomerMode("existing")}
              className={`h-9 rounded px-3 ${customerMode === "existing" ? "bg-[var(--accent)] text-[#020617]" : "text-[var(--muted)]"}`}
            >
              Existente
            </button>
            <button
              type="button"
              onClick={() => setCustomerMode("new")}
              className={`h-9 rounded px-3 ${customerMode === "new" ? "bg-[var(--accent)] text-[#020617]" : "text-[var(--muted)]"}`}
            >
              Novo
            </button>
          </div>
        </div>

        {customerMode === "existing" ? (
          <label className="mt-4 block">
            <span className="text-sm font-semibold text-[var(--foreground)]">Cliente</span>
            <select
              value={customerId}
              onChange={(event) => setCustomerId(event.target.value)}
              className="mt-2 h-11 w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 text-sm outline-none focus:border-[var(--accent)]"
            >
              <option value="">Selecione</option>
              {customers.map((customer) => (
                <option key={customer.id} value={customer.id}>
                  {customer.name} {customer.phone ? `- ${customer.phone}` : ""}
                </option>
              ))}
            </select>
          </label>
        ) : (
          <div className="mt-4 grid gap-4 md:grid-cols-3">
            <label className="block">
              <span className="text-sm font-semibold text-[var(--foreground)]">Nome</span>
              <input
                value={newCustomer.name}
                onChange={(event) => setNewCustomer((current) => ({ ...current, name: event.target.value }))}
                required={customerMode === "new"}
                className="mt-2 h-11 w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 text-sm outline-none focus:border-[var(--accent)]"
              />
            </label>
            <label className="block">
              <span className="text-sm font-semibold text-[var(--foreground)]">E-mail</span>
              <input
                value={newCustomer.email}
                onChange={(event) => setNewCustomer((current) => ({ ...current, email: event.target.value }))}
                type="email"
                className="mt-2 h-11 w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 text-sm outline-none focus:border-[var(--accent)]"
              />
            </label>
            <label className="block">
              <span className="text-sm font-semibold text-[var(--foreground)]">Telefone</span>
              <input
                value={newCustomer.phone}
                onChange={(event) => setNewCustomer((current) => ({ ...current, phone: event.target.value }))}
                className="mt-2 h-11 w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 text-sm outline-none focus:border-[var(--accent)]"
              />
            </label>
          </div>
        )}
      </section>

      <section className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-bold text-[var(--foreground)]">Itens</h2>
          <button
            type="button"
            onClick={() => setItems((current) => [...current, emptyItem()])}
            className="inline-flex h-10 items-center gap-2 rounded-md border border-[var(--border)] px-3 text-sm font-semibold text-[var(--foreground)] hover:bg-[var(--surface-strong)]"
          >
            <Plus size={16} />
            Adicionar
          </button>
        </div>

        <div className="mt-4 grid gap-4">
          {items.map((item, index) => {
            const availableInventory = inventory.filter(
              (entry) => entry.product_variant_id === item.productVariantId && entry.status === "available",
            );

            return (
              <div key={item.key} className="rounded-lg border border-[var(--border)] p-4">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <strong className="text-sm text-[var(--foreground)]">Item {index + 1}</strong>
                  {items.length > 1 ? (
                    <button
                      type="button"
                      onClick={() => setItems((current) => current.filter((entry) => entry.key !== item.key))}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-[var(--border)] text-[var(--muted)] hover:bg-[var(--surface-strong)]"
                      aria-label="Remover item"
                    >
                      <Trash2 size={16} />
                    </button>
                  ) : null}
                </div>
                <div className="grid gap-4 lg:grid-cols-[minmax(220px,1.5fr)_160px_130px_150px]">
                  <ProductVariantSearchSelect
                    selected={item.selectedVariant}
                    onSelect={(variant) => updateItemVariant(item.key, variant)}
                  />
                  <label className="block">
                    <span className="text-sm font-semibold text-[var(--foreground)]">Origem</span>
                    <select
                      value={item.source}
                      onChange={(event) => updateItem(item.key, { source: event.target.value as DraftItem["source"] })}
                      className="mt-2 h-11 w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 text-sm outline-none focus:border-[var(--accent)]"
                    >
                      {Object.entries(sourceLabels).map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="block">
                    <span className="text-sm font-semibold text-[var(--foreground)]">Qtd.</span>
                    <input
                      value={item.quantity}
                      onChange={(event) => updateItem(item.key, { quantity: Number(event.target.value) })}
                      min={1}
                      type="number"
                      className="mt-2 h-11 w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 text-sm outline-none focus:border-[var(--accent)]"
                    />
                  </label>
                  <label className="block">
                    <span className="text-sm font-semibold text-[var(--foreground)]">Preco</span>
                    <input
                      value={item.unitPrice}
                      onChange={(event) => updateItem(item.key, { unitPrice: Number(event.target.value) })}
                      min={0}
                      step="0.01"
                      type="number"
                      className="mt-2 h-11 w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 text-sm outline-none focus:border-[var(--accent)]"
                    />
                  </label>
                </div>
                {item.source === "stock" ? (
                  <label className="mt-4 block">
                    <span className="text-sm font-semibold text-[var(--foreground)]">Unidade de estoque</span>
                    <select
                      value={item.inventoryItemId}
                      onChange={(event) => updateItem(item.key, { inventoryItemId: event.target.value })}
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
              </div>
            );
          })}
        </div>
      </section>

      <section className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5">
        <h2 className="text-lg font-bold text-[var(--foreground)]">Valores e observacoes</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <label className="block">
            <span className="text-sm font-semibold text-[var(--foreground)]">Desconto</span>
            <input
              value={discount}
              onChange={(event) => setDiscount(Number(event.target.value))}
              min={0}
              step="0.01"
              type="number"
              className="mt-2 h-11 w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 text-sm outline-none focus:border-[var(--accent)]"
            />
          </label>
          <label className="block">
            <span className="text-sm font-semibold text-[var(--foreground)]">Frete</span>
            <input
              value={shippingAmount}
              onChange={(event) => setShippingAmount(Number(event.target.value))}
              min={0}
              step="0.01"
              type="number"
              className="mt-2 h-11 w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 text-sm outline-none focus:border-[var(--accent)]"
            />
          </label>
        </div>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <label className="block">
            <span className="text-sm font-semibold text-[var(--foreground)]">Observacao publica</span>
            <textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              className="mt-2 min-h-24 w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
            />
          </label>
          <label className="block">
            <span className="text-sm font-semibold text-[var(--foreground)]">Observacao interna</span>
            <textarea
              value={internalNotes}
              onChange={(event) => setInternalNotes(event.target.value)}
              className="mt-2 min-h-24 w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
            />
          </label>
        </div>
      </section>

      <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="grid gap-1 text-sm text-[var(--muted)]">
            <span>Subtotal: {formatCurrency(subtotal)}</span>
            <span>Desconto: {formatCurrency(discount)}</span>
            <span>Frete: {formatCurrency(shippingAmount)}</span>
          </div>
          <strong className="text-2xl text-[var(--foreground)]">{formatCurrency(total)}</strong>
        </div>
        {error ? (
          <p className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">
            {error}
          </p>
        ) : null}
        <button
          disabled={isSubmitting}
          className="mt-4 inline-flex h-11 w-full items-center justify-center rounded-md bg-[var(--accent)] px-5 text-sm font-black text-[#020617] hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60 md:w-auto"
        >
          {isSubmitting ? "Criando..." : "Criar pedido"}
        </button>
      </div>
    </form>
  );
}
