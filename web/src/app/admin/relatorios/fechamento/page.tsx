import type { Metadata } from "next";
import { MonthlyClosingReportPanel } from "@/components/admin/monthly-closing-report-panel";
import { AdminShell } from "@/components/admin/admin-shell";
import { ReportNavigation } from "@/components/admin/report-ui";
import { requireOwnerPage } from "@/server/auth/require-admin-page";
import { MonthlyClosingReportService } from "@/server/reports/monthly-closing-report-service";

export const metadata: Metadata = {
  title: "Fechamento mensal admin",
};

type Props = {
  searchParams?: Promise<{
    competenceId?: string;
  }>;
};

export default async function AdminMonthlyClosingReportPage({ searchParams }: Props) {
  await requireOwnerPage("/admin/relatorios/fechamento");
  const params = await searchParams;
  const report = await new MonthlyClosingReportService().getReport(params?.competenceId ?? null);

  return (
    <AdminShell
      title="Relatorios"
      description="Fechamento mensal com notas por cliente, valores pagos, pendencias e cobranca por link."
    >
      <div className="grid gap-6">
        <ReportNavigation active="closing" />

        <MonthlyClosingReportPanel report={report} />
      </div>
    </AdminShell>
  );
}
