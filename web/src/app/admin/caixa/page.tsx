import type { Metadata } from "next";
import { AdminShell, MetricCard } from "@/components/admin/admin-shell";
import { formatCurrency } from "@/lib/format";
import { orders } from "@/lib/mock-data";

export const metadata: Metadata = {
  title: "Caixa admin",
};

export default function AdminCashflowPage() {
  const income = orders.reduce((sum, order) => sum + order.paidAmount, 0);
  const pending = orders.reduce((sum, order) => sum + order.total - order.paidAmount, 0);

  return (
    <AdminShell title="Caixa" description="Entradas geradas por pagamentos manuais.">
      <div className="grid gap-4 md:grid-cols-2">
        <MetricCard label="Entradas" value={formatCurrency(income)} detail="Recebido na V1" />
        <MetricCard label="A receber" value={formatCurrency(pending)} detail="Pedidos pendentes" />
      </div>
    </AdminShell>
  );
}
