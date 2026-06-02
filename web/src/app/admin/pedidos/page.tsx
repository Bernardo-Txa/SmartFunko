import type { Metadata } from "next";
import { AdminShell } from "@/components/admin/admin-shell";
import { OrderStatusBadge } from "@/components/ui/status-badge";
import { formatCurrency } from "@/lib/format";
import { orders } from "@/lib/mock-data";

export const metadata: Metadata = {
  title: "Pedidos admin",
};

const labels = {
  pending_payment: "Aguardando pagamento",
  paid: "Pago",
  processing: "Em separacao",
  ready_to_ship: "Pronto para envio",
  shipped: "Enviado",
};

export default function AdminOrdersPage() {
  return (
    <AdminShell title="Pedidos" description="Pedidos manuais criados a partir do WhatsApp.">
      <div className="overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--surface)]">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="bg-[var(--surface-strong)] text-[var(--muted)]">
            <tr>
              <th className="px-4 py-3">Pedido</th>
              <th className="px-4 py-3">Cliente</th>
              <th className="px-4 py-3">Total</th>
              <th className="px-4 py-3">Pago</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border)]">
            {orders.map((order) => (
              <tr key={order.orderNumber}>
                <td className="px-4 py-3 font-semibold text-[var(--foreground)]">
                  {order.orderNumber}
                </td>
                <td className="px-4 py-3 text-[var(--muted)]">{order.customerName}</td>
                <td className="px-4 py-3 text-[var(--foreground)]">
                  {formatCurrency(order.total)}
                </td>
                <td className="px-4 py-3 text-[var(--muted)]">
                  {formatCurrency(order.paidAmount)}
                </td>
                <td className="px-4 py-3">
                  <OrderStatusBadge label={labels[order.status]} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AdminShell>
  );
}
