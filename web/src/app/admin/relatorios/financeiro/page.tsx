import type { Metadata } from "next";
import Link from "next/link";
import { AdminShell, MetricCard } from "@/components/admin/admin-shell";
import { formatCurrency, formatDate } from "@/lib/format";
import {
  getCashEntryCategoryMeta,
  getPaymentStatusMeta,
  getStatusBadgeClassName,
} from "@/lib/status-labels";
import { requireOwnerPage } from "@/server/auth/require-admin-page";
import { CashflowService } from "@/server/cashflow/cashflow-service";
import { PaymentService } from "@/server/payments/payment-service";
import { createSupabaseAdminClient } from "@/server/supabase/admin-client";
import { throwQueryError } from "@/server/supabase/query-error";

export const metadata: Metadata = {
  title: "Relatorio financeiro admin",
};

type Props = {
  searchParams?: Promise<{
    endDate?: string;
    period?: string;
    startDate?: string;
  }>;
};

type PaymentListItem = {
  amount: number | string;
  method: string;
  status: string;
};

type OrderFinancialRow = {
  id: string;
  created_at: string;
  payments?: Array<{
    amount: number | string;
    status: string;
  }>;
  status: string;
  total: number | string;
};

const periodOptions = [
  { label: "Hoje", value: "today" },
  { label: "Ultimos 7 dias", value: "last7" },
  { label: "Mes atual", value: "currentMonth" },
  { label: "Mes anterior", value: "previousMonth" },
  { label: "Personalizado", value: "custom" },
] as const;

const paymentMethodLabels: Record<string, string> = {
  cash: "Dinheiro",
  credit_card: "Credito",
  debit_card: "Debito",
  manual: "Manual",
  pix: "Pix",
};

function getParam(value: string | undefined) {
  return value?.trim() ?? "";
}

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function endOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);
}

function toInputDate(date: Date) {
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

function endOfDate(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T23:59:59.999Z` : value;
}

function getPeriodRange(period: string, startDate: string, endDate: string) {
  const now = new Date();
  let start = new Date(now.getFullYear(), now.getMonth(), 1);
  let end = endOfDay(now);

  if (period === "today") {
    start = startOfDay(now);
    end = endOfDay(now);
  }

  if (period === "last7") {
    start = startOfDay(now);
    start.setDate(start.getDate() - 6);
    end = endOfDay(now);
  }

  if (period === "previousMonth") {
    start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    end = endOfDay(new Date(now.getFullYear(), now.getMonth(), 0));
  }

  if (period === "custom" && startDate) {
    start = startOfDay(new Date(`${startDate}T12:00:00`));
  }

  if (period === "custom" && endDate) {
    end = endOfDay(new Date(`${endDate}T12:00:00`));
  }

  return {
    endDate: endOfDate(toInputDate(end)),
    endInput: toInputDate(end),
    label: `${formatDate(toInputDate(start))} a ${formatDate(toInputDate(end))}`,
    startDate: toInputDate(start),
    startInput: toInputDate(start),
  };
}

async function getOrderFinancialSummary(startDate: string, endDate: string) {
  const { data, error } = await createSupabaseAdminClient()
    .from("orders")
    .select("id,total,status,created_at,payments(amount,status)")
    .gte("created_at", startDate)
    .lte("created_at", endDate)
    .not("status", "in", "(cancelled,refunded)");

  if (error) {
    throwQueryError(error, "Falha ao carregar pedidos do relatorio financeiro");
  }

  return ((data ?? []) as unknown as OrderFinancialRow[]).reduce(
    (summary, order) => {
      const paidAmount = (order.payments ?? [])
        .filter((payment) => payment.status === "paid")
        .reduce((sum, payment) => sum + Number(payment.amount), 0);
      const total = Number(order.total);

      if (total > 0 && paidAmount >= total) {
        summary.paid += 1;
      } else if (paidAmount > 0) {
        summary.partiallyPaid += 1;
      } else {
        summary.pending += 1;
      }

      return summary;
    },
    { paid: 0, partiallyPaid: 0, pending: 0 },
  );
}

function summarizePaymentsByMethod(payments: PaymentListItem[]) {
  const totals = new Map<string, { amount: number; count: number; method: string }>();

  for (const payment of payments) {
    if (payment.status !== "paid") {
      continue;
    }

    const current = totals.get(payment.method) ?? {
      amount: 0,
      count: 0,
      method: payment.method,
    };
    current.amount += Number(payment.amount);
    current.count += 1;
    totals.set(payment.method, current);
  }

  return Array.from(totals.values()).sort((first, second) => second.amount - first.amount);
}

export default async function AdminFinancialReportPage({ searchParams }: Props) {
  const owner = await requireOwnerPage("/admin/relatorios/financeiro");
  const params = await searchParams;
  const period = getParam(params?.period) || "currentMonth";
  const range = getPeriodRange(period, getParam(params?.startDate), getParam(params?.endDate));
  const filters = {
    endDate: range.endDate,
    startDate: range.startDate,
  };
  const paymentService = new PaymentService(undefined, owner.profile.id);
  const cashflowService = new CashflowService(undefined, owner.profile.id);
  const [paymentSummary, cashSummary, cashByCategory, payments, orderSummary] = await Promise.all([
    paymentService.getPaymentSummary(filters),
    cashflowService.getCashflowSummary(filters),
    cashflowService.getCashflowByCategory(filters),
    paymentService.listPayments(filters),
    getOrderFinancialSummary(filters.startDate, filters.endDate),
  ]);
  const paymentsByMethod = summarizePaymentsByMethod(payments as unknown as PaymentListItem[]);

  return (
    <AdminShell
      title="Relatorio financeiro"
      description={`Visao financeira basica do periodo: ${range.label}.`}
    >
      <div className="grid gap-6">
        <form className="grid gap-3 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4 lg:grid-cols-[180px_150px_150px_auto_auto] lg:items-end">
          <label className="block">
            <span className="text-sm font-semibold text-[var(--foreground)]">Periodo</span>
            <select
              name="period"
              defaultValue={period}
              className="mt-2 h-10 w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 text-sm outline-none focus:border-[var(--accent)]"
            >
              {periodOptions.map(({ label, value }) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-sm font-semibold text-[var(--foreground)]">Inicio</span>
            <input
              name="startDate"
              type="date"
              defaultValue={range.startInput}
              className="mt-2 h-10 w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 text-sm outline-none focus:border-[var(--accent)]"
            />
          </label>
          <label className="block">
            <span className="text-sm font-semibold text-[var(--foreground)]">Fim</span>
            <input
              name="endDate"
              type="date"
              defaultValue={range.endInput}
              className="mt-2 h-10 w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 text-sm outline-none focus:border-[var(--accent)]"
            />
          </label>
          <button className="h-10 rounded-md bg-[var(--accent)] px-4 text-sm font-black text-[#020617] hover:brightness-110">
            Filtrar
          </button>
          <Link
            href="/admin/relatorios/financeiro"
            className="inline-flex h-10 items-center justify-center rounded-md border border-[var(--border)] px-4 text-sm font-semibold text-[var(--foreground)] hover:bg-[var(--surface-strong)]"
          >
            Limpar
          </Link>
        </form>

        <div className="grid gap-4 md:grid-cols-4">
          <MetricCard label="Recebido" value={formatCurrency(paymentSummary.receivedInPeriod)} detail="Pagamentos pagos" />
          <MetricCard label="A receber" value={formatCurrency(paymentSummary.pendingReceivables)} detail="Pedidos ativos" />
          <MetricCard label="Reembolsado" value={formatCurrency(cashSummary.refunds)} detail="Saidas refund" />
          <MetricCard label="Taxas" value={formatCurrency(paymentSummary.feesInPeriod)} detail="Fee dos pagamentos" />
          <MetricCard label="Liquido" value={formatCurrency(paymentSummary.netInPeriod)} detail="Bruto menos taxas" />
          <MetricCard label="Pedidos pagos" value={`${orderSummary.paid}`} detail="No periodo" />
          <MetricCard label="Parciais" value={`${orderSummary.partiallyPaid}`} detail="Com saldo pendente" />
          <MetricCard label="Pendentes" value={`${orderSummary.pending}`} detail="Sem pagamento pago" />
        </div>

        <div className="grid gap-6 xl:grid-cols-2">
          <section className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-bold text-[var(--foreground)]">Vendas por metodo</h2>
              <span className={getStatusBadgeClassName(getPaymentStatusMeta("paid"))}>Pagos</span>
            </div>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[420px] text-left text-sm">
                <thead className="text-[var(--muted)]">
                  <tr>
                    <th className="py-2 pr-3">Metodo</th>
                    <th className="py-2 pr-3">Pagamentos</th>
                    <th className="py-2 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {paymentsByMethod.map((item) => (
                    <tr key={item.method}>
                      <td className="py-3 pr-3 text-[var(--foreground)]">
                        {paymentMethodLabels[item.method] ?? item.method}
                      </td>
                      <td className="py-3 pr-3 text-[var(--muted)]">{item.count}</td>
                      <td className="py-3 text-right font-semibold text-[var(--foreground)]">
                        {formatCurrency(item.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {paymentsByMethod.length === 0 ? (
                <p className="mt-4 text-sm text-[var(--muted)]">Nenhum pagamento pago no periodo.</p>
              ) : null}
            </div>
          </section>

          <section className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-bold text-[var(--foreground)]">Caixa por categoria</h2>
              <span className={getStatusBadgeClassName(getCashEntryCategoryMeta("sale"))}>Caixa</span>
            </div>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[420px] text-left text-sm">
                <thead className="text-[var(--muted)]">
                  <tr>
                    <th className="py-2 pr-3">Categoria</th>
                    <th className="py-2 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {cashByCategory.map((item) => {
                    const meta = getCashEntryCategoryMeta(item.category);
                    return (
                      <tr key={item.category}>
                        <td className="py-3 pr-3">
                          <span className={getStatusBadgeClassName(meta)}>{meta.label}</span>
                        </td>
                        <td className="py-3 text-right font-semibold text-[var(--foreground)]">
                          {formatCurrency(item.amount)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {cashByCategory.length === 0 ? (
                <p className="mt-4 text-sm text-[var(--muted)]">Nenhum lancamento de caixa no periodo.</p>
              ) : null}
            </div>
          </section>
        </div>
      </div>
    </AdminShell>
  );
}
