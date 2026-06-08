"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, PackageCheck, Plus, RefreshCw, Save, Trash2 } from "lucide-react";
import { PurchaseBatchItemStatusBadge } from "@/components/ui/status-badge";
import { formatCurrency } from "@/lib/format";
import { purchaseBatchItemStatusOptions } from "@/lib/status-labels";

type BatchItem = {
  actual_total_cost: number | string | null;
  actual_unit_cost: number | string | null;
  estimated_total_cost: number | string | null;
  estimated_unit_cost: number | string | null;
  id: string;
  order_item_id: string | null;
  quantity: number;
  status: string;
  order_items?: {
    total_price?: number | string | null;
    unit_price?: number | string | null;
  } | null;
  orders?: {
    id?: string;
    order_number?: string;
  } | null;
  product_variants?: {
    sku?: string | null;
    products?: {
      name?: string | null;
    } | null;
  } | null;
};

type EligibleItem = {
  id: string;
  paid_amount: number;
  pending_amount: number;
  quantity: number;
  status: string;
  total_price: number | string;
  unit_price: number | string;
  orders?: {
    id?: string;
    order_number?: string;
    status?: string;
    customers?: {
      name?: string | null;
    } | null;
  } | null;
  product_variants?: {
    sku?: string | null;
    products?: {
      name?: string | null;
    } | null;
  } | null;
};

const nextStatus: Record<string, Array<{ label: string; status: string }>> = {
  closed: [{ label: "Marcar comprado", status: "purchased" }, { label: "Cancelar", status: "cancelled" }],
  draft: [{ label: "Abrir lote", status: "open" }, { label: "Cancelar", status: "cancelled" }],
  in_transit: [{ label: "Receber", status: "received" }],
  open: [{ label: "Fechar lote", status: "closed" }, { label: "Cancelar", status: "cancelled" }],
  purchased: [{ label: "Em trânsito", status: "in_transit" }],
};

function numberOrNull(formData: FormData, key: string) {
  const raw = String(formData.get(key) ?? "").trim();
  return raw.length > 0 ? Number(raw) : null;
}

function nullableText(formData: FormData, key: string) {
  const raw = String(formData.get(key) ?? "").trim();
  return raw.length > 0 ? raw : null;
}

function marginLabel(sale: number | string | null | undefined, cost: number | string | null | undefined) {
  if (sale === undefined || sale === null || cost === undefined || cost === null) {
    return "-";
  }

  return formatCurrency(Number(sale) - Number(cost));
}

export function PurchaseBatchDetailActions({
  batchId,
  items,
  status,
}: {
  batchId: string;
  items: BatchItem[];
  status: string;
}) {
  const router = useRouter();
  const [eligibleItems, setEligibleItems] = useState<EligibleItem[]>([]);
  const [eligibleSearch, setEligibleSearch] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function submitJson(url: string, method: string, body?: unknown) {
    setError("");
    setMessage("");
    setIsLoading(true);

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
      setIsLoading(false);
    }
  }

  async function changeStatus(next: string) {
    await submitJson(`/api/v1/admin/purchase-batches/${batchId}/status`, "POST", {
      status: next,
    });
    setMessage("Status do lote atualizado.");
    router.refresh();
  }

  async function loadEligibleItems(event?: React.FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    setError("");
    setMessage("");
    setIsLoading(true);

    try {
      const params = new URLSearchParams();
      if (eligibleSearch.trim()) {
        params.set("q", eligibleSearch.trim());
      }

      const response = await fetch(`/api/v1/admin/purchase-batches/eligible-items?${params.toString()}`);
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error?.message ?? "Falha ao listar itens elegiveis");
      }

      setEligibleItems(payload.data ?? []);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Falha ao listar itens elegiveis");
    } finally {
      setIsLoading(false);
    }
  }

  async function addEligibleItem(item: EligibleItem) {
    await submitJson(`/api/v1/admin/purchase-batches/${batchId}/items`, "POST", {
      estimatedTotalCost: null,
      estimatedUnitCost: null,
      orderItemId: item.id,
      quantity: item.quantity,
    });
    setMessage("Item adicionado ao lote.");
    setEligibleItems((current) => current.filter((entry) => entry.id !== item.id));
    router.refresh();
  }

  async function updateItem(event: React.FormEvent<HTMLFormElement>, itemId: string) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    await submitJson(`/api/v1/admin/purchase-batches/${batchId}/items/${itemId}`, "PATCH", {
      actualTotalCost: numberOrNull(formData, "actualTotalCost"),
      actualUnitCost: numberOrNull(formData, "actualUnitCost"),
      estimatedTotalCost: numberOrNull(formData, "estimatedTotalCost"),
      estimatedUnitCost: numberOrNull(formData, "estimatedUnitCost"),
      notes: nullableText(formData, "notes"),
      status: String(formData.get("status") ?? "planned"),
    });
    setMessage("Item atualizado.");
    router.refresh();
  }

  async function removeItem(itemId: string) {
    await submitJson(`/api/v1/admin/purchase-batches/${batchId}/items/${itemId}`, "DELETE");
    setMessage("Item removido.");
    router.refresh();
  }

  async function receiveBatch(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    await submitJson(`/api/v1/admin/purchase-batches/${batchId}/receive`, "POST", {
      actualPurchaseCost: numberOrNull(formData, "actualPurchaseCost"),
      actualShippingCost: numberOrNull(formData, "actualShippingCost"),
      actualTaxesCost: numberOrNull(formData, "actualTaxesCost"),
      actualTotalCost: numberOrNull(formData, "actualTotalCost"),
      notes: nullableText(formData, "notes"),
    });
    setMessage("Lote recebido.");
    router.refresh();
  }

  return (
    <div className="grid gap-5">
      <section className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5">
        <h2 className="text-lg font-bold text-[var(--foreground)]">Acoes de status</h2>
        <div className="mt-4 flex flex-wrap gap-2">
          {(nextStatus[status] ?? []).map((action) => (
            <button
              key={action.status}
              type="button"
              disabled={isLoading}
              onClick={() => changeStatus(action.status)}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-[var(--border)] px-3 text-sm font-semibold text-[var(--foreground)] hover:bg-[var(--surface-strong)] disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Check size={16} />
              {action.label}
            </button>
          ))}
        </div>
      </section>

      <section className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5">
        <h2 className="text-lg font-bold text-[var(--foreground)]">Adicionar itens elegiveis</h2>
        <form onSubmit={loadEligibleItems} className="mt-4 flex flex-col gap-3 md:flex-row">
          <input
            value={eligibleSearch}
            onChange={(event) => setEligibleSearch(event.target.value)}
            placeholder="Buscar pedido, cliente, produto ou SKU"
            className="h-10 flex-1 rounded-md border border-[var(--border)] bg-[var(--background)] px-3 text-sm outline-none focus:border-[var(--accent)]"
          />
          <button
            disabled={isLoading}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-[var(--accent)] px-4 text-sm font-black text-[#020617] hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RefreshCw size={16} />
            Listar
          </button>
        </form>
        <div className="mt-4 grid gap-3">
          {eligibleItems.map((item) => (
            <div key={item.id} className="grid gap-3 rounded-lg border border-[var(--border)] p-4 text-sm lg:grid-cols-[1fr_auto]">
              <div>
                <strong className="text-[var(--foreground)]">
                  {item.product_variants?.products?.name ?? "Produto"} · {item.product_variants?.sku ?? "-"}
                </strong>
                <p className="mt-1 text-[var(--muted)]">
                  Pedido {item.orders?.order_number ?? "-"} · {item.orders?.customers?.name ?? "Cliente"} · Qtd. {item.quantity}
                </p>
                <p className="mt-1 text-[var(--muted)]">
                  Pago {formatCurrency(item.paid_amount)} · Pendente {formatCurrency(item.pending_amount)} · Item {item.status}
                </p>
              </div>
              <button
                type="button"
                disabled={isLoading}
                onClick={() => addEligibleItem(item)}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-[var(--border)] px-3 text-sm font-semibold text-[var(--foreground)] hover:bg-[var(--surface-strong)] disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Plus size={16} />
                Adicionar
              </button>
            </div>
          ))}
        </div>
      </section>

      <section className="overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--surface)]">
        <div className="border-b border-[var(--border)] p-5">
          <h2 className="text-lg font-bold text-[var(--foreground)]">Itens do lote</h2>
        </div>
        <div className="grid gap-4 p-5">
          {items.map((item) => {
            const sold = item.order_items?.total_price ?? null;
            return (
              <form key={item.id} onSubmit={(event) => updateItem(event, item.id)} className="grid gap-4 rounded-lg border border-[var(--border)] p-4">
                <div className="grid gap-2 lg:grid-cols-[1fr_auto]">
                  <div>
                    <strong className="text-[var(--foreground)]">
                      {item.product_variants?.products?.name ?? "Produto"} · {item.product_variants?.sku ?? "-"}
                    </strong>
                    <p className="mt-1 text-sm text-[var(--muted)]">
                      {item.orders?.id ? (
                        <Link href={`/admin/pedidos/${item.orders.id}`} className="hover:text-[var(--accent)]">
                          Pedido {item.orders.order_number}
                        </Link>
                      ) : (
                        "Sem pedido vinculado"
                      )}{" "}
                      · Qtd. {item.quantity}
                    </p>
                  </div>
                  <PurchaseBatchItemStatusBadge status={item.status} />
                </div>
                <div className="grid gap-3 md:grid-cols-5">
                  <label className="block">
                    <span className="text-xs font-semibold text-[var(--muted)]">Status</span>
                    <select
                      name="status"
                      defaultValue={item.status}
                      className="mt-1 h-10 w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-2 text-sm outline-none focus:border-[var(--accent)]"
                    >
                      {purchaseBatchItemStatusOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="block">
                    <span className="text-xs font-semibold text-[var(--muted)]">Custo unit. est.</span>
                    <input name="estimatedUnitCost" type="number" min={0} step="0.01" defaultValue={item.estimated_unit_cost ?? ""} className="mt-1 h-10 w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-2 text-sm outline-none focus:border-[var(--accent)]" />
                  </label>
                  <label className="block">
                    <span className="text-xs font-semibold text-[var(--muted)]">Custo total est.</span>
                    <input name="estimatedTotalCost" type="number" min={0} step="0.01" defaultValue={item.estimated_total_cost ?? ""} className="mt-1 h-10 w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-2 text-sm outline-none focus:border-[var(--accent)]" />
                  </label>
                  <label className="block">
                    <span className="text-xs font-semibold text-[var(--muted)]">Custo unit. real</span>
                    <input name="actualUnitCost" type="number" min={0} step="0.01" defaultValue={item.actual_unit_cost ?? ""} className="mt-1 h-10 w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-2 text-sm outline-none focus:border-[var(--accent)]" />
                  </label>
                  <label className="block">
                    <span className="text-xs font-semibold text-[var(--muted)]">Custo total real</span>
                    <input name="actualTotalCost" type="number" min={0} step="0.01" defaultValue={item.actual_total_cost ?? ""} className="mt-1 h-10 w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-2 text-sm outline-none focus:border-[var(--accent)]" />
                  </label>
                </div>
                <div className="grid gap-3 md:grid-cols-[1fr_auto_auto] md:items-end">
                  <label className="block">
                    <span className="text-xs font-semibold text-[var(--muted)]">Notas</span>
                    <input name="notes" className="mt-1 h-10 w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-2 text-sm outline-none focus:border-[var(--accent)]" />
                  </label>
                  <p className="text-sm text-[var(--muted)]">
                    Margem est. {marginLabel(sold, item.estimated_total_cost)} · real {marginLabel(sold, item.actual_total_cost)}
                  </p>
                  <div className="flex gap-2">
                    <button disabled={isLoading} className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-[var(--accent)] px-3 text-sm font-black text-[#020617] hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60">
                      <Save size={16} />
                      Salvar
                    </button>
                    <button
                      type="button"
                      disabled={isLoading}
                      onClick={() => removeItem(item.id)}
                      className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-red-400/40 px-3 text-sm font-semibold text-red-200 hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <Trash2 size={16} />
                      Remover
                    </button>
                  </div>
                </div>
              </form>
            );
          })}
          {items.length === 0 ? <p className="text-sm text-[var(--muted)]">Nenhum item no lote.</p> : null}
        </div>
      </section>

      <section className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5">
        <h2 className="text-lg font-bold text-[var(--foreground)]">Recebimento</h2>
        <form onSubmit={receiveBatch} className="mt-4 grid gap-4">
          <div className="grid gap-3 md:grid-cols-4">
            <input name="actualPurchaseCost" type="number" min={0} step="0.01" placeholder="Compra real" className="h-10 rounded-md border border-[var(--border)] bg-[var(--background)] px-3 text-sm outline-none focus:border-[var(--accent)]" />
            <input name="actualShippingCost" type="number" min={0} step="0.01" placeholder="Frete real" className="h-10 rounded-md border border-[var(--border)] bg-[var(--background)] px-3 text-sm outline-none focus:border-[var(--accent)]" />
            <input name="actualTaxesCost" type="number" min={0} step="0.01" placeholder="Taxas reais" className="h-10 rounded-md border border-[var(--border)] bg-[var(--background)] px-3 text-sm outline-none focus:border-[var(--accent)]" />
            <input name="actualTotalCost" type="number" min={0} step="0.01" placeholder="Total real" className="h-10 rounded-md border border-[var(--border)] bg-[var(--background)] px-3 text-sm outline-none focus:border-[var(--accent)]" />
          </div>
          <input name="notes" placeholder="Nota de recebimento" className="h-10 rounded-md border border-[var(--border)] bg-[var(--background)] px-3 text-sm outline-none focus:border-[var(--accent)]" />
          <button
            disabled={isLoading}
            className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-md bg-[var(--accent)] px-4 text-sm font-black text-[#020617] hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60 md:w-auto"
          >
            <PackageCheck size={16} />
            Receber lote
          </button>
        </form>
      </section>

      {message ? <p className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4 text-sm font-semibold text-[var(--foreground)]">{message}</p> : null}
      {error ? <p className="rounded-lg border border-red-400/40 bg-red-500/10 p-4 text-sm font-semibold text-red-200">{error}</p> : null}
    </div>
  );
}
