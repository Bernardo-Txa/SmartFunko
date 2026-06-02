import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";
import { AdminShell } from "@/components/admin/admin-shell";
import { OrderStatusBadge } from "@/components/ui/status-badge";
import { formatCurrency } from "@/lib/format";
import { requireAdminPage } from "@/server/auth/require-admin-page";
import { OrderService } from "@/server/orders/order-service";

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

type AdminOrder = {
  id: string;
  order_number: string;
  status: keyof typeof labels;
  total: number;
  customers?: {
    name?: string;
  } | null;
  payments?: Array<{
    amount: number;
    status: string;
  }>;
};

export default async function AdminOrdersPage() {
  const admin = await requireAdminPage();
  const orders = (await new OrderService(
    undefined,
    admin.profile.id,
  ).listOrders()) as unknown as AdminOrder[];

  return (
    <AdminShell title="Pedidos" description="Pedidos manuais criados a partir do WhatsApp.">
      <div className="mb-4 flex justify-end">
        <Link
          href="/admin/pedidos/novo"
          className="inline-flex h-10 items-center gap-2 rounded-md bg-[var(--accent)] px-4 text-sm font-black text-[#020617] hover:brightness-110"
        >
          <Plus size={16} />
          Novo pedido
        </Link>
      </div>
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
            {orders.map((order) => {
              const paidAmount = (order.payments ?? [])
                .filter((payment) => payment.status === "paid")
                .reduce((sum, payment) => sum + Number(payment.amount), 0);

              return (
              <tr key={order.id}>
                <td className="px-4 py-3 font-semibold text-[var(--foreground)]">
                  <Link href={`/admin/pedidos/${order.id}`} className="hover:text-[var(--accent)]">
                    {order.order_number}
                  </Link>
                </td>
                <td className="px-4 py-3 text-[var(--muted)]">{order.customers?.name ?? "Cliente"}</td>
                <td className="px-4 py-3 text-[var(--foreground)]">
                  {formatCurrency(order.total)}
                </td>
                <td className="px-4 py-3 text-[var(--muted)]">
                  {formatCurrency(paidAmount)}
                </td>
                <td className="px-4 py-3">
                  <OrderStatusBadge label={labels[order.status as keyof typeof labels] ?? order.status} />
                </td>
              </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </AdminShell>
  );
}
