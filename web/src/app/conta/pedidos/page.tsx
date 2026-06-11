import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { OrderStatusBadge } from "@/components/ui/status-badge";
import { formatCurrency, formatDate } from "@/lib/format";
import { getOrderPaidAmount, getOrderPendingAmount } from "@/lib/orders/payable";
import { getOrderReviewStatusMeta, getStatusBadgeClassName } from "@/lib/status-labels";
import { requireUserPage } from "@/server/auth/require-user-page";
import { OrderService } from "@/server/orders/order-service";

export const metadata: Metadata = {
  title: "Meus pedidos",
};

type AccountOrder = {
  id: string;
  order_number: string;
  review_status: string | null;
  status: string;
  total: number;
  updated_at: string;
  order_items?: Array<unknown>;
  payments?: Array<{
    amount: number;
    status: string;
  }>;
};

export default async function AccountOrdersPage() {
  const { customer } = await requireUserPage("/conta/pedidos");
  const orders = customer
    ? ((await new OrderService().getCustomerOrders(customer.id)) as unknown as AccountOrder[])
    : [];

  if (!customer) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-[var(--foreground)]">Meus pedidos</h1>
          <p className="mt-2 text-sm text-[var(--muted)]">
            Nenhum cadastro de cliente vinculado a este login ainda.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-[var(--foreground)]">Meus pedidos</h1>
        <p className="mt-2 text-sm text-[var(--muted)]">
          Pedidos vinculados ao cadastro do cliente.
        </p>
      </div>

      <div className="space-y-3">
        {orders.length > 0 ? (
          orders.map((order) => {
            const paidAmount = getOrderPaidAmount(order);
            const pendingAmount = getOrderPendingAmount(order);
            const reviewMeta = getOrderReviewStatusMeta(order.review_status);

            return (
              <article
                key={order.id}
                className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4"
              >
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-lg font-bold text-[var(--foreground)]">
                        {order.order_number}
                      </h2>
                      <OrderStatusBadge status={order.status} />
                      {order.review_status ? (
                        <span className={getStatusBadgeClassName(reviewMeta)}>{reviewMeta.label}</span>
                      ) : null}
                    </div>
                    <p className="mt-1 text-sm text-[var(--muted)]">
                      Atualizado em {formatDate(order.updated_at)} · {order.order_items?.length ?? 0} item(ns)
                    </p>
                    <p className="mt-2 text-sm text-[var(--muted)]">
                      Pago {formatCurrency(paidAmount)} · Pendente {formatCurrency(pendingAmount)}
                    </p>
                  </div>
                  <div className="flex items-center justify-between gap-4 md:justify-end">
                    <strong className="text-lg text-[var(--foreground)]">
                      {formatCurrency(order.total)}
                    </strong>
                    <Link
                      href={`/conta/pedidos/${order.order_number}`}
                    className="inline-flex h-11 items-center gap-2 rounded-md border border-[var(--border)] px-3 text-sm font-semibold text-[var(--foreground)] hover:bg-[var(--surface-strong)]"
                    >
                      Abrir
                      <ArrowRight size={16} aria-hidden="true" />
                    </Link>
                  </div>
                </div>
              </article>
            );
          })
        ) : (
          <p className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4 text-sm text-[var(--muted)]">
            Você ainda não possui pedidos cadastrados.
          </p>
        )}
      </div>
    </div>
  );
}
