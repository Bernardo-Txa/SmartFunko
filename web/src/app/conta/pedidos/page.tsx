import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { OrderStatusBadge } from "@/components/ui/status-badge";
import { formatCurrency, formatDate } from "@/lib/format";
import { orders } from "@/lib/mock-data";

export const metadata: Metadata = {
  title: "Meus pedidos",
};

const labels = {
  pending_payment: "Aguardando pagamento",
  paid: "Pago",
  processing: "Em separacao",
  ready_to_ship: "Pronto para envio",
  shipped: "Enviado",
};

export default function AccountOrdersPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-[var(--foreground)]">Meus pedidos</h1>
        <p className="mt-2 text-sm text-[var(--muted)]">
          Pedidos vinculados ao cadastro do cliente.
        </p>
      </div>

      <div className="space-y-3">
        {orders.map((order) => (
          <article
            key={order.orderNumber}
            className="rounded-lg border border-[var(--border)] bg-white p-4"
          >
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-lg font-bold text-[var(--foreground)]">
                    {order.orderNumber}
                  </h2>
                  <OrderStatusBadge label={labels[order.status]} />
                </div>
                <p className="mt-1 text-sm text-[var(--muted)]">
                  Atualizado em {formatDate(order.updatedAt)} · {order.items.length} item(ns)
                </p>
              </div>
              <div className="flex items-center justify-between gap-4 md:justify-end">
                <strong className="text-lg text-[var(--foreground)]">
                  {formatCurrency(order.total)}
                </strong>
                <Link
                  href={`/conta/pedidos/${order.orderNumber}`}
                  className="inline-flex h-10 items-center gap-2 rounded-md border border-[var(--border)] px-3 text-sm font-semibold text-[var(--foreground)] hover:bg-[var(--surface-strong)]"
                >
                  Abrir
                  <ArrowRight size={16} aria-hidden="true" />
                </Link>
              </div>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
