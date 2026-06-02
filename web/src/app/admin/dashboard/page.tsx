import type { Metadata } from "next";
import { AdminShell, MetricCard } from "@/components/admin/admin-shell";
import { formatCurrency } from "@/lib/format";
import { orders, products } from "@/lib/mock-data";

export const metadata: Metadata = {
  title: "Dashboard admin",
};

export default function AdminDashboardPage() {
  const received = orders.reduce((sum, order) => sum + order.paidAmount, 0);
  const pending = orders.reduce((sum, order) => sum + order.total - order.paidAmount, 0);
  const available = products.filter((product) => product.status === "available").length;

  return (
    <AdminShell
      title="Dashboard"
      description="Indicadores iniciais da operacao assistida."
    >
      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard label="Recebido" value={formatCurrency(received)} detail="Pagamentos registrados" />
        <MetricCard label="Pendente" value={formatCurrency(pending)} detail="Pedidos aguardando baixa" />
        <MetricCard label="Disponiveis" value={`${available}`} detail="Produtos prontos no catalogo" />
      </div>

      <section className="mt-6 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5">
        <h2 className="text-lg font-bold text-[var(--foreground)]">Pedidos recentes</h2>
        <div className="mt-4 divide-y divide-[var(--border)]">
          {orders.map((order) => (
            <div
              key={order.orderNumber}
              className="flex flex-col gap-2 py-3 md:flex-row md:items-center md:justify-between"
            >
              <div>
                <strong className="text-sm text-[var(--foreground)]">{order.orderNumber}</strong>
                <p className="text-sm text-[var(--muted)]">{order.customerName}</p>
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
