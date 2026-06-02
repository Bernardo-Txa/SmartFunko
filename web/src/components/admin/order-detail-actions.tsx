"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Copy, Plus } from "lucide-react";
import { formatCurrency } from "@/lib/format";

type VariantOption = {
  id: string;
  sku: string;
  sale_price: number;
  source: "own_stock" | "national" | "international" | "preorder";
  productName: string;
};

type ProductOption = {
  id: string;
  name: string;
  product_variants?: Array<Omit<VariantOption, "productName">>;
};

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
  source: "stock" | "national_order" | "international_order" | "preorder";
  unitPrice: number;
};

const itemStatuses = [
  "requested",
  "reserved",
  "waiting_payment",
  "paid",
  "waiting_purchase",
  "purchased",
  "in_transit",
  "received",
  "ready_to_ship",
  "shipped",
  "delivered",
  "cancelled",
];

const sourceLabels = {
  international_order: "Importado",
  national_order: "Encomenda nacional",
  preorder: "Pre-venda",
  stock: "Pronta-entrega",
};

function mapVariantSource(source: VariantOption["source"]): DraftItem["source"] {
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
  inventory,
  items,
  orderId,
  products,
  publicLink,
}: {
  inventory: InventoryOption[];
  items: OrderItemOption[];
  orderId: string;
  products: ProductOption[];
  publicLink: string;
}) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [payment, setPayment] = useState({
    amount: 0,
    feeAmount: 0,
    method: "pix",
  });
  const [draftItem, setDraftItem] = useState<DraftItem>({
    inventoryItemId: "",
    productVariantId: "",
    quantity: 1,
    source: "national_order",
    unitPrice: 0,
  });
  const [itemStatus, setItemStatus] = useState<Record<string, string>>(
    Object.fromEntries(items.map((item) => [item.id, item.status])),
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  const variants = useMemo(
    () =>
      products.flatMap((product) =>
        (product.product_variants ?? []).map((variant) => ({
          ...variant,
          productName: product.name,
        })),
      ),
    [products],
  );

  const availableInventory = inventory.filter(
    (entry) => entry.product_variant_id === draftItem.productVariantId && entry.status === "available",
  );

  function showSuccess(text: string) {
    setError("");
    setMessage(text);
    router.refresh();
  }

  function handleVariantChange(productVariantId: string) {
    const variant = variants.find((entry) => entry.id === productVariantId);
    setDraftItem((current) => ({
      ...current,
      inventoryItemId: "",
      productVariantId,
      source: variant ? mapVariantSource(variant.source) : current.source,
      unitPrice: variant ? Number(variant.sale_price) : current.unitPrice,
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

  async function recordPayment(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await submitJson("/api/v1/admin/payments/manual", "POST", {
      amount: payment.amount,
      feeAmount: payment.feeAmount,
      method: payment.method,
      orderId,
    });
    setPayment({ amount: 0, feeAmount: 0, method: "pix" });
    showSuccess("Pagamento registrado.");
  }

  async function addItem(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
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

      <section className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5">
        <h2 className="text-lg font-bold text-[var(--foreground)]">Registrar pagamento</h2>
        <form onSubmit={recordPayment} className="mt-4 grid gap-4 md:grid-cols-[1fr_1fr_1fr_auto] md:items-end">
          <label className="block">
            <span className="text-sm font-semibold text-[var(--foreground)]">Metodo</span>
            <select
              value={payment.method}
              onChange={(event) => setPayment((current) => ({ ...current, method: event.target.value }))}
              className="mt-2 h-11 w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 text-sm outline-none focus:border-[var(--accent)]"
            >
              <option value="pix">Pix</option>
              <option value="credit_card">Credito</option>
              <option value="debit_card">Debito</option>
              <option value="cash">Dinheiro</option>
              <option value="manual">Manual</option>
            </select>
          </label>
          <label className="block">
            <span className="text-sm font-semibold text-[var(--foreground)]">Valor</span>
            <input
              value={payment.amount}
              onChange={(event) => setPayment((current) => ({ ...current, amount: Number(event.target.value) }))}
              min={0}
              required
              step="0.01"
              type="number"
              className="mt-2 h-11 w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 text-sm outline-none focus:border-[var(--accent)]"
            />
          </label>
          <label className="block">
            <span className="text-sm font-semibold text-[var(--foreground)]">Taxa</span>
            <input
              value={payment.feeAmount}
              onChange={(event) => setPayment((current) => ({ ...current, feeAmount: Number(event.target.value) }))}
              min={0}
              step="0.01"
              type="number"
              className="mt-2 h-11 w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 text-sm outline-none focus:border-[var(--accent)]"
            />
          </label>
          <button
            disabled={isSubmitting}
            className="inline-flex h-11 items-center justify-center rounded-md bg-[var(--accent)] px-4 text-sm font-black text-[#020617] hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Registrar
          </button>
        </form>
      </section>

      <section className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5">
        <h2 className="text-lg font-bold text-[var(--foreground)]">Adicionar item</h2>
        <form onSubmit={addItem} className="mt-4 grid gap-4">
          <div className="grid gap-4 lg:grid-cols-[minmax(220px,1.5fr)_160px_130px_150px]">
            <label className="block">
              <span className="text-sm font-semibold text-[var(--foreground)]">Produto/variante</span>
              <select
                value={draftItem.productVariantId}
                onChange={(event) => handleVariantChange(event.target.value)}
                required
                className="mt-2 h-11 w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 text-sm outline-none focus:border-[var(--accent)]"
              >
                <option value="">Selecione</option>
                {variants.map((variant) => (
                  <option key={variant.id} value={variant.id}>
                    {variant.productName} - {variant.sku} - {formatCurrency(variant.sale_price)}
                  </option>
                ))}
              </select>
            </label>
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
            <Plus size={16} />
            Adicionar item
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
                {itemStatuses.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => updateItemStatus(item.id)}
                className="h-10 rounded-md border border-[var(--border)] px-3 text-sm font-semibold text-[var(--foreground)] hover:bg-[var(--surface-strong)]"
              >
                Atualizar
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
          className="mt-4 h-10 rounded-md border border-red-300 px-3 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Cancelar pedido
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
