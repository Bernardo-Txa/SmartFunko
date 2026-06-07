import type { Metadata } from "next";
import Link from "next/link";
import { AdminShell, MetricCard } from "@/components/admin/admin-shell";
import { PaymentActions } from "@/components/admin/payment-actions";
import { PaymentStatusBadge } from "@/components/ui/status-badge";
import { formatCurrency, formatDate } from "@/lib/format";
import { paymentStatusOptions } from "@/lib/status-labels";
import { requireAdminPage } from "@/server/auth/require-admin-page";
import { PaymentService } from "@/server/payments/payment-service";

export const metadata: Metadata = {
  title: "Pagamentos admin",
};

type PaymentListItem = {
  id: string;
  amount: number | string;
  fee_amount: number | string;
  net_amount: number | string;
  method: string;
  order_id: string;
  paid_at: string | null;
  status: string;
  created_at: string;
  customers?: {
    name?: string;
  } | null;
  orders?: {
    id?: string;
    order_number?: string;
  } | null;
  profiles?: {
    name?: string;
  } | null;
};

type Props = {
  searchParams?: Promise<{
    endDate?: string;
    method?: string;
    q?: string;
    startDate?: string;
    status?: string;
  }>;
};

const paymentMethodOptions = [
  { label: "Pix", value: "pix" },
  { label: "Crédito", value: "credit_card" },
  { label: "Débito", value: "debit_card" },
  { label: "Dinheiro", value: "cash" },
  { label: "Manual", value: "manual" },
] as const;

function getParam(value: string | undefined) {
  return value?.trim() ?? "";
}

function endOfDate(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T23:59:59.999Z` : value;
}

export default async function AdminPaymentsPage({ searchParams }: Props) {
  const admin = await requireAdminPage();
  const params = await searchParams;
  const endDate = getParam(params?.endDate);
  const method = getParam(params?.method);
  const search = getParam(params?.q);
  const startDate = getParam(params?.startDate);
  const status = getParam(params?.status);
  const service = new PaymentService(undefined, admin.profile.id);
  const filters = {
    endDate: endDate ? endOfDate(endDate) : undefined,
    method: method || undefined,
    search: search || undefined,
    startDate: startDate || undefined,
    status: status || undefined,
  };
  const [payments, summary] = await Promise.all([
    service.listPayments(filters),
    service.getPaymentSummary(filters),
  ]);
  const items = payments as unknown as PaymentListItem[];

  return (
    <AdminShell title="Pagamentos" description="Baixa manual transacional, consulta e estorno operacional.">
      <div className="grid gap-6">
        <div className="grid gap-4 md:grid-cols-3">
          <MetricCard label="Recebido hoje" value={formatCurrency(summary.receivedToday)} detail="Pagamentos pagos no dia" />
          <MetricCard label="Recebido no mês" value={formatCurrency(summary.receivedThisMonth)} detail="Pagamentos pagos no mês" />
          <MetricCard label="Recebido no período" value={formatCurrency(summary.receivedInPeriod)} detail="Conforme filtros" />
          <MetricCard label="Taxas no período" value={formatCurrency(summary.feesInPeriod)} detail="Fee dos pagamentos pagos" />
          <MetricCard label="Líquido no período" value={formatCurrency(summary.netInPeriod)} detail="Valor bruto menos taxas" />
          <MetricCard label="Pendente a receber" value={formatCurrency(summary.pendingReceivables)} detail="Pedidos ainda em aberto" />
        </div>

        <form className="grid gap-3 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4 lg:grid-cols-[minmax(180px,1fr)_150px_150px_150px_150px_auto_auto] lg:items-end">
          <label className="block">
            <span className="text-sm font-semibold text-[var(--foreground)]">Cliente ou pedido</span>
            <input
              name="q"
              defaultValue={search}
              className="mt-2 h-10 w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 text-sm outline-none focus:border-[var(--accent)]"
            />
          </label>
          <label className="block">
            <span className="text-sm font-semibold text-[var(--foreground)]">Status</span>
            <select
              name="status"
              defaultValue={status}
              className="mt-2 h-10 w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 text-sm outline-none focus:border-[var(--accent)]"
            >
              <option value="">Todos</option>
              {paymentStatusOptions.map(({ label, value }) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-sm font-semibold text-[var(--foreground)]">Método</span>
            <select
              name="method"
              defaultValue={method}
              className="mt-2 h-10 w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 text-sm outline-none focus:border-[var(--accent)]"
            >
              <option value="">Todos</option>
              {paymentMethodOptions.map(({ label, value }) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-sm font-semibold text-[var(--foreground)]">Início</span>
            <input
              name="startDate"
              type="date"
              defaultValue={startDate}
              className="mt-2 h-10 w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 text-sm outline-none focus:border-[var(--accent)]"
            />
          </label>
          <label className="block">
            <span className="text-sm font-semibold text-[var(--foreground)]">Fim</span>
            <input
              name="endDate"
              type="date"
              defaultValue={endDate}
              className="mt-2 h-10 w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 text-sm outline-none focus:border-[var(--accent)]"
            />
          </label>
          <button className="h-10 rounded-md bg-[var(--accent)] px-4 text-sm font-black text-[#020617] hover:brightness-110">
            Filtrar
          </button>
          <Link
            href="/admin/pagamentos"
            className="inline-flex h-10 items-center justify-center rounded-md border border-[var(--border)] px-4 text-sm font-semibold text-[var(--foreground)] hover:bg-[var(--surface-strong)]"
          >
            Limpar
          </Link>
        </form>

        <section className="overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--surface)]">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] text-left text-sm">
              <thead className="bg-[var(--surface-strong)] text-[var(--muted)]">
                <tr>
                  <th className="px-4 py-3">Pedido</th>
                  <th className="px-4 py-3">Cliente</th>
                  <th className="px-4 py-3">Método</th>
                  <th className="px-4 py-3">Bruto</th>
                  <th className="px-4 py-3">Taxa</th>
                  <th className="px-4 py-3">Líquido</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Pago em</th>
                  <th className="px-4 py-3">Criado por</th>
                  <th className="px-4 py-3">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {items.map((payment) => (
                  <tr key={payment.id}>
                    <td className="px-4 py-3 font-semibold text-[var(--foreground)]">
                      {payment.orders?.id ? (
                        <Link href={`/admin/pedidos/${payment.orders.id}`} className="hover:text-[var(--accent)]">
                          {payment.orders.order_number ?? payment.order_id}
                        </Link>
                      ) : (
                        payment.orders?.order_number ?? payment.order_id
                      )}
                    </td>
                    <td className="px-4 py-3 text-[var(--muted)]">{payment.customers?.name ?? "Cliente"}</td>
                    <td className="px-4 py-3 text-[var(--muted)]">{payment.method}</td>
                    <td className="px-4 py-3 text-[var(--foreground)]">{formatCurrency(Number(payment.amount))}</td>
                    <td className="px-4 py-3 text-[var(--muted)]">{formatCurrency(Number(payment.fee_amount))}</td>
                    <td className="px-4 py-3 text-[var(--foreground)]">{formatCurrency(Number(payment.net_amount))}</td>
                    <td className="px-4 py-3">
                      <PaymentStatusBadge status={payment.status} />
                    </td>
                    <td className="px-4 py-3 text-[var(--muted)]">
                      {payment.paid_at ? formatDate(payment.paid_at) : formatDate(payment.created_at)}
                    </td>
                    <td className="px-4 py-3 text-[var(--muted)]">{payment.profiles?.name ?? "Sistema"}</td>
                    <td className="px-4 py-3">
                      <PaymentActions
                        amount={Number(payment.amount)}
                        canRefund={payment.status === "paid"}
                        customerName={payment.customers?.name ?? "Cliente"}
                        orderNumber={payment.orders?.order_number ?? payment.order_id}
                        paymentId={payment.id}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {items.length === 0 ? (
            <p className="border-t border-[var(--border)] p-5 text-sm text-[var(--muted)]">
              Nenhum pagamento encontrado.
            </p>
          ) : null}
        </section>
      </div>
    </AdminShell>
  );
}
