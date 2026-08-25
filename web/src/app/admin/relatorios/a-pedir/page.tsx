import type { Metadata } from "next";
import { AdminShell } from "@/components/admin/admin-shell";
import { OrderPdfReportPanel } from "@/components/admin/order-pdf-report-panel";
import { ReportNavigation } from "@/components/admin/report-ui";
import { requireOwnerPage } from "@/server/auth/require-admin-page";
import { OrderPdfReportService } from "@/server/reports/order-pdf-report-service";

export const metadata: Metadata = {
  title: "Pedidos a fornecedores admin",
};

type Props = {
  searchParams?: Promise<{
    competenceId?: string;
  }>;
};

export default async function AdminSupplierRequestReportPage({ searchParams }: Props) {
  await requireOwnerPage("/admin/relatorios/a-pedir");
  const params = await searchParams;
  const report = await new OrderPdfReportService().getSupplierRequestReport(params?.competenceId ?? null);

  return (
    <AdminShell
      title="Relatorios"
      description="PDFs operacionais por competencia para de/para e pedido com fornecedores."
    >
      <div className="grid gap-6">
        <ReportNavigation active="supplier_request" />
        <OrderPdfReportPanel basePath="/admin/relatorios/a-pedir" report={report} />
      </div>
    </AdminShell>
  );
}
