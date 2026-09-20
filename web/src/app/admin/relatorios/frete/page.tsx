import type { Metadata } from "next";
import { ShippingQuotePanel } from "@/components/admin/shipping-quote-panel";
import { AdminShell } from "@/components/admin/admin-shell";
import { ReportNavigation } from "@/components/admin/report-ui";
import { env } from "@/lib/env";
import { requireOwnerPage } from "@/server/auth/require-admin-page";
import { MonthlyClosingReportService } from "@/server/reports/monthly-closing-report-service";

export const metadata: Metadata = {
  title: "Frete admin",
};

type Props = {
  searchParams?: Promise<{
    competenceId?: string;
    customerKey?: string;
  }>;
};

function buildProductSummary(customer: Awaited<ReturnType<MonthlyClosingReportService["getReport"]>>["customers"][number] | null) {
  if (!customer) {
    return "Frete avulso";
  }

  const summaries = [...customer.pendingOrders, ...customer.paidOrders]
    .flatMap((order) => order.items)
    .slice(0, 6)
    .map((item) => `${item.quantity}x ${item.productName}`);

  if (summaries.length === 0) {
    return "Pedido sem itens";
  }

  const totalOrders = customer.pendingOrders.length + customer.paidOrders.length;

  return `${summaries.join(", ")}${totalOrders > 6 ? "..." : ""}`;
}

export default async function AdminShippingReportPage({ searchParams }: Props) {
  await requireOwnerPage("/admin/relatorios/frete");
  const params = await searchParams;
  const report = await new MonthlyClosingReportService().getReport(params?.competenceId ?? null);
  const customer = params?.customerKey
    ? report.customers.find((item) => item.customer.key === params.customerKey) ?? null
    : null;

  return (
    <AdminShell title="Relatorios" description="Calculo de frete e taxa de embalagem para fechamento.">
      <div className="grid gap-6">
        <ReportNavigation active="shipping" />

        <ShippingQuotePanel
          context={{
            competenceLabel: report.competence?.label ?? null,
            customerName: customer?.customer.name ?? null,
            customerPhone: customer?.customer.phone ?? null,
            noteTotal: customer?.noteTotal ?? 0,
            orderCount: (customer?.pendingOrders.length ?? 0) + (customer?.paidOrders.length ?? 0),
            productSummary: buildProductSummary(customer),
          }}
          defaultFromPostalCode={env.superFreteDefaultFromPostalCode}
          defaultServices={env.superFreteDefaultServices}
        />
      </div>
    </AdminShell>
  );
}
