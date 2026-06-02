import type { Metadata } from "next";
import { AdminShell, MetricCard } from "@/components/admin/admin-shell";
import { formatCurrency } from "@/lib/format";
import { requireAdminPage } from "@/server/auth/require-admin-page";
import { DashboardService } from "@/server/dashboard/dashboard-service";

export const metadata: Metadata = {
  title: "Dashboard admin",
};

type LatestOrder = {
  id: string;
  order_number: string;
  total: number;
  customers?: {
    name?: string;
  } | null;
};

export default async function AdminDashboardPage() {
  await requireAdminPage();
  const dashboard = await new DashboardService().getAdminDashboard();
  const latestOrders = dashboard.latestOrders as unknown as LatestOrder[];

  return (
    <AdminShell
      title="Dashboard"
      description="Indicadores iniciais da operacao assistida."
    >
      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard label="Pedidos hoje" value={`${dashboard.ordersToday}`} detail="Criados no dia" />
        <MetricCard label="Recebido hoje" value={formatCurrency(dashboard.receivedToday)} detail="Entradas de caixa" />
        <MetricCard label="Pendente" value={formatCurrency(dashboard.pendingTotal)} detail="Pedidos de hoje" />
        <MetricCard label="Pago" value={`${dashboard.ordersPaid}`} detail="Pedidos pagos hoje" />
        <MetricCard label="Aguardando" value={`${dashboard.ordersAwaitingPayment}`} detail="Pagamento pendente" />
        <MetricCard label="Estoque" value={`${dashboard.inventoryAvailable}`} detail={`${dashboard.inventoryReserved} reservado(s)`} />
      </div>

      <section className="mt-6 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5">
        <h2 className="text-lg font-bold text-[var(--foreground)]">Pedidos recentes</h2>
        <div className="mt-4 divide-y divide-[var(--border)]">
          {latestOrders.map((order) => (
            <div
              key={order.id}
              className="flex flex-col gap-2 py-3 md:flex-row md:items-center md:justify-between"
            >
              <div>
                <strong className="text-sm text-[var(--foreground)]">{order.order_number}</strong>
                <p className="text-sm text-[var(--muted)]">{order.customers?.name ?? "Cliente"}</p>
              </div>
              <span className="text-sm font-semibold text-[var(--foreground)]">
                {formatCurrency(order.total)}
              </span>
            </div>
          ))}
        </div>
      </section>
    </AdminShell>
  );
}
