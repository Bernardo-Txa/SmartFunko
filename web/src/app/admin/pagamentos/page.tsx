import type { Metadata } from "next";
import { AdminShell } from "@/components/admin/admin-shell";
import { PaymentStatusBadge } from "@/components/ui/status-badge";
import { formatCurrency } from "@/lib/format";
import { requireAdminPage } from "@/server/auth/require-admin-page";
import { PaymentService } from "@/server/payments/payment-service";

export const metadata: Metadata = {
  title: "Pagamentos admin",
};

type PaymentListItem = {
  id: string;
  amount: number;
  method: string;
  order_id: string;
  status: string;
  customers?: {
    name?: string;
  } | null;
  orders?: {
    order_number?: string;
  } | null;
};

export default async function AdminPaymentsPage() {
  const admin = await requireAdminPage();
  const payments = (await new PaymentService(
    undefined,
    admin.profile.id,
  ).listPayments()) as unknown as PaymentListItem[];

  return (
    <AdminShell title="Pagamentos" description="Baixa manual e conciliacao simples da V1.">
      <div className="space-y-3">
        {payments.map((payment) => (
          <article
            key={payment.id}
            className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4"
          >
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <strong className="text-sm text-[var(--foreground)]">
                  {payment.orders?.order_number ?? payment.order_id}
                </strong>
                <p className="text-sm text-[var(--muted)]">{payment.customers?.name ?? "Cliente"}</p>
              </div>
              <div className="grid gap-1 text-sm md:text-right">
                <span>{payment.method}</span>
                <PaymentStatusBadge status={payment.status} />
                <strong>{formatCurrency(payment.amount)}</strong>
              </div>
            </div>
          </article>
        ))}
      </div>
    </AdminShell>
  );
}
