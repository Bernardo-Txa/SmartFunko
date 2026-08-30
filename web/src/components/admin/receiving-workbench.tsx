"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCheck, ExternalLink, PackageCheck, Search, SquareCheckBig } from "lucide-react";
import { formatCurrency, formatDate, formatPhoneNumber } from "@/lib/format";
import {
  getV2StatusBadgeClassName,
  v2FulfillmentStatusLabels,
  v2PaymentStatusLabels,
  v2SourceLabels,
} from "@/lib/orders-v2-labels";

export type ReceivingCompetenceOption = {
  id: string;
  label: string;
  starts_on: string;
  ends_on: string;
};

export type ReceivingOrder = {
  created_at: string;
  fulfillment_status: string;
  id: string;
  order_date: string;
  order_number: string;
  payment_status: string;
  received_at?: string | null;
  requested_at?: string | null;
  source: string;
  total: number | string;
  customers?: {
    email?: string | null;
    name?: string | null;
    phone?: string | null;
  } | Array<{
    email?: string | null;
    name?: string | null;
    phone?: string | null;
  }> | null;
  temporary_customers?: {
    name?: string | null;
    phone?: string | null;
  } | Array<{
    name?: string | null;
    phone?: string | null;
  }> | null;
  v2_order_competencies?: {
    id?: string;
    label?: string;
  } | Array<{
    id?: string;
    label?: string;
  }> | null;
  v2_order_items?: Array<{
    id?: string;
    product_name: string;
    product_sku: string | null;
    quantity: number | string;
    total_price: number | string;
    unit_price: number | string;
  }>;
};

export type ReceivingFilters = {
  competenceId: string;
  funkoNumber: string;
  product: string;
  status: string;
};

type ApiResponse = {
  data?: {
    updated?: number;
  };
  error?: {
    message?: string;
  };
};

type ProductGroup = {
  customers: Set<string>;
  key: string;
  orderIds: Set<string>;
  productName: string;
  quantity: number;
  received: number;
  requested: number;
  sku: string | null;
};

function firstRelation<T>(relation: T | T[] | null | undefined) {
  return Array.isArray(relation) ? relation[0] ?? null : relation ?? null;
}

function getCustomerName(order: ReceivingOrder) {
  const customer = firstRelation(order.customers);
  const temporaryCustomer = firstRelation(order.temporary_customers);
  return customer?.name?.trim() || temporaryCustomer?.name?.trim() || "Cliente";
}

function getOrderBuyer(order: ReceivingOrder) {
  const customer = firstRelation(order.customers);
  const temporaryCustomer = firstRelation(order.temporary_customers);

  return {
    email: customer?.email ?? null,
    isTemporary: !customer && Boolean(temporaryCustomer),
    name: customer?.name?.trim() || temporaryCustomer?.name?.trim() || "Cliente",
    phone: customer?.phone ?? temporaryCustomer?.phone ?? null,
  };
}

function getOrderItems(order: ReceivingOrder) {
  return order.v2_order_items ?? [];
}

function canReceiveOrder(order: ReceivingOrder) {
  return order.payment_status === "pago" && order.fulfillment_status === "solicitado";
}

function getProductGroups(orders: ReceivingOrder[]) {
  const groups = new Map<string, ProductGroup>();

  for (const order of orders) {
    for (const item of getOrderItems(order)) {
      const productName = item.product_name || "Produto";
      const sku = item.product_sku?.trim() || null;
      const key = `${productName.toLowerCase()}::${sku ?? ""}`;
      const group = groups.get(key) ?? {
        customers: new Set<string>(),
        key,
        orderIds: new Set<string>(),
        productName,
        quantity: 0,
        received: 0,
        requested: 0,
        sku,
      };

      group.quantity += Number(item.quantity);
      group.orderIds.add(order.id);
      group.customers.add(getCustomerName(order));

      if (canReceiveOrder(order)) {
        group.requested += Number(item.quantity);
      }

      if (order.fulfillment_status === "recebido") {
        group.received += Number(item.quantity);
      }

      groups.set(key, group);
    }
  }

  return Array.from(groups.values()).sort((left, right) => {
    const quantityCompare = right.requested - left.requested;

    if (quantityCompare !== 0) {
      return quantityCompare;
    }

    return left.productName.localeCompare(right.productName);
  });
}

function getOrderProductSummary(order: ReceivingOrder) {
  return getOrderItems(order)
    .map((item) => {
      const sku = item.product_sku ? ` · ${item.product_sku}` : "";
      return `${item.quantity}x ${item.product_name}${sku}`;
    })
    .join(", ");
}

async function markOrdersReceived(orderIds: string[]) {
  const response = await fetch("/api/v1/admin/orders-v2/bulk", {
    body: JSON.stringify({ action: "mark_received", orderIds }),
    headers: { "content-type": "application/json" },
    method: "POST",
  });
  const payload = (await response.json()) as ApiResponse;

  if (!response.ok) {
    throw new Error(payload.error?.message ?? "Falha ao marcar pedidos como recebidos");
  }

  return payload.data?.updated ?? orderIds.length;
}

export function ReceivingWorkbench({
  competencies,
  filters,
  orders,
}: {
  competencies: ReceivingCompetenceOption[];
  filters: ReceivingFilters;
  orders: ReceivingOrder[];
}) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const requestedOrders = useMemo(
    () => orders.filter(canReceiveOrder),
    [orders],
  );
  const selectedOrders = requestedOrders.filter((order) => selectedIds.has(order.id));
  const productGroups = useMemo(() => getProductGroups(orders), [orders]);
  const totalUnits = orders.reduce((sum, order) => {
    return sum + getOrderItems(order).reduce((itemSum, item) => itemSum + Number(item.quantity), 0);
  }, 0);
  const requestedUnits = requestedOrders.reduce((sum, order) => {
    return sum + getOrderItems(order).reduce((itemSum, item) => itemSum + Number(item.quantity), 0);
  }, 0);
  const uniqueCustomers = new Set(orders.map(getCustomerName)).size;
  const selectedTotal = selectedOrders.reduce((sum, order) => sum + Number(order.total), 0);
  const allRequestedSelected = requestedOrders.length > 0 && requestedOrders.every((order) => selectedIds.has(order.id));

  function toggleOrder(orderId: string) {
    setSelectedIds((current) => {
      const next = new Set(current);

      if (next.has(orderId)) {
        next.delete(orderId);
      } else {
        next.add(orderId);
      }

      return next;
    });
  }

  function toggleAllRequested() {
    setSelectedIds((current) => {
      const next = new Set(current);

      if (allRequestedSelected) {
        requestedOrders.forEach((order) => next.delete(order.id));
      } else {
        requestedOrders.forEach((order) => next.add(order.id));
      }

      return next;
    });
  }

  function selectGroup(group: ProductGroup) {
    setSelectedIds((current) => {
      const next = new Set(current);

      requestedOrders
        .filter((order) => group.orderIds.has(order.id))
        .forEach((order) => next.add(order.id));

      return next;
    });
  }

  async function runMarkReceived(orderIds: string[]) {
    if (orderIds.length === 0) {
      return;
    }

    setError("");
    setMessage("");
    setIsSubmitting(true);

    try {
      const updated = await markOrdersReceived(orderIds);
      setSelectedIds(new Set());
      setMessage(`${updated} pedido${updated === 1 ? "" : "s"} marcado${updated === 1 ? "" : "s"} como recebido${updated === 1 ? "" : "s"}.`);
      router.refresh();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Falha ao marcar recebimento");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="grid min-w-0 gap-5">
      <section className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4 sm:p-5">
        <div className="flex flex-col gap-1">
          <h2 className="text-lg font-bold text-[var(--foreground)]">Consulta da carga</h2>
          <p className="text-sm text-[var(--muted)]">
            Consulte os produtos que ja estao nos pedidos V2. Apenas pedidos pagos e solicitados podem ser marcados como recebidos.
          </p>
        </div>

        <form className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-[minmax(220px,1.4fr)_160px_220px_180px_auto_auto] xl:items-end">
          <label className="block">
            <span className="text-sm font-semibold text-[var(--foreground)]">Produto</span>
            <input
              name="product"
              defaultValue={filters.product}
              placeholder="Ex: Chucky, Shaq, Jason"
              className="mt-2 h-11 w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 text-sm outline-none focus:border-[var(--accent)]"
            />
          </label>

          <label className="block">
            <span className="text-sm font-semibold text-[var(--foreground)]">Numero/SKU</span>
            <input
              name="number"
              defaultValue={filters.funkoNumber}
              placeholder="56, 208..."
              className="mt-2 h-11 w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 text-sm outline-none focus:border-[var(--accent)]"
            />
          </label>

          <label className="block">
            <span className="text-sm font-semibold text-[var(--foreground)]">Competencia</span>
            <select
              name="competenceId"
              defaultValue={filters.competenceId}
              className="mt-2 h-11 w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 text-sm outline-none focus:border-[var(--accent)]"
            >
              <option value="">Todas</option>
              {competencies.map((competence) => (
                <option key={competence.id} value={competence.id}>
                  {competence.label}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="text-sm font-semibold text-[var(--foreground)]">Status</span>
            <select
              name="status"
              defaultValue={filters.status}
              className="mt-2 h-11 w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 text-sm outline-none focus:border-[var(--accent)]"
            >
              <option value="all">Todos operacionais</option>
              <option value="aguardando_fechamento">Aguardando fechamento</option>
              <option value="solicitado">Solicitados</option>
              <option value="recebido">Recebidos</option>
              <option value="enviado">Enviados</option>
              <option value="cancelado">Cancelados</option>
            </select>
          </label>

          <button className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-[var(--accent)] px-4 text-sm font-black text-slate-950 hover:brightness-110">
            <Search size={16} aria-hidden="true" />
            Consultar
          </button>

          <Link
            href="/admin/recebimento"
            className="inline-flex h-11 items-center justify-center rounded-md border border-[var(--border)] px-4 text-sm font-semibold text-[var(--foreground)] hover:bg-[var(--surface-strong)]"
          >
            Limpar
          </Link>
        </form>
      </section>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4">
          <span className="text-xs font-black uppercase tracking-[0.16em] text-[var(--muted)]">Pedidos</span>
          <strong className="mt-2 block text-2xl text-[var(--foreground)]">{orders.length}</strong>
          <span className="text-sm text-[var(--muted)]">No filtro atual</span>
        </div>
        <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4">
          <span className="text-xs font-black uppercase tracking-[0.16em] text-[var(--muted)]">A receber</span>
          <strong className="mt-2 block text-2xl text-[var(--foreground)]">{requestedOrders.length}</strong>
          <span className="text-sm text-[var(--muted)]">{requestedUnits} unidade(s) pagas e solicitadas</span>
        </div>
        <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4">
          <span className="text-xs font-black uppercase tracking-[0.16em] text-[var(--muted)]">Clientes</span>
          <strong className="mt-2 block text-2xl text-[var(--foreground)]">{uniqueCustomers}</strong>
          <span className="text-sm text-[var(--muted)]">Para separar</span>
        </div>
        <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4">
          <span className="text-xs font-black uppercase tracking-[0.16em] text-[var(--muted)]">Unidades</span>
          <strong className="mt-2 block text-2xl text-[var(--foreground)]">{totalUnits}</strong>
          <span className="text-sm text-[var(--muted)]">Encontradas na consulta</span>
        </div>
      </div>

      {productGroups.length > 0 ? (
        <section className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4 sm:p-5">
          <div className="mb-4 flex flex-col gap-1 md:flex-row md:items-end md:justify-between">
            <div>
              <h2 className="text-lg font-bold text-[var(--foreground)]">Resumo por produto</h2>
              <p className="text-sm text-[var(--muted)]">Use para separar uma peca repetida em varios pedidos.</p>
            </div>
            <button
              type="button"
              disabled={requestedOrders.length === 0}
              onClick={toggleAllRequested}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-[var(--border)] px-3 text-sm font-semibold text-[var(--foreground)] hover:bg-[var(--surface-strong)] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <SquareCheckBig size={16} aria-hidden="true" />
              {allRequestedSelected ? "Desmarcar solicitados" : "Selecionar solicitados"}
            </button>
          </div>

          <div className="grid gap-3 lg:grid-cols-2">
            {productGroups.slice(0, 8).map((group) => {
              const requestedOrderCount = requestedOrders.filter((order) => group.orderIds.has(order.id)).length;

              return (
                <div key={group.key} className="rounded-lg border border-[var(--border)] bg-[var(--background)] p-4">
                  <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <h3 className="line-clamp-2 text-sm font-black text-[var(--foreground)]">{group.productName}</h3>
                      <p className="mt-1 text-xs text-[var(--muted)]">{group.sku ? `SKU ${group.sku}` : "Sem SKU no pedido"}</p>
                    </div>
                    <button
                      type="button"
                      disabled={requestedOrderCount === 0}
                      onClick={() => selectGroup(group)}
                      className="inline-flex h-9 shrink-0 items-center justify-center rounded-md border border-[var(--border)] px-3 text-xs font-semibold text-[var(--foreground)] hover:bg-[var(--surface-strong)] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Selecionar
                    </button>
                  </div>
                  <div className="mt-4 grid grid-cols-3 gap-2 text-sm">
                    <div className="rounded-md border border-[var(--border)] p-2">
                      <span className="block text-xs text-[var(--muted)]">Solicitado</span>
                      <strong className="text-[var(--foreground)]">{group.requested}</strong>
                    </div>
                    <div className="rounded-md border border-[var(--border)] p-2">
                      <span className="block text-xs text-[var(--muted)]">Recebido</span>
                      <strong className="text-[var(--foreground)]">{group.received}</strong>
                    </div>
                    <div className="rounded-md border border-[var(--border)] p-2">
                      <span className="block text-xs text-[var(--muted)]">Clientes</span>
                      <strong className="text-[var(--foreground)]">{group.customers.size}</strong>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      ) : null}

      <section className="rounded-lg border border-[var(--border)] bg-[var(--surface)]">
        <div className="flex flex-col gap-3 border-b border-[var(--border)] p-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-lg font-bold text-[var(--foreground)]">Pedidos para separar</h2>
            <p className="text-sm text-[var(--muted)]">
              Marque os pedidos encontrados e atualize de solicitado para recebido.
            </p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <span className="rounded-md border border-[var(--border)] px-3 py-2 text-sm font-semibold text-[var(--foreground)]">
              {selectedOrders.length} selecionado{selectedOrders.length === 1 ? "" : "s"} · {formatCurrency(selectedTotal)}
            </span>
            <button
              type="button"
              disabled={isSubmitting || selectedOrders.length === 0}
              onClick={() => void runMarkReceived(selectedOrders.map((order) => order.id))}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-emerald-300 px-4 text-sm font-black text-slate-950 hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <PackageCheck size={16} aria-hidden="true" />
              Marcar recebidos
            </button>
          </div>
        </div>

        {error || message ? (
          <div className="border-b border-[var(--border)] px-4 py-3">
            {error ? <p className="text-sm font-semibold text-red-300">{error}</p> : null}
            {message ? <p className="text-sm font-semibold text-emerald-300">{message}</p> : null}
          </div>
        ) : null}

        <div className="divide-y divide-[var(--border)]">
          {orders.map((order) => {
            const buyer = getOrderBuyer(order);
            const competence = firstRelation(order.v2_order_competencies);
              const canReceive = canReceiveOrder(order);

            return (
              <article key={order.id} className="grid gap-4 p-4 lg:grid-cols-[32px_minmax(180px,0.9fr)_minmax(220px,1.4fr)_minmax(160px,0.8fr)_auto] lg:items-start">
                <div>
                  {canReceive ? (
                    <input
                      type="checkbox"
                      checked={selectedIds.has(order.id)}
                      onChange={() => toggleOrder(order.id)}
                      className="mt-1 h-4 w-4 rounded border-[var(--border)] bg-[var(--background)]"
                      aria-label={`Selecionar ${order.order_number}`}
                    />
                  ) : (
                    <CheckCheck className="mt-1 text-emerald-300" size={18} aria-hidden="true" />
                  )}
                </div>

                <div className="min-w-0">
                  <Link href={`/admin/v2/pedidos/${order.id}`} className="font-black text-[var(--foreground)] hover:text-[var(--accent)]">
                    {order.order_number}
                  </Link>
                  <p className="mt-1 text-xs text-[var(--muted)]">
                    {formatDate(order.order_date)} · {v2SourceLabels[order.source] ?? order.source}
                  </p>
                  <p className="mt-2 text-xs text-[var(--muted)]">
                    {competence?.label ?? "Sem competencia"}
                  </p>
                </div>

                <div className="min-w-0">
                  <h3 className="line-clamp-2 text-sm font-semibold text-[var(--foreground)]">
                    {getOrderProductSummary(order) || "Produto sem descricao"}
                  </h3>
                  <p className="mt-2 text-sm text-[var(--muted)]">
                    {buyer.name}{buyer.phone ? ` · ${formatPhoneNumber(buyer.phone) || buyer.phone}` : ""}
                    {buyer.isTemporary ? " · Temporario" : ""}
                  </p>
                  {buyer.email ? <p className="mt-1 text-xs text-[var(--muted)]">{buyer.email}</p> : null}
                </div>

                <div className="flex flex-wrap gap-2">
                  <span className={getV2StatusBadgeClassName(order.payment_status)}>
                    {v2PaymentStatusLabels[order.payment_status] ?? order.payment_status}
                  </span>
                  <span className={getV2StatusBadgeClassName(order.fulfillment_status)}>
                    {v2FulfillmentStatusLabels[order.fulfillment_status] ?? order.fulfillment_status}
                  </span>
                  {order.requested_at ? (
                    <span className="rounded-full border border-[var(--border)] px-2 py-1 text-[10px] font-black uppercase tracking-[0.08em] text-[var(--muted)]">
                      Sol. {formatDate(order.requested_at)}
                    </span>
                  ) : null}
                  {order.received_at ? (
                    <span className="rounded-full border border-emerald-300/30 bg-emerald-300/10 px-2 py-1 text-[10px] font-black uppercase tracking-[0.08em] text-emerald-100">
                      Rec. {formatDate(order.received_at)}
                    </span>
                  ) : null}
                </div>

                <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                  <strong className="mr-2 text-sm text-[var(--foreground)]">{formatCurrency(Number(order.total))}</strong>
                  {canReceive ? (
                    <button
                      type="button"
                      disabled={isSubmitting}
                      onClick={() => void runMarkReceived([order.id])}
                      className="inline-flex h-9 items-center justify-center gap-2 rounded-md border border-emerald-300/40 px-3 text-sm font-semibold text-emerald-100 hover:bg-emerald-300/10 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <PackageCheck size={16} aria-hidden="true" />
                      Recebido
                    </button>
                  ) : null}
                  <Link
                    href={`/admin/v2/pedidos/${order.id}`}
                    className="inline-flex h-9 items-center justify-center gap-2 rounded-md border border-[var(--border)] px-3 text-sm font-semibold text-[var(--foreground)] hover:bg-[var(--surface-strong)]"
                  >
                    <ExternalLink size={16} aria-hidden="true" />
                    Abrir
                  </Link>
                </div>
              </article>
            );
          })}

          {orders.length === 0 ? (
            <div className="px-4 py-10 text-center">
              <p className="text-sm font-semibold text-[var(--foreground)]">Nenhum pedido encontrado.</p>
              <p className="mt-1 text-sm text-[var(--muted)]">
                Tente buscar pelo nome do produto, numero do Funko, SKU ou altere o status para recebidos.
              </p>
            </div>
          ) : null}
        </div>
      </section>
    </div>
  );
}
