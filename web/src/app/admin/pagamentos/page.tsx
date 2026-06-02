import type { Metadata } from "next";
import { AdminShell } from "@/components/admin/admin-shell";
import { formatCurrency } from "@/lib/format";
import { orders } from "@/lib/mock-data";

export const metadata: Metadata = {
  title: "Pagamentos admin",
};

export default function AdminPaymentsPage() {
  return (
    <AdminShell title="Pagamentos" description="Baixa manual e conciliacao simples da V1.">
      <div className="space-y-3">
        {orders.map((order) => (
          <article
            key={order.orderNumber}
            className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4"
          >
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <strong className="text-sm text-[var(--foreground)]">
                  {order.orderNumber}
                </strong>
                <p className="text-sm text-[var(--muted)]">{order.customerName}</p>
              </div>
              <div className="grid gap-1 text-sm md:text-right">
                <span>Pago: {formatCurrency(order.paidAmount)}</span>
                <span>Pendente: {formatCurrency(order.total - order.paidAmount)}</span>
              </div>
            </div>
          </article>
        ))}
      </div>
    </AdminShell>
  );
}
