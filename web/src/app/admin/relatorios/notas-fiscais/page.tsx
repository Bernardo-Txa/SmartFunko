import type { Metadata } from "next";
import { AdminShell } from "@/components/admin/admin-shell";
import { MonthlyNfePanel } from "@/components/admin/monthly-nfe-panel";
import { ReportNavigation } from "@/components/admin/report-ui";
import { requireOwnerPage } from "@/server/auth/require-admin-page";
import { BlingMonthlyNfeService } from "@/server/bling/bling-monthly-nfe-service";

export const metadata: Metadata = { title: "Notas fiscais mensais admin" };

export default async function MonthlyNfePage({ searchParams }: { searchParams?: Promise<{ competenceId?: string }> }) {
  await requireOwnerPage("/admin/relatorios/notas-fiscais");
  const params = await searchParams;
  const report = await new BlingMonthlyNfeService().getReport(params?.competenceId ?? null);

  return (
    <AdminShell title="Relatórios" description="Uma NF-e por cliente com todos os pedidos pagos da competência.">
      <div className="grid gap-6">
        <ReportNavigation active="monthly_nfe" />
        <MonthlyNfePanel report={report} />
      </div>
    </AdminShell>
  );
}
