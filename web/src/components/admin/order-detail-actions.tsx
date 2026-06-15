"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Copy, Plus, RefreshCw, XCircle } from "lucide-react";
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
  defaultMaxInstallments,
  inventory,
  items,
  orderId,
  orderTotal,
  paidAmount,
  pendingAmount,
  paymentMaxInstallments,
  paymentMaxInstallmentsSource,
  paymentLinkUrl,
  publicLink,
  reviewStatus,
  seller,
}: {
  customerId: string;
  defaultMaxInstallments: number;
  inventory: InventoryOption[];
  items: OrderItemOption[];
  orderId: string;
  orderTotal: number;
  paidAmount: number;
  pendingAmount: number;
  paymentMaxInstallments: number | null;
  paymentMaxInstallmentsSource: string | null;
  paymentLinkUrl: string | null;
  publicLink: string;
  reviewStatus: string | null;
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
  const [maxInstallments, setMaxInstallments] = useState(String(paymentMaxInstallments ?? defaultMaxInstallments));
  const [rejectReason, setRejectReason] = useState("");

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

  async function approveForPayment() {
    if (!maxInstallments.trim()) {
      setMessage("");
      setError("Informe parcelas maximas");
      return;
    }

    const parsedMaxInstallments = Number(maxInstallments);

    if (!Number.isInteger(parsedMaxInstallments)) {
      setMessage("");
      setError("Informe parcelas maximas como numero inteiro");
      return;
    }

    const data = await submitJson(`/api/v1/admin/orders/${orderId}/approve-payment`, "POST", {
      maxInstallments: parsedMaxInstallments,
    });
    showSuccess(data?.checkoutUrl ? "Pedido aprovado e link InfinitePay gerado." : "Pedido aprovado.");
  }

  async function regeneratePaymentLink() {
    const data = await submitJson(`/api/v1/admin/orders/${orderId}/regenerate-payment-link`, "POST");
    showSuccess(data?.checkoutUrl ? "Novo link InfinitePay gerado." : "Link atualizado.");
  }

  async function checkPaymentStatus() {
    const data = await submitJson(`/api/v1/admin/orders/${orderId}/check-payment`, "POST");
    showSuccess(data?.paid ? "Pagamento confirmado pela InfinitePay." : "Pagamento ainda nao confirmado.");
  }

  async function rejectOrder(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (rejectReason.trim().length < 3) {
      setMessage("");
      setError("Informe o motivo da recusa");
      return;
    }

    await submitJson(`/api/v1/admin/orders/${orderId}/reject`, "POST", {
      reason: rejectReason,
    });
    setRejectReason("");
    showSuccess("Pedido recusado.");
  }

  async function copyPublicLink() {
    await navigator.clipboard.writeText(publicLink);
    setError("");
    setMessage("Link publico copiado.");
  }

  async function copyPaymentLink() {
    if (!paymentLinkUrl) {
      return;
    }

    await navigator.clipboard.writeText(paymentLinkUrl);
    setError("");
    setMessage("Link InfinitePay copiado.");
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
        <h2 className="text-lg font-bold text-[var(--foreground)]">Checkout assistido</h2>
        <div className="mt-4 grid gap-4">
          {reviewStatus === "under_review" ? (
            <div className="grid gap-3">
              <div className="grid gap-3 rounded-md border border-[var(--border)] bg-[var(--background)] p-3 md:grid-cols-[1fr_180px_auto] md:items-end">
                <div>
                  <p className="text-sm font-semibold text-[var(--foreground)]">
                    Total: {new Intl.NumberFormat("pt-BR", { currency: "BRL", style: "currency" }).format(orderTotal)}
                  </p>
                  <p className="mt-1 text-sm text-[var(--muted)]">Parcelamento padrão: até {defaultMaxInstallments}x</p>
                  <p className="mt-1 text-xs leading-5 text-[var(--muted)]">
                    Padrão: pedidos a partir de R$ 150,00 permitem até 3x. Você pode aumentar manualmente se necessário.
                  </p>
                  {Number(maxInstallments) > defaultMaxInstallments ? (
                    <p className="mt-2 rounded-md border border-yellow-300/30 bg-yellow-500/10 p-2 text-xs font-semibold text-yellow-100">
                      Você está liberando até {maxInstallments} parcelas para este pedido.
                    </p>
                  ) : null}
                </div>
                <label className="block">
                  <span className="text-sm font-semibold text-[var(--foreground)]">Parcelas máximas</span>
                  <input
                    value={maxInstallments}
                    onChange={(event) => setMaxInstallments(event.target.value)}
                    min={defaultMaxInstallments}
                    max={12}
                    required
                    step={1}
                    type="number"
                    className="mt-2 h-11 w-full rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 text-sm outline-none focus:border-[var(--accent)]"
                  />
                </label>
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={approveForPayment}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-[var(--yellow)] px-4 text-sm font-black text-[#020617] hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <CheckCircle2 size={16} aria-hidden="true" />
                  {isSubmitting ? <SmartButtonLoading message="Gerando..." /> : "Aprovar e gerar link"}
                </button>
              </div>
              <form onSubmit={rejectOrder} className="grid gap-2 md:grid-cols-[1fr_auto]">
                <input
                  value={rejectReason}
                  onChange={(event) => setRejectReason(event.target.value)}
                  placeholder="Motivo da recusa"
                  className="h-11 rounded-md border border-[var(--border)] bg-[var(--background)] px-3 text-sm outline-none focus:border-[var(--accent)]"
                />
                <button
                  disabled={isSubmitting}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-md border border-red-300/35 px-4 text-sm font-semibold text-red-300 hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <XCircle size={16} aria-hidden="true" />
                  Recusar
                </button>
              </form>
            </div>
          ) : null}

          {reviewStatus === "awaiting_payment" ? (
            <div className="grid gap-3">
              {paymentMaxInstallments ? (
                <p className="text-sm text-[var(--muted)]">
                  Parcelamento aprovado:{" "}
                  <span className="font-semibold text-[var(--foreground)]">até {paymentMaxInstallments}x</span>
                  {" · "}
                  Origem: {paymentMaxInstallmentsSource === "admin_override" ? "ajuste manual" : "regra padrão"}
                </p>
              ) : null}
              {paymentLinkUrl ? (
                <div className="rounded-md border border-[var(--border)] bg-[var(--background)] p-3">
                  <p className="break-all text-sm text-[var(--muted)]">{paymentLinkUrl}</p>
                </div>
              ) : null}
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={!paymentLinkUrl}
                  onClick={copyPaymentLink}
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-[var(--border)] px-3 text-sm font-semibold text-[var(--foreground)] hover:bg-[var(--surface-strong)] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Copy size={16} aria-hidden="true" />
                  Copiar link
                </button>
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={regeneratePaymentLink}
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-[var(--border)] px-3 text-sm font-semibold text-[var(--foreground)] hover:bg-[var(--surface-strong)] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <RefreshCw size={16} aria-hidden="true" />
                  {isSubmitting ? <SmartButtonLoading message="Gerando..." /> : "Regenerar link"}
                </button>
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={checkPaymentStatus}
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-[var(--border)] px-3 text-sm font-semibold text-[var(--foreground)] hover:bg-[var(--surface-strong)] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <CheckCircle2 size={16} aria-hidden="true" />
                  {isSubmitting ? <SmartButtonLoading message="Consultando..." /> : "Verificar pagamento"}
                </button>
              </div>
            </div>
          ) : null}

          {reviewStatus === "paid" ? (
            <p className="rounded-md border border-emerald-300/25 bg-emerald-500/10 p-3 text-sm text-emerald-100">
              Pagamento confirmado pela InfinitePay ou por baixa manual.
            </p>
          ) : null}

          {reviewStatus === "rejected" ? (
            <p className="rounded-md border border-red-300/25 bg-red-500/10 p-3 text-sm text-red-100">
              Pedido recusado. O cliente visualiza o motivo no acompanhamento.
            </p>
          ) : null}
        </div>
      </section>

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
