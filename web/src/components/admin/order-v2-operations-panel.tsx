"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Banknote, Check, Eye, PackageCheck, Search, SquareCheckBig } from "lucide-react";
import { formatCurrency, formatDate, formatPhoneNumber } from "@/lib/format";
import {
  getV2StatusBadgeClassName,
  v2ApprovalStatusLabels,
  v2FulfillmentStatusLabels,
  v2PaymentStatusLabels,
  v2SourceLabels,
} from "@/lib/orders-v2-labels";

export type AdminOrderV2ListOrder = {
  approval_status: string;
  created_at: string;
  fulfillment_status: string;
  id: string;
  order_date: string;
  order_number: string;
  payment_status: string;
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
    code?: string;
    id?: string;
    label?: string;
  } | Array<{
    code?: string;
    id?: string;
    label?: string;
  }> | null;
  v2_order_items?: Array<{
    product_name: string;
    quantity: number | string;
  }>;
};

export type OrderV2CompetenceOption = {
  code: string;
  ends_on: string;
  id: string;
  label: string;
  starts_on: string;
  status: string;
};

export type OrderV2ListFilters = {
  approvalStatus: string;
  competenceId: string;
  fulfillmentStatus: string;
  paymentStatus: string;
  q: string;
  source?: string;
};

type ApiResponse = {
  data?: {
    updated?: number;
  };
  error?: {
    message?: string;
  };
};

type QuickView = {
  count: number;
  id: string;
  label: string;
};

type BulkAction = "approve" | "mark_paid" | "mark_requested" | "mark_received";
const quickViewIds = new Set(["all", "approval", "receivable", "paid", "closing", "requested", "received", "refund"]);

function firstRelation<T>(relation: T | T[] | null | undefined) {
  return Array.isArray(relation) ? relation[0] ?? null : relation ?? null;
}

function getProductSummary(order: AdminOrderV2ListOrder) {
  return (order.v2_order_items ?? [])
    .map((item) => `${item.quantity}x ${item.product_name}`)
    .join(", ");
}

function getOrderBuyer(order: AdminOrderV2ListOrder) {
  const customer = firstRelation(order.customers);
  const temporaryCustomer = firstRelation(order.temporary_customers);

  if (customer) {
    return {
      email: customer.email ?? null,
      isTemporary: false,
      name: customer.name?.trim() || "Cliente",
      phone: customer.phone ?? null,
    };
  }

  if (temporaryCustomer) {
    return {
      email: null,
      isTemporary: true,
      name: temporaryCustomer.name?.trim() || "Cliente temporario",
      phone: temporaryCustomer.phone ?? null,
    };
  }

  return {
    email: null,
    isTemporary: false,
    name: "Cliente",
    phone: null,
  };
}

function isActionable(order: AdminOrderV2ListOrder) {
  if (canManualPayment(order)) {
    return true;
  }

  if (order.approval_status === "aguardando_aprovacao") {
    return true;
  }

  return order.payment_status === "pago" && ["aguardando_fechamento", "solicitado"].includes(order.fulfillment_status);
}

function canManualPayment(order: AdminOrderV2ListOrder) {
  return (
    order.approval_status !== "recusado" &&
    order.fulfillment_status !== "cancelado" &&
    ["nao_pago", "checkout_gerado"].includes(order.payment_status)
  );
}

function matchesView(order: AdminOrderV2ListOrder, view: string) {
  switch (view) {
    case "approval":
      return order.approval_status === "aguardando_aprovacao";
    case "receivable":
      return order.approval_status === "aprovado" && ["nao_pago", "checkout_gerado"].includes(order.payment_status);
    case "paid":
      return order.payment_status === "pago";
    case "closing":
      return order.payment_status === "pago" && order.fulfillment_status === "aguardando_fechamento";
    case "requested":
      return order.fulfillment_status === "solicitado";
    case "received":
      return order.fulfillment_status === "recebido";
    case "refund":
      return ["reembolso_pendente", "reembolsado"].includes(order.payment_status);
    default:
      return true;
  }
}

function normalizeQuickView(view: string | undefined) {
  return view && quickViewIds.has(view) ? view : "all";
}

function getQuickViews(orders: AdminOrderV2ListOrder[]): QuickView[] {
  return [
    { count: orders.length, id: "all", label: "Todos" },
    {
      count: orders.filter((order) => order.approval_status === "aguardando_aprovacao").length,
      id: "approval",
      label: "Aprovar",
    },
    {
      count: orders.filter((order) => order.approval_status === "aprovado" && ["nao_pago", "checkout_gerado"].includes(order.payment_status)).length,
      id: "receivable",
      label: "A receber",
    },
    {
      count: orders.filter((order) => order.payment_status === "pago").length,
      id: "paid",
      label: "Pagos",
    },
    {
      count: orders.filter((order) => order.payment_status === "pago" && order.fulfillment_status === "aguardando_fechamento").length,
      id: "closing",
      label: "Fechamento",
    },
    {
      count: orders.filter((order) => order.fulfillment_status === "solicitado").length,
      id: "requested",
      label: "Solicitados",
    },
    {
      count: orders.filter((order) => order.fulfillment_status === "recebido").length,
      id: "received",
      label: "Recebidos",
    },
    {
      count: orders.filter((order) => ["reembolso_pendente", "reembolsado"].includes(order.payment_status)).length,
      id: "refund",
      label: "Reembolso",
    },
  ];
}

function getSelectedActionState(orders: AdminOrderV2ListOrder[]) {
  return {
    canApprove: orders.length > 0 && orders.every((order) => order.approval_status === "aguardando_aprovacao"),
    canMarkPaid: orders.length > 0 && orders.every(canManualPayment),
    canMarkReceived: orders.length > 0 && orders.every((order) => order.payment_status === "pago" && order.fulfillment_status === "solicitado"),
    canMarkRequested: orders.length > 0 && orders.every((order) => order.payment_status === "pago" && order.fulfillment_status === "aguardando_fechamento"),
  };
}

async function postBulkAction(action: BulkAction, orderIds: string[], notes?: string | null) {
  const response = await fetch("/api/v1/admin/orders-v2/bulk", {
    body: JSON.stringify({ action, notes, orderIds }),
    headers: { "content-type": "application/json" },
    method: "POST",
  });
  const payload = (await response.json()) as ApiResponse;

  if (!response.ok) {
    throw new Error(payload.error?.message ?? "Falha na acao em massa");
  }

  return payload.data?.updated ?? orderIds.length;
}

export function OrderV2OperationsPanel({
  competencies,
  filters,
  initialView,
  orders,
}: {
  competencies: OrderV2CompetenceOption[];
  filters: OrderV2ListFilters;
  initialView?: string;
  orders: AdminOrderV2ListOrder[];
}) {
  const router = useRouter();
  const [activeView, setActiveView] = useState(() => normalizeQuickView(initialView));
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const visibleOrders = useMemo(
    () => orders.filter((order) => matchesView(order, activeView)),
    [activeView, orders],
  );
  const selectableOrders = visibleOrders.filter(isActionable);
  const selectedOrders = orders.filter((order) => selectedIds.has(order.id));
  const selectedTotal = selectedOrders.reduce((sum, order) => sum + Number(order.total), 0);
  const actionState = getSelectedActionState(selectedOrders);
  const quickViews = getQuickViews(orders);
  const allVisibleSelected = selectableOrders.length > 0 && selectableOrders.every((order) => selectedIds.has(order.id));

  function toggleOne(orderId: string) {
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

  function toggleVisible() {
    setSelectedIds((current) => {
      const next = new Set(current);

      if (allVisibleSelected) {
        selectableOrders.forEach((order) => next.delete(order.id));
      } else {
        selectableOrders.forEach((order) => next.add(order.id));
      }

      return next;
    });
  }

  async function runBulkAction(action: BulkAction) {
    const notes = action === "mark_paid"
      ? window.prompt("Observacao da baixa manual (opcional)")
      : null;

    if (action === "mark_paid" && notes === null) {
      return;
    }

    setError("");
    setMessage("");
    setIsSubmitting(true);

    try {
      const updated = await postBulkAction(action, Array.from(selectedIds), notes);
      setSelectedIds(new Set());
      setMessage(`${updated} pedido${updated === 1 ? "" : "s"} atualizado${updated === 1 ? "" : "s"}.`);
      router.refresh();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Falha na acao em massa");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="rounded-lg border border-[var(--border)] bg-[var(--surface)]">
      <div className="border-b border-[var(--border)] p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="text-lg font-bold text-[var(--foreground)]">Operacao dos pedidos</h2>
            <p className="mt-1 text-sm text-[var(--muted)]">
              Selecione pedidos compativeis para aprovar, dar baixa manual ou atualizar a etapa do fechamento.
            </p>
          </div>
          <div className="grid gap-1 text-sm sm:grid-cols-3 lg:min-w-[420px]">
            <div className="rounded-md border border-[var(--border)] px-3 py-2">
              <span className="block text-xs font-semibold text-[var(--muted)]">Visíveis</span>
              <strong className="text-[var(--foreground)]">{visibleOrders.length}</strong>
            </div>
            <div className="rounded-md border border-[var(--border)] px-3 py-2">
              <span className="block text-xs font-semibold text-[var(--muted)]">Selecionados</span>
              <strong className="text-[var(--foreground)]">{selectedOrders.length}</strong>
            </div>
            <div className="rounded-md border border-[var(--border)] px-3 py-2">
              <span className="block text-xs font-semibold text-[var(--muted)]">Total selecionado</span>
              <strong className="text-[var(--foreground)]">{formatCurrency(selectedTotal)}</strong>
            </div>
          </div>
        </div>

        <div className="mt-4 flex gap-2 overflow-x-auto pb-1" role="tablist" aria-label="Visoes de pedidos">
          {quickViews.map((view) => (
            <button
              key={view.id}
              type="button"
              onClick={() => {
                setActiveView(view.id);
                setSelectedIds(new Set());
              }}
              className={[
                "inline-flex h-10 shrink-0 items-center gap-2 rounded-md border px-3 text-sm font-semibold transition",
                activeView === view.id
                  ? "border-[var(--accent)] bg-[var(--accent)] text-slate-950"
                  : "border-[var(--border)] text-[var(--foreground)] hover:bg-[var(--surface-strong)]",
              ].join(" ")}
              role="tab"
              aria-selected={activeView === view.id}
            >
              {view.label}
              <span className={[
                "rounded-full px-2 py-0.5 text-xs",
                activeView === view.id ? "bg-slate-950/15" : "bg-[var(--surface-strong)] text-[var(--muted)]",
              ].join(" ")}
              >
                {view.count}
              </span>
            </button>
          ))}
        </div>

        <form className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3 xl:items-end">
          <input type="hidden" name="view" value={activeView} />
          <label className="block">
            <span className="text-sm font-semibold text-[var(--foreground)]">Busca</span>
            <input
              name="q"
              defaultValue={filters.q}
              placeholder="Pedido ou cliente"
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
                <option key={competence.id} value={competence.id}>{competence.label}</option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-sm font-semibold text-[var(--foreground)]">Aprovacao</span>
            <select
              name="approvalStatus"
              defaultValue={filters.approvalStatus}
              className="mt-2 h-11 w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 text-sm outline-none focus:border-[var(--accent)]"
            >
              <option value="">Todas</option>
              {Object.entries(v2ApprovalStatusLabels).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-sm font-semibold text-[var(--foreground)]">Origem</span>
            <select
              name="source"
              defaultValue={filters.source ?? ""}
              className="mt-2 h-11 w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 text-sm outline-none focus:border-[var(--accent)]"
            >
              <option value="">Todas</option>
              {Object.entries(v2SourceLabels).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-sm font-semibold text-[var(--foreground)]">Pagamento</span>
            <select
              name="paymentStatus"
              defaultValue={filters.paymentStatus}
              className="mt-2 h-11 w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 text-sm outline-none focus:border-[var(--accent)]"
            >
              <option value="">Todos</option>
              {Object.entries(v2PaymentStatusLabels).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-sm font-semibold text-[var(--foreground)]">Operacao</span>
            <select
              name="fulfillmentStatus"
              defaultValue={filters.fulfillmentStatus}
              className="mt-2 h-11 w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 text-sm outline-none focus:border-[var(--accent)]"
            >
              <option value="">Todas</option>
              {Object.entries(v2FulfillmentStatusLabels).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </label>
          <button className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-[var(--accent)] px-4 text-sm font-black text-slate-950 hover:brightness-110">
            <Search size={16} aria-hidden="true" />
            Filtrar
          </button>
        </form>
      </div>

      {selectedOrders.length > 0 ? (
        <div className="sticky top-0 z-10 flex flex-col gap-3 border-b border-[var(--border)] bg-[var(--surface-strong)] px-4 py-3 md:flex-row md:items-center md:justify-between">
          <p className="text-sm font-semibold text-[var(--foreground)]">
            {selectedOrders.length} selecionado{selectedOrders.length === 1 ? "" : "s"} · {formatCurrency(selectedTotal)}
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={isSubmitting || !actionState.canApprove}
              onClick={() => void runBulkAction("approve")}
              className="inline-flex h-9 items-center gap-2 rounded-md bg-emerald-300 px-3 text-sm font-black text-slate-950 hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Check size={16} aria-hidden="true" />
              Aprovar
            </button>
            <button
              type="button"
              disabled={isSubmitting || !actionState.canMarkPaid}
              onClick={() => void runBulkAction("mark_paid")}
              className="inline-flex h-9 items-center gap-2 rounded-md border border-yellow-300/50 px-3 text-sm font-semibold text-yellow-100 hover:bg-yellow-300/10 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Banknote size={16} aria-hidden="true" />
              Baixa manual
            </button>
            <button
              type="button"
              disabled={isSubmitting || !actionState.canMarkRequested}
              onClick={() => void runBulkAction("mark_requested")}
              className="inline-flex h-9 items-center gap-2 rounded-md border border-[var(--border)] px-3 text-sm font-semibold text-[var(--foreground)] hover:bg-[var(--surface)] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <SquareCheckBig size={16} aria-hidden="true" />
              Solicitado
            </button>
            <button
              type="button"
              disabled={isSubmitting || !actionState.canMarkReceived}
              onClick={() => void runBulkAction("mark_received")}
              className="inline-flex h-9 items-center gap-2 rounded-md border border-[var(--border)] px-3 text-sm font-semibold text-[var(--foreground)] hover:bg-[var(--surface)] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <PackageCheck size={16} aria-hidden="true" />
              Recebido
            </button>
          </div>
        </div>
      ) : null}

      {error || message ? (
        <div className="border-b border-[var(--border)] px-4 py-3">
          {error ? <p className="text-sm font-semibold text-red-300">{error}</p> : null}
          {message ? <p className="text-sm font-semibold text-emerald-300">{message}</p> : null}
        </div>
      ) : null}

      <div className="overflow-x-auto">
        <table className="w-full min-w-[980px] text-left text-sm">
          <thead className="bg-[var(--surface-strong)] text-[var(--muted)]">
            <tr>
              <th className="w-12 px-4 py-3">
                {selectableOrders.length > 0 ? (
                  <input
                    type="checkbox"
                    checked={allVisibleSelected}
                    onChange={toggleVisible}
                    className="h-4 w-4 rounded border-[var(--border)] bg-[var(--background)]"
                    aria-label="Selecionar pedidos visiveis"
                  />
                ) : null}
              </th>
              <th className="px-4 py-3">Pedido</th>
              <th className="px-4 py-3">Cliente</th>
              <th className="px-4 py-3">Competencia</th>
              <th className="px-4 py-3">Produto</th>
              <th className="px-4 py-3">Fluxo</th>
              <th className="px-4 py-3">Total</th>
              <th className="px-4 py-3">Abrir</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border)]">
            {visibleOrders.map((order) => {
              const buyer = getOrderBuyer(order);
              const competence = firstRelation(order.v2_order_competencies);
              const productSummary = getProductSummary(order);
              const canSelect = isActionable(order);

              return (
                <tr key={order.id} className="hover:bg-[var(--surface-strong)]/40">
                  <td className="px-4 py-3 align-top">
                    {canSelect ? (
                      <input
                        type="checkbox"
                        checked={selectedIds.has(order.id)}
                        onChange={() => toggleOne(order.id)}
                        className="h-4 w-4 rounded border-[var(--border)] bg-[var(--background)]"
                        aria-label={`Selecionar ${order.order_number}`}
                      />
                    ) : null}
                  </td>
                  <td className="px-4 py-3 align-top">
                    <Link href={`/admin/v2/pedidos/${order.id}`} className="font-semibold text-[var(--foreground)] hover:text-[var(--accent)]">
                      {order.order_number}
                    </Link>
                    <p className="mt-1 text-xs text-[var(--muted)]">
                      {formatDate(order.order_date)} · {v2SourceLabels[order.source] ?? order.source}
                    </p>
                  </td>
                  <td className="px-4 py-3 align-top text-[var(--muted)]">
                    <span className="block font-semibold text-[var(--foreground)]">{buyer.name}</span>
                    {buyer.phone ? <span className="mt-1 block text-xs">{formatPhoneNumber(buyer.phone) || buyer.phone}</span> : null}
                    {buyer.isTemporary ? (
                      <span className="mt-1 inline-flex rounded-full border border-yellow-300/40 px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.08em] text-yellow-100">
                        Temporario
                      </span>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 align-top text-[var(--muted)]">{competence?.label ?? "-"}</td>
                  <td className="max-w-[280px] px-4 py-3 align-top text-[var(--muted)]">
                    <span className="line-clamp-2">{productSummary || "-"}</span>
                  </td>
                  <td className="px-4 py-3 align-top">
                    <div className="flex max-w-[280px] flex-wrap gap-1.5">
                      <span className={getV2StatusBadgeClassName(order.approval_status)}>
                        {v2ApprovalStatusLabels[order.approval_status] ?? order.approval_status}
                      </span>
                      <span className={getV2StatusBadgeClassName(order.payment_status)}>
                        {v2PaymentStatusLabels[order.payment_status] ?? order.payment_status}
                      </span>
                      <span className={getV2StatusBadgeClassName(order.fulfillment_status)}>
                        {v2FulfillmentStatusLabels[order.fulfillment_status] ?? order.fulfillment_status}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 align-top font-semibold text-[var(--foreground)]">
                    {formatCurrency(Number(order.total))}
                  </td>
                  <td className="px-4 py-3 align-top">
                    <Link
                      href={`/admin/v2/pedidos/${order.id}`}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-[var(--border)] text-[var(--foreground)] hover:bg-[var(--surface)]"
                      aria-label={`Abrir ${order.order_number}`}
                    >
                      <Eye size={16} aria-hidden="true" />
                    </Link>
                  </td>
                </tr>
              );
            })}
            {visibleOrders.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-sm text-[var(--muted)]">
                  Nenhum pedido encontrado para essa visão.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </section>
  );
}
