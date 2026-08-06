"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ChevronDown, CreditCard, ExternalLink } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/format";
import {
  getV2StatusBadgeClassName,
  v2ApprovalStatusLabels,
  v2FulfillmentStatusLabels,
  v2PaymentStatusLabels,
} from "@/lib/orders-v2-labels";

export type CustomerOrderV2 = {
  approval_status: string;
  competence_id: string;
  fulfillment_status: string;
  id: string;
  order_date: string;
  order_number: string;
  payment_status: string;
  total: number;
  tracking_code?: string | null;
  tracking_url?: string | null;
  v2_order_competencies?: {
    code: string;
    ends_on: string;
    label: string;
    starts_on: string;
  } | Array<{
    code: string;
    ends_on: string;
    label: string;
    starts_on: string;
  }> | null;
  v2_order_items?: Array<{
    product_name: string;
    quantity: number;
    total_price: number;
    unit_price: number;
  }>;
};

type CheckoutResponse = {
  data?: {
    payment_link_url?: string | null;
  };
  error?: {
    message?: string;
  };
};

type OrderGroup = {
  code: string;
  id: string;
  label: string;
  orders: CustomerOrderV2[];
  period: string;
};

function firstRelation<T>(relation: T | T[] | null | undefined) {
  return Array.isArray(relation) ? relation[0] ?? null : relation ?? null;
}

function isPayable(order: CustomerOrderV2) {
  return (
    order.approval_status === "aprovado" &&
    ["nao_pago", "checkout_gerado"].includes(order.payment_status) &&
    order.fulfillment_status !== "cancelado" &&
    Number(order.total) > 0
  );
}

function getPayableIds(orders: CustomerOrderV2[]) {
  return orders.filter(isPayable).map((order) => order.id);
}

export function OrdersV2PaymentPanel({ orders }: { orders: CustomerOrderV2[] }) {
  const [checkoutUrl, setCheckoutUrl] = useState("");
  const [error, setError] = useState("");
  const [expandedOverrides, setExpandedOverrides] = useState<Record<string, boolean>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const selectedOrders = useMemo(
    () => orders.filter((order) => selectedIds.includes(order.id)),
    [orders, selectedIds],
  );
  const selectedCompetenceId = selectedOrders[0]?.competence_id ?? null;
  const selectedTotal = selectedOrders.reduce((sum, order) => sum + Number(order.total), 0);
  const groupedOrders = useMemo(() => {
    const groups = new Map<string, OrderGroup>();

    for (const order of orders) {
      const competence = firstRelation(order.v2_order_competencies);
      const key = order.competence_id;
      const group = groups.get(key) ?? {
        code: competence?.code ?? key,
        id: key,
        label: competence?.label ?? "Competencia",
        orders: [],
        period: competence ? `${formatDate(competence.starts_on)} a ${formatDate(competence.ends_on)}` : "",
      };

      group.orders.push(order);
      groups.set(key, group);
    }

    return Array.from(groups.values()).sort((first, second) => second.code.localeCompare(first.code));
  }, [orders]);

  function toggleExpandedGroup(groupId: string, defaultExpanded: boolean) {
    setExpandedOverrides((current) => ({
      ...current,
      [groupId]: !(current[groupId] ?? defaultExpanded),
    }));
  }

  function toggleOrder(order: CustomerOrderV2) {
    if (!isPayable(order)) {
      return;
    }

    setCheckoutUrl("");
    setSelectedIds((current) => {
      if (current.includes(order.id)) {
        return current.filter((id) => id !== order.id);
      }

      if (selectedCompetenceId && selectedCompetenceId !== order.competence_id) {
        return [order.id];
      }

      return [...current, order.id];
    });
  }

  function toggleGroup(ordersInGroup: CustomerOrderV2[]) {
    const payableIds = getPayableIds(ordersInGroup);

    if (payableIds.length === 0) {
      return;
    }

    setCheckoutUrl("");
    setSelectedIds((current) => {
      const currentSet = new Set(current);
      const selectedInGroup = payableIds.filter((id) => currentSet.has(id)).length;

      if (selectedInGroup === payableIds.length) {
        return [];
      }

      return payableIds;
    });
  }

  async function createCheckout() {
    setError("");
    setCheckoutUrl("");
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/v1/me/orders-v2/payment-sessions", {
        body: JSON.stringify({ orderIds: selectedIds }),
        headers: { "content-type": "application/json" },
        method: "POST",
      });
      const payload = (await response.json()) as CheckoutResponse;

      if (!response.ok) {
        throw new Error(payload.error?.message ?? "Falha ao gerar checkout");
      }

      const link = payload.data?.payment_link_url;

      if (!link) {
        throw new Error("Checkout criado sem link InfinitePay");
      }

      setCheckoutUrl(link);
      window.open(link, "_blank", "noopener,noreferrer");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Falha ao gerar checkout");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (orders.length === 0) {
    return (
      <section className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5">
        <p className="text-sm text-[var(--muted)]">Nenhum pedido V2 encontrado.</p>
      </section>
    );
  }

  return (
    <div className="grid gap-5">
      <section className="sticky top-24 z-20 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4 shadow-xl">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <span className="text-xs font-black uppercase text-[var(--muted)]">Selecionados</span>
            <strong className="mt-1 block text-xl text-[var(--foreground)]">{formatCurrency(selectedTotal)}</strong>
          </div>
          <div className="flex flex-wrap gap-2">
            {checkoutUrl ? (
              <Link
                href={checkoutUrl}
                target="_blank"
                className="inline-flex h-10 items-center gap-2 rounded-md border border-[var(--border)] px-3 text-sm font-semibold text-[var(--foreground)] hover:bg-[var(--surface-strong)]"
              >
                <ExternalLink size={16} aria-hidden="true" />
                Abrir checkout
              </Link>
            ) : null}
            <button
              type="button"
              onClick={createCheckout}
              disabled={selectedIds.length === 0 || isSubmitting}
              className="inline-flex h-10 items-center gap-2 rounded-md bg-[var(--yellow)] px-4 text-sm font-black text-slate-950 hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <CreditCard size={16} aria-hidden="true" />
              Pagar selecionados
            </button>
          </div>
        </div>
        {error ? <p className="mt-3 text-sm font-semibold text-red-300">{error}</p> : null}
      </section>

      {groupedOrders.map((group) => (
        <section key={group.id} className="overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--surface)]">
          {(() => {
            const payableIds = getPayableIds(group.orders);
            const selectedInGroup = payableIds.filter((id) => selectedIds.includes(id)).length;
            const allPayableSelected = payableIds.length > 0 && selectedInGroup === payableIds.length;
            const defaultExpanded = payableIds.length > 0;
            const isExpanded = expandedOverrides[group.id] ?? defaultExpanded;

            return (
              <>
                <div className="flex flex-col gap-3 p-5 md:flex-row md:items-center md:justify-between">
                  <div className="flex min-w-0 items-start gap-3">
                    {payableIds.length > 0 ? (
                      <input
                        checked={allPayableSelected}
                        onChange={() => toggleGroup(group.orders)}
                        type="checkbox"
                        className="mt-1 h-5 w-5 rounded border-[var(--border)] bg-[var(--background)]"
                        aria-label={`Selecionar pedidos pagaveis de ${group.label}`}
                      />
                    ) : null}
                    <button
                      type="button"
                      onClick={() => toggleExpandedGroup(group.id, defaultExpanded)}
                      className="flex min-w-0 flex-1 items-start gap-3 text-left"
                      aria-expanded={isExpanded}
                    >
                      <ChevronDown
                        size={20}
                        className={`mt-1 shrink-0 text-[var(--muted)] transition-transform ${isExpanded ? "rotate-0" : "-rotate-90"}`}
                        aria-hidden="true"
                      />
                      <span className="min-w-0">
                        <span className="block text-xl font-bold text-[var(--foreground)]">{group.label}</span>
                        <span className="mt-1 block text-sm text-[var(--muted)]">{group.period}</span>
                        <span className="mt-1 block text-xs font-semibold text-[var(--muted)]">
                          {payableIds.length > 0
                            ? `${selectedInGroup}/${payableIds.length} selecionados para pagamento`
                            : "Nenhum pedido disponivel para pagamento"}
                        </span>
                      </span>
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => toggleExpandedGroup(group.id, defaultExpanded)}
                    className="inline-flex h-9 shrink-0 items-center justify-center rounded-md border border-[var(--border)] px-3 text-sm font-semibold text-[var(--foreground)] hover:bg-[var(--surface-strong)]"
                    aria-expanded={isExpanded}
                  >
                    {group.orders.length} pedido{group.orders.length === 1 ? "" : "s"}
                  </button>
                </div>
                {isExpanded ? (
                  <div className="border-t border-[var(--border)] px-5 pb-5">
                    <div className="divide-y divide-[var(--border)]">
                      {group.orders.map((order) => {
                        const payable = isPayable(order);
                        const checked = selectedIds.includes(order.id);
                        const items = order.v2_order_items ?? [];

                        return (
                          <div
                            key={order.id}
                            className={`grid gap-3 py-4 md:items-center ${
                              payable ? "md:grid-cols-[32px_minmax(0,1fr)_auto]" : "md:grid-cols-[minmax(0,1fr)_auto]"
                            }`}
                          >
                            {payable ? (
                              <input
                                checked={checked}
                                onChange={() => toggleOrder(order)}
                                type="checkbox"
                                className="mt-1 h-5 w-5 rounded border-[var(--border)] bg-[var(--background)]"
                                aria-label={`Selecionar ${order.order_number}`}
                              />
                            ) : null}
                            <div>
                              <div className="flex flex-wrap items-center gap-2">
                                <strong className="text-sm text-[var(--foreground)]">{order.order_number}</strong>
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
                              <p className="mt-1 text-sm text-[var(--muted)]">
                                {items.map((item) => `${item.quantity}x ${item.product_name}`).join(", ") || "Produto"}
                              </p>
                              {order.tracking_code ? (
                                <p className="mt-1 text-sm text-[var(--muted)]">
                                  Rastreio: {order.tracking_url ? (
                                    <Link href={order.tracking_url} target="_blank" className="text-[var(--accent)] hover:brightness-110">
                                      {order.tracking_code}
                                    </Link>
                                  ) : order.tracking_code}
                                </p>
                              ) : null}
                            </div>
                            <strong className="text-sm text-[var(--foreground)]">{formatCurrency(Number(order.total))}</strong>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : null}
              </>
            );
          })()}
        </section>
      ))}
    </div>
  );
}
