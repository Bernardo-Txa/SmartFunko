import type { Metadata } from "next";
import { AdminShell, MetricCard } from "@/components/admin/admin-shell";
import { formatCurrency } from "@/lib/format";
import { requireOwnerPage } from "@/server/auth/require-admin-page";
import { CashflowService } from "@/server/cashflow/cashflow-service";

export const metadata: Metadata = {
  title: "Caixa admin",
};

type CashEntryListItem = {
  id: string;
  amount: number;
  category: string;
  description: string | null;
};

export default async function AdminCashflowPage() {
  const owner = await requireOwnerPage();
  const service = new CashflowService(undefined, owner.profile.id);
  const [summary, entries] = await Promise.all([
    service.getCashflowSummary(),
    service.listCashEntries(),
  ]);

  return (
    <AdminShell title="Caixa" description="Entradas geradas por pagamentos manuais.">
      <div className="grid gap-4 md:grid-cols-2">
        <MetricCard label="Entradas hoje" value={formatCurrency(summary.incomeToday)} detail="Recebido no dia" />
        <MetricCard label="A receber" value={formatCurrency(summary.pendingReceivables)} detail="Pedidos pendentes" />
      </div>
      <div className="mt-6 space-y-3">
        {(entries as unknown as CashEntryListItem[]).slice(0, 10).map((entry) => (
          <article key={entry.id} className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4">
            <div className="flex items-center justify-between gap-4 text-sm">
              <span className="font-semibold text-[var(--foreground)]">{entry.description ?? entry.category}</span>
              <strong>{formatCurrency(entry.amount)}</strong>
            </div>
          </article>
        ))}
      </div>
    </AdminShell>
  );
}
