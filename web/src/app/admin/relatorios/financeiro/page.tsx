import type { Metadata } from "next";
import Link from "next/link";
import { Filter, RotateCcw } from "lucide-react";
import { AdminShell } from "@/components/admin/admin-shell";
import {
  ReportHero,
  ReportKpiCard,
  ReportNavigation,
  ReportProgressBar,
  ReportTableSection as TableSection,
} from "@/components/admin/report-ui";
import { formatCurrency, formatDate } from "@/lib/format";
import {
  getOrderItemSourceLabel,
  getOrderSellerLabel,
} from "@/lib/order-labels";
import {
  getCashEntryCategoryMeta,
  getPaymentStatusMeta,
  getStatusBadgeClassName,
} from "@/lib/status-labels";
import { requireOwnerPage } from "@/server/auth/require-admin-page";
import { CashflowService } from "@/server/cashflow/cashflow-service";
import { PaymentService } from "@/server/payments/payment-service";
import { getCompetenceRange, ReportCompetenceService } from "@/server/reports/report-competencies";
import { createSupabaseAdminClient } from "@/server/supabase/admin-client";
import { throwQueryError } from "@/server/supabase/query-error";

export const metadata: Metadata = {
  title: "Relatorio financeiro admin",
};

type Props = {
  searchParams?: Promise<{
    competenceId?: string;
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
  order_items?: Array<{
    source: string;
    status: string;
    total_price: number | string;
  }>;
  payments?: Array<{
    amount: number | string;
    status: string;
  }>;
  seller: string | null;
  status: string;
  total: number | string;
};

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

async function getOrderFinancialSummary(startDate: string, endDate: string) {
  const { data, error } = await createSupabaseAdminClient()
    .from("orders")
    .select("id,total,status,seller,created_at,payments(amount,status),order_items(source,status,total_price)")
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

      const sellerKey = order.seller ?? "unassigned";
      const sellerSummary = summary.bySeller.get(sellerKey) ?? {
        amount: 0,
        count: 0,
        seller: sellerKey,
      };
      sellerSummary.amount += total;
      sellerSummary.count += 1;
      summary.bySeller.set(sellerKey, sellerSummary);

      for (const item of order.order_items ?? []) {
        if (item.status === "cancelled") {
          continue;
        }

        const sourceSummary = summary.bySource.get(item.source) ?? {
          amount: 0,
          count: 0,
          source: item.source,
        };
        sourceSummary.amount += Number(item.total_price);
        sourceSummary.count += 1;
        summary.bySource.set(item.source, sourceSummary);
      }

      return summary;
    },
    {
      bySeller: new Map<string, { amount: number; count: number; seller: string }>(),
      bySource: new Map<string, { amount: number; count: number; source: string }>(),
      paid: 0,
      partiallyPaid: 0,
      pending: 0,
    },
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

function getShare(value: number, total: number) {
  return total > 0 ? (value / total) * 100 : 0;
}

function percent(value: number) {
  return `${value.toFixed(1).replace(".", ",")}%`;
}

export default async function AdminFinancialReportPage({ searchParams }: Props) {
  const owner = await requireOwnerPage("/admin/relatorios/financeiro");
  const params = await searchParams;
  const competenceId = getParam(params?.competenceId);
  const competenceService = new ReportCompetenceService();
  const competencies = await competenceService.listCompetencies();
  const competence = competenceService.resolveSelected(competencies, competenceId);
  const range = competence ? getCompetenceRange(competence) : {
    from: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString(),
    label: "Sem competencia cadastrada",
    to: new Date().toISOString(),
  };
  const filters = {
    endDate: range.to,
    startDate: range.from,
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
  const salesBySeller = Array.from(orderSummary.bySeller.values()).sort((first, second) => second.amount - first.amount);
  const salesBySource = Array.from(orderSummary.bySource.values()).sort((first, second) => second.amount - first.amount);
  const grossReceived = paymentSummary.receivedInPeriod;
  const feeRate = getShare(paymentSummary.feesInPeriod, grossReceived);
  const netRate = getShare(paymentSummary.netInPeriod, grossReceived);
  const expenseRate = getShare(cashSummary.expenseInPeriod, cashSummary.incomeInPeriod);
  const totalOrderCount = orderSummary.paid + orderSummary.partiallyPaid + orderSummary.pending;
  const paidOrderShare = getShare(orderSummary.paid, totalOrderCount);
  const maxSellerAmount = Math.max(...salesBySeller.map((item) => item.amount), 0);
  const maxSourceAmount = Math.max(...salesBySource.map((item) => item.amount), 0);
  const maxMethodAmount = Math.max(...paymentsByMethod.map((item) => item.amount), 0);
  const maxCashCategoryAmount = Math.max(...cashByCategory.map((item) => item.amount), 0);

  return (
    <AdminShell
      title="Relatorios"
      description={`Financeiro operacional por competencia: ${competence?.label ?? "sem competencia"}.`}
    >
      <div className="grid gap-6">
        <ReportNavigation active="finance" />

        <ReportHero
          eyebrow="Controle financeiro"
          title="Recebimentos e caixa"
          description={`Resumo de dinheiro recebido, liquidez, taxas e pendencias da competencia ${competence?.label ?? "selecionada"}${competence ? ` (${formatDate(competence.starts_on)} a ${formatDate(competence.ends_on)})` : ""}.`}
          actions={(
            <>
              <Link
                href="/admin/pagamentos"
                className="inline-flex h-10 items-center justify-center rounded-md border border-[var(--border)] px-3 text-sm font-semibold text-[var(--foreground)] hover:bg-[var(--surface-strong)]"
              >
                Pagamentos
              </Link>
              <Link
                href="/admin/caixa"
                className="inline-flex h-10 items-center justify-center rounded-md bg-[var(--accent)] px-3 text-sm font-black text-slate-950 hover:brightness-110"
              >
                Abrir caixa
              </Link>
            </>
          )}
        >
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1.05fr)_minmax(300px,0.95fr)]">
            <div className="rounded-lg border border-[var(--border)] bg-[var(--background)] p-4">
              <span className="text-xs font-black uppercase tracking-[0.12em] text-[var(--muted)]">Liquido do periodo</span>
              <strong className="mt-2 block text-3xl text-[var(--foreground)]">{formatCurrency(paymentSummary.netInPeriod)}</strong>
              <p className="mt-2 text-sm text-[var(--muted)]">
                Bruto de {formatCurrency(grossReceived)} com {formatCurrency(paymentSummary.feesInPeriod)} em taxas.
              </p>
              <div className="mt-5 grid gap-2">
                <div className="flex justify-between gap-3 text-xs font-semibold text-[var(--muted)]">
                  <span>Liquidez sobre recebido</span>
                  <span>{percent(netRate)}</span>
                </div>
                <ReportProgressBar value={netRate} tone="emerald" />
                <div className="flex justify-between gap-3 text-xs font-semibold text-[var(--muted)]">
                  <span>Taxas</span>
                  <span>{percent(feeRate)}</span>
                </div>
                <ReportProgressBar value={feeRate} tone={feeRate > 8 ? "warning" : "accent"} />
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <ReportKpiCard label="A receber" value={formatCurrency(paymentSummary.pendingReceivables)} detail="Pedidos ativos pendentes" tone="warning" />
              <ReportKpiCard label="Caixa liquido" value={formatCurrency(cashSummary.netInPeriod)} detail="Entradas - saidas" tone={cashSummary.netInPeriod >= 0 ? "emerald" : "danger"} />
              <ReportKpiCard label="Reembolsos" value={formatCurrency(cashSummary.refunds)} detail="Saidas manuais" tone={cashSummary.refunds > 0 ? "danger" : "muted"} />
              <ReportKpiCard label="Despesas" value={percent(expenseRate)} detail={formatCurrency(cashSummary.expenseInPeriod)} tone={expenseRate > 30 ? "warning" : "muted"} />
            </div>
          </div>
        </ReportHero>

        <form className="grid gap-3 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4 sm:grid-cols-2 xl:grid-cols-[minmax(260px,1fr)_auto_auto] xl:items-end">
          <label className="block">
            <span className="text-sm font-semibold text-[var(--foreground)]">Competencia</span>
            <select
              name="competenceId"
              defaultValue={competence?.id ?? ""}
              className="mt-2 h-10 w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 text-sm outline-none focus:border-[var(--accent)]"
            >
              {competencies.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label} - {formatDate(option.starts_on)} a {formatDate(option.ends_on)}
                </option>
              ))}
            </select>
          </label>
          <button className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-[var(--accent)] px-4 text-sm font-black text-[#020617] hover:brightness-110">
            <Filter size={16} aria-hidden="true" />
            Filtrar
          </button>
          <Link
            href="/admin/relatorios/financeiro"
            className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-[var(--border)] px-4 text-sm font-semibold text-[var(--foreground)] hover:bg-[var(--surface-strong)]"
          >
            <RotateCcw size={16} aria-hidden="true" />
            Limpar
          </Link>
        </form>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <ReportKpiCard label="Recebido" value={formatCurrency(paymentSummary.receivedInPeriod)} detail="Pagamentos pagos" tone="emerald" />
          <ReportKpiCard label="Taxas" value={formatCurrency(paymentSummary.feesInPeriod)} detail={percent(feeRate)} tone={feeRate > 8 ? "warning" : "muted"} />
          <ReportKpiCard label="Hoje" value={formatCurrency(paymentSummary.receivedToday)} detail={`Caixa liquido ${formatCurrency(cashSummary.netToday)}`} tone="accent" />
          <ReportKpiCard label="Mes" value={formatCurrency(paymentSummary.receivedThisMonth)} detail={`Entradas ${formatCurrency(cashSummary.incomeThisMonth)}`} tone="violet" />
          <ReportKpiCard label="Pedidos pagos" value={`${orderSummary.paid}`} detail={`${percent(paidOrderShare)} dos pedidos`} tone="emerald" />
          <ReportKpiCard label="Parciais" value={`${orderSummary.partiallyPaid}`} detail="Com saldo pendente" tone={orderSummary.partiallyPaid > 0 ? "warning" : "muted"} />
          <ReportKpiCard label="Pendentes" value={`${orderSummary.pending}`} detail="Sem pagamento pago" tone={orderSummary.pending > 0 ? "warning" : "muted"} />
          <ReportKpiCard label="Ajustes" value={formatCurrency(cashSummary.manualAdjustments)} detail="Ajustes manuais" />
        </div>

        <div className="grid gap-6 xl:grid-cols-2">
          <TableSection title="Vendas por vendedor" description="Participacao de cada vendedor no total do periodo.">
              <table className="w-full min-w-[420px] text-left text-sm">
                <thead className="text-[var(--muted)]">
                  <tr>
                    <th className="py-2 pr-3">Vendedor</th>
                    <th className="py-2 pr-3">Pedidos</th>
                    <th className="py-2 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {salesBySeller.map((item) => (
                    <tr key={item.seller}>
                      <td className="py-3 pr-3 text-[var(--foreground)]">
                        <div className="grid gap-1">
                          <span>{getOrderSellerLabel(item.seller)}</span>
                          <ReportProgressBar value={getShare(item.amount, maxSellerAmount)} tone="accent" />
                        </div>
                      </td>
                      <td className="py-3 pr-3 text-[var(--muted)]">{item.count}</td>
                      <td className="py-3 text-right font-semibold text-[var(--foreground)]">
                        {formatCurrency(item.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {salesBySeller.length === 0 ? (
                <p className="mt-4 text-sm text-[var(--muted)]">Nenhuma venda no periodo.</p>
              ) : null}
          </TableSection>

          <TableSection title="Vendas por origem" description="De onde vieram os itens vendidos no periodo.">
              <table className="w-full min-w-[420px] text-left text-sm">
                <thead className="text-[var(--muted)]">
                  <tr>
                    <th className="py-2 pr-3">Origem</th>
                    <th className="py-2 pr-3">Itens</th>
                    <th className="py-2 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {salesBySource.map((item) => (
                    <tr key={item.source}>
                      <td className="py-3 pr-3 text-[var(--foreground)]">
                        <div className="grid gap-1">
                          <span>{getOrderItemSourceLabel(item.source)}</span>
                          <ReportProgressBar value={getShare(item.amount, maxSourceAmount)} tone="violet" />
                        </div>
                      </td>
                      <td className="py-3 pr-3 text-[var(--muted)]">{item.count}</td>
                      <td className="py-3 text-right font-semibold text-[var(--foreground)]">
                        {formatCurrency(item.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {salesBySource.length === 0 ? (
                <p className="mt-4 text-sm text-[var(--muted)]">Nenhum item vendido no periodo.</p>
              ) : null}
          </TableSection>

          <TableSection
            title="Vendas por metodo"
            description="Distribuicao dos pagamentos pagos."
            action={<span className={getStatusBadgeClassName(getPaymentStatusMeta("paid"))}>Pagos</span>}
          >
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
                        <div className="grid gap-1">
                          <span>{paymentMethodLabels[item.method] ?? item.method}</span>
                          <ReportProgressBar value={getShare(item.amount, maxMethodAmount)} tone="emerald" />
                        </div>
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
          </TableSection>

          <TableSection
            title="Caixa por categoria"
            description="Lancamentos de entrada, saida e ajuste agrupados por categoria."
            action={<span className={getStatusBadgeClassName(getCashEntryCategoryMeta("sale"))}>Caixa</span>}
          >
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
                          <div className="grid gap-2">
                            <span className={getStatusBadgeClassName(meta)}>{meta.label}</span>
                            <ReportProgressBar value={getShare(item.amount, maxCashCategoryAmount)} tone={item.amount < 0 ? "danger" : "accent"} />
                          </div>
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
          </TableSection>
        </div>
      </div>
    </AdminShell>
  );
}
