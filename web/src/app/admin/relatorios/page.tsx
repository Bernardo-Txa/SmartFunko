import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { AdminShell, MetricCard } from "@/components/admin/admin-shell";
import {
  CashflowChart,
  PaymentMethodChart,
  RaffleRevenueChart,
  RevenueChart,
  SalesByOriginChart,
  SalesBySellerChart,
  TopProductsChart,
} from "@/components/admin/bi-charts";
import { formatCurrency, formatDate } from "@/lib/format";
import { getOrderSellerLabel, orderSellerOptions } from "@/lib/order-labels";
import { requireOwnerPage } from "@/server/auth/require-admin-page";
import { BIService } from "@/server/bi/bi-service";

export const metadata: Metadata = {
  title: "BI admin",
};

type Props = {
  searchParams?: Promise<{
    from?: string;
    origin?: string;
    paymentMethod?: string;
    period?: string;
    seller?: string;
    to?: string;
  }>;
};

const periodOptions = [
  { label: "Hoje", value: "today" },
  { label: "Ultimos 7 dias", value: "last7" },
  { label: "Mes atual", value: "currentMonth" },
  { label: "Ultimos 30 dias", value: "last30" },
  { label: "Mes anterior", value: "previousMonth" },
  { label: "Ano atual", value: "currentYear" },
  { label: "Personalizado", value: "custom" },
] as const;

const paymentMethodOptions = [
  { label: "Manual", value: "manual" },
  { label: "Pix", value: "pix" },
  { label: "Cartao", value: "card" },
  { label: "InfinitePay", value: "infinitepay" },
  { label: "Rifa", value: "raffle" },
] as const;

const originOptions = [
  { label: "Catalogo/site", value: "stock" },
  { label: "WhatsApp", value: "whatsapp" },
  { label: "Encomenda", value: "national_order" },
  { label: "Leilao", value: "auction" },
  { label: "Rifa", value: "raffle" },
  { label: "Admin/manual", value: "manual" },
] as const;

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

function getPeriodRange(period: string, fromParam: string, toParam: string) {
  const now = new Date();
  let from = new Date(now.getFullYear(), now.getMonth(), 1);
  let to = endOfDay(now);

  if (period === "last30") {
    from = startOfDay(now);
    from.setDate(from.getDate() - 29);
  }

  if (period === "today") {
    from = startOfDay(now);
    to = endOfDay(now);
  }

  if (period === "last7") {
    from = startOfDay(now);
    from.setDate(from.getDate() - 6);
    to = endOfDay(now);
  }

  if (period === "previousMonth") {
    from = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    to = endOfDay(new Date(now.getFullYear(), now.getMonth(), 0));
  }

  if (period === "currentYear") {
    from = new Date(now.getFullYear(), 0, 1);
  }

  if (period === "custom" && fromParam) {
    from = startOfDay(new Date(`${fromParam}T12:00:00`));
  }

  if (period === "custom" && toParam) {
    to = endOfDay(new Date(`${toParam}T12:00:00`));
  }

  const fromInput = toInputDate(from);
  const toInput = toInputDate(to);

  return {
    from: fromInput,
    fromInput,
    label: `${formatDate(fromInput)} a ${formatDate(toInput)}`,
    to: endOfDate(toInput),
    toInput,
  };
}

function sellerLabel(value: string | null | undefined) {
  if (!value || value === "unassigned") {
    return "Sem vendedor";
  }

  return orderSellerOptions.some((option) => option.value === value) ? getOrderSellerLabel(value) : "Outros";
}

function TableSection({
  children,
  title,
}: {
  children: ReactNode;
  title: string;
}) {
  return (
    <section className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5">
      <h2 className="text-lg font-bold text-[var(--foreground)]">{title}</h2>
      <div className="mt-4 overflow-x-auto">{children}</div>
    </section>
  );
}

export default async function AdminBiReportsPage({ searchParams }: Props) {
  await requireOwnerPage("/admin/relatorios");
  const params = await searchParams;
  const period = getParam(params?.period) || "currentMonth";
  const seller = getParam(params?.seller);
  const origin = getParam(params?.origin);
  const paymentMethod = getParam(params?.paymentMethod);
  const range = getPeriodRange(period, getParam(params?.from), getParam(params?.to));
  const filters = {
    from: range.from,
    origin: origin || undefined,
    paymentMethod: paymentMethod || undefined,
    seller: seller || undefined,
    to: range.to,
  };
  const service = new BIService();
  const [
    overview,
    salesByPeriod,
    salesBySeller,
    salesByOrigin,
    salesByPaymentMethod,
    topCustomers,
    topProducts,
    topOrders,
    raffleByCampaign,
    cashflow,
    cashflowByPeriod,
    couponUsage,
    ranking,
  ] = await Promise.all([
    service.getBiOverview(filters),
    service.getSalesByPeriod(filters),
    service.getSalesBySeller(filters),
    service.getSalesByOrigin(filters),
    service.getSalesByPaymentMethod(filters),
    service.getTopCustomers(filters),
    service.getTopProducts(filters),
    service.getTopOrders(filters),
    service.getRaffleRevenueByCampaign(filters),
    service.getCashflowSummary(filters),
    service.getCashflowByPeriod(filters),
    service.getCouponUsage(filters),
    service.getMonthlyRankingSummary(filters),
  ]);
  const topSeller = salesBySeller[0];
  const topOrigin = salesByOrigin[0];
  const salesBySellerChartData = salesBySeller.map((item) => ({
    ...item,
    seller: sellerLabel(item.seller),
  }));

  return (
    <AdminShell title="BI Smart Funkos" description={`Relatorios gerenciais e validacao BI 1.1: ${range.label}.`}>
      <div className="grid gap-6">
        <div className="flex flex-wrap gap-2">
          <Link
            href="/admin/relatorios"
            className="inline-flex h-9 items-center justify-center rounded-md bg-[var(--surface-strong)] px-3 text-sm font-semibold text-[var(--foreground)]"
          >
            Visao geral
          </Link>
          <Link
            href="/admin/relatorios/financeiro"
            className="inline-flex h-9 items-center justify-center rounded-md border border-[var(--border)] px-3 text-sm font-semibold text-[var(--foreground)] hover:bg-[var(--surface-strong)]"
          >
            Financeiro
          </Link>
          <Link
            href="/admin/caixa"
            className="inline-flex h-9 items-center justify-center rounded-md border border-[var(--border)] px-3 text-sm font-semibold text-[var(--foreground)] hover:bg-[var(--surface-strong)]"
          >
            Caixa
          </Link>
        </div>

        <form className="grid gap-3 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4 xl:grid-cols-[160px_145px_145px_140px_190px_160px_auto_auto] xl:items-end">
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
              name="from"
              type="date"
              defaultValue={range.fromInput}
              className="mt-2 h-10 w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 text-sm outline-none focus:border-[var(--accent)]"
            />
          </label>
          <label className="block">
            <span className="text-sm font-semibold text-[var(--foreground)]">Fim</span>
            <input
              name="to"
              type="date"
              defaultValue={range.toInput}
              className="mt-2 h-10 w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 text-sm outline-none focus:border-[var(--accent)]"
            />
          </label>
          <label className="block">
            <span className="text-sm font-semibold text-[var(--foreground)]">Vendedor</span>
            <select
              name="seller"
              defaultValue={seller}
              className="mt-2 h-10 w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 text-sm outline-none focus:border-[var(--accent)]"
            >
              <option value="">Todos</option>
              {orderSellerOptions.map(({ label, value }) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-sm font-semibold text-[var(--foreground)]">Origem</span>
            <select
              name="origin"
              defaultValue={origin}
              className="mt-2 h-10 w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 text-sm outline-none focus:border-[var(--accent)]"
            >
              <option value="">Todas</option>
              {originOptions.map(({ label, value }) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-sm font-semibold text-[var(--foreground)]">Pagamento</span>
            <select
              name="paymentMethod"
              defaultValue={paymentMethod}
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
          <button className="h-10 rounded-md bg-[var(--accent)] px-4 text-sm font-black text-[#020617] hover:brightness-110">
            Filtrar
          </button>
          <Link
            href="/admin/relatorios"
            className="inline-flex h-10 items-center justify-center rounded-md border border-[var(--border)] px-4 text-sm font-semibold text-[var(--foreground)] hover:bg-[var(--surface-strong)]"
          >
            Limpar
          </Link>
        </form>

        <div className="grid gap-4 md:grid-cols-4">
          <MetricCard label="Receita confirmada" value={formatCurrency(overview.confirmedRevenue)} detail="Vendas pagas" />
          <MetricCard label="Pedidos pagos" value={`${overview.paidOrders}`} detail="Com entrada de venda" />
          <MetricCard label="Ticket medio" value={formatCurrency(overview.averageTicket)} detail="Receita / pedidos" />
          <MetricCard label="Receita pendente" value={formatCurrency(overview.pendingRevenue)} detail="Pedidos em aberto" />
          <MetricCard label="Em analise" value={`${overview.underReviewOrders}`} detail="Checkout assistido" />
          <MetricCard label="Aguardando pagamento" value={`${overview.awaitingPaymentOrders}`} detail="Aprovados ou parciais" />
          <MetricCard label="Receita de rifas" value={formatCurrency(overview.raffleRevenue)} detail="Fonte unica: raffle_orders" />
          <MetricCard label="Caixa liquido" value={formatCurrency(overview.cashflowNet)} detail="Entradas - saidas + ajustes" />
          <MetricCard label="Top vendedor" value={topSeller ? sellerLabel(topSeller.seller) : "-"} detail={topSeller ? formatCurrency(topSeller.amount) : "Sem vendas"} />
          <MetricCard label="Top origem" value={topOrigin?.origin ?? "-"} detail={topOrigin ? formatCurrency(topOrigin.amount) : "Sem origem"} />
        </div>

        <div className="grid gap-6 xl:grid-cols-2">
          <RevenueChart data={salesByPeriod} />
          <SalesBySellerChart data={salesBySellerChartData} />
          <SalesByOriginChart data={salesByOrigin} />
          <PaymentMethodChart data={salesByPaymentMethod} />
          <TopProductsChart data={topProducts} />
          <RaffleRevenueChart data={raffleByCampaign} />
          <div className="xl:col-span-2">
            <CashflowChart data={cashflowByPeriod} />
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-2">
          <TableSection title="Vendas por periodo">
            <table className="w-full min-w-[420px] text-left text-sm">
              <thead className="text-[var(--muted)]">
                <tr>
                  <th className="py-2 pr-3">Periodo</th>
                  <th className="py-2 pr-3">Pedidos</th>
                  <th className="py-2 text-right">Receita</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {salesByPeriod.slice(-14).map((item) => (
                  <tr key={item.period}>
                    <td className="py-3 pr-3 text-[var(--foreground)]">{item.label}</td>
                    <td className="py-3 pr-3 text-[var(--muted)]">{item.orders}</td>
                    <td className="py-3 text-right font-semibold text-[var(--foreground)]">{formatCurrency(item.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {salesByPeriod.length === 0 ? <p className="text-sm text-[var(--muted)]">Sem vendas confirmadas no periodo.</p> : null}
          </TableSection>

          <TableSection title="Vendas por vendedor">
            <table className="w-full min-w-[420px] text-left text-sm">
              <thead className="text-[var(--muted)]">
                <tr>
                  <th className="py-2 pr-3">Vendedor</th>
                  <th className="py-2 pr-3">Pedidos</th>
                  <th className="py-2 text-right">Receita</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {salesBySeller.map((item) => (
                  <tr key={item.seller}>
                    <td className="py-3 pr-3 text-[var(--foreground)]">{sellerLabel(item.seller)}</td>
                    <td className="py-3 pr-3 text-[var(--muted)]">{item.orders}</td>
                    <td className="py-3 text-right font-semibold text-[var(--foreground)]">{formatCurrency(item.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {salesBySeller.length === 0 ? <p className="text-sm text-[var(--muted)]">Sem vendas por vendedor.</p> : null}
          </TableSection>

          <TableSection title="Vendas por origem">
            <table className="w-full min-w-[420px] text-left text-sm">
              <thead className="text-[var(--muted)]">
                <tr>
                  <th className="py-2 pr-3">Origem</th>
                  <th className="py-2 pr-3">Itens</th>
                  <th className="py-2 text-right">Receita</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {salesByOrigin.map((item) => (
                  <tr key={item.origin}>
                    <td className="py-3 pr-3 text-[var(--foreground)]">{item.origin}</td>
                    <td className="py-3 pr-3 text-[var(--muted)]">{item.items}</td>
                    <td className="py-3 text-right font-semibold text-[var(--foreground)]">{formatCurrency(item.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {salesByOrigin.length === 0 ? <p className="text-sm text-[var(--muted)]">Sem vendas por origem.</p> : null}
          </TableSection>

          <TableSection title="Vendas por pagamento">
            <table className="w-full min-w-[420px] text-left text-sm">
              <thead className="text-[var(--muted)]">
                <tr>
                  <th className="py-2 pr-3">Metodo</th>
                  <th className="py-2 pr-3">Lancamentos</th>
                  <th className="py-2 text-right">Receita</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {salesByPaymentMethod.map((item) => (
                  <tr key={item.method}>
                    <td className="py-3 pr-3 text-[var(--foreground)]">{item.method}</td>
                    <td className="py-3 pr-3 text-[var(--muted)]">{item.count}</td>
                    <td className="py-3 text-right font-semibold text-[var(--foreground)]">{formatCurrency(item.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {salesByPaymentMethod.length === 0 ? <p className="text-sm text-[var(--muted)]">Sem pagamentos confirmados.</p> : null}
          </TableSection>

          <TableSection title="Top clientes">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="text-[var(--muted)]">
                <tr>
                  <th className="py-2 pr-3">Cliente</th>
                  <th className="py-2 pr-3">Pedidos pagos</th>
                  <th className="py-2 pr-3">Ticket medio</th>
                  <th className="py-2 pr-3">Ultimo pedido</th>
                  <th className="py-2 pr-3">Clube</th>
                  <th className="py-2 text-right">Receita</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {topCustomers.slice(0, 10).map((item) => (
                  <tr key={item.customerId ?? item.name}>
                    <td className="py-3 pr-3 text-[var(--foreground)]">{item.name}</td>
                    <td className="py-3 pr-3 text-[var(--muted)]">{item.orders}</td>
                    <td className="py-3 pr-3 text-[var(--muted)]">{formatCurrency(item.averageTicket)}</td>
                    <td className="py-3 pr-3 text-[var(--muted)]">{item.lastOrderAt ? formatDate(item.lastOrderAt) : "-"}</td>
                    <td className="py-3 pr-3 text-[var(--muted)]">{item.clubLevel ?? "-"}</td>
                    <td className="py-3 text-right font-semibold text-[var(--foreground)]">{formatCurrency(item.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {topCustomers.length === 0 ? <p className="text-sm text-[var(--muted)]">Sem clientes no periodo.</p> : null}
          </TableSection>

          <TableSection title="Top produtos">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="text-[var(--muted)]">
                <tr>
                  <th className="py-2 pr-3">Produto</th>
                  <th className="py-2 pr-3">Qtd.</th>
                  <th className="py-2 pr-3">Ticket item</th>
                  <th className="py-2 text-right">Receita</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {topProducts.slice(0, 10).map((item) => (
                  <tr key={`${item.productId ?? item.productName}-${item.sku ?? ""}`}>
                    <td className="py-3 pr-3 text-[var(--foreground)]">
                      {item.productName}
                      {item.sku ? <span className="ml-2 text-xs text-[var(--muted)]">{item.sku}</span> : null}
                    </td>
                    <td className="py-3 pr-3 text-[var(--muted)]">{item.quantity}</td>
                    <td className="py-3 pr-3 text-[var(--muted)]">{formatCurrency(item.averageItemTicket)}</td>
                    <td className="py-3 text-right font-semibold text-[var(--foreground)]">{formatCurrency(item.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {topProducts.length === 0 ? <p className="text-sm text-[var(--muted)]">Sem produtos vendidos.</p> : null}
          </TableSection>

          <TableSection title="Top pedidos">
            <table className="w-full min-w-[820px] text-left text-sm">
              <thead className="text-[var(--muted)]">
                <tr>
                  <th className="py-2 pr-3">Pedido</th>
                  <th className="py-2 pr-3">Cliente</th>
                  <th className="py-2 pr-3">Vendedor</th>
                  <th className="py-2 pr-3">Origem</th>
                  <th className="py-2 pr-3">Pagamento</th>
                  <th className="py-2 pr-3">Pago em</th>
                  <th className="py-2 text-right">Receita</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {topOrders.slice(0, 10).map((item) => (
                  <tr key={item.orderId}>
                    <td className="py-3 pr-3 font-semibold text-[var(--foreground)]">
                      <Link href={`/admin/pedidos/${item.orderId}`} className="hover:text-[var(--accent)]">
                        {item.orderNumber}
                      </Link>
                    </td>
                    <td className="py-3 pr-3 text-[var(--muted)]">{item.customerName}</td>
                    <td className="py-3 pr-3 text-[var(--muted)]">{sellerLabel(item.seller)}</td>
                    <td className="py-3 pr-3 text-[var(--muted)]">{item.origin}</td>
                    <td className="py-3 pr-3 text-[var(--muted)]">{item.method}</td>
                    <td className="py-3 pr-3 text-[var(--muted)]">{item.paidAt ? formatDate(item.paidAt) : "-"}</td>
                    <td className="py-3 text-right font-semibold text-[var(--foreground)]">{formatCurrency(item.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {topOrders.length === 0 ? <p className="text-sm text-[var(--muted)]">Sem pedidos pagos.</p> : null}
          </TableSection>

          <TableSection title="Cupons">
            <table className="w-full min-w-[420px] text-left text-sm">
              <thead className="text-[var(--muted)]">
                <tr>
                  <th className="py-2 pr-3">Cupom</th>
                  <th className="py-2 pr-3">Pedidos</th>
                  <th className="py-2 text-right">Desconto</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {couponUsage.slice(0, 8).map((item) => (
                  <tr key={item.code}>
                    <td className="py-3 pr-3 font-semibold text-[var(--foreground)]">{item.code}</td>
                    <td className="py-3 pr-3 text-[var(--muted)]">{item.orders}</td>
                    <td className="py-3 text-right font-semibold text-[var(--foreground)]">{formatCurrency(item.discount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {couponUsage.length === 0 ? <p className="text-sm text-[var(--muted)]">Sem cupons em vendas pagas.</p> : null}
          </TableSection>

          <TableSection title="Rifas">
            <table className="w-full min-w-[620px] text-left text-sm">
              <thead className="text-[var(--muted)]">
                <tr>
                  <th className="py-2 pr-3">Campanha</th>
                  <th className="py-2 pr-3">Numeros pagos</th>
                  <th className="py-2 pr-3">Numeros pendentes</th>
                  <th className="py-2 pr-3">Pedidos pagos</th>
                  <th className="py-2 text-right">Receita paga</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {raffleByCampaign.slice(0, 10).map((item) => (
                  <tr key={item.campaignId ?? item.campaignTitle}>
                    <td className="py-3 pr-3 text-[var(--foreground)]">{item.campaignTitle}</td>
                    <td className="py-3 pr-3 text-[var(--muted)]">{item.soldNumbers}</td>
                    <td className="py-3 pr-3 text-[var(--muted)]">{item.pendingNumbers}</td>
                    <td className="py-3 pr-3 text-[var(--muted)]">{item.paidOrders}</td>
                    <td className="py-3 text-right font-semibold text-[var(--foreground)]">{formatCurrency(item.paidAmount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {raffleByCampaign.length === 0 ? <p className="text-sm text-[var(--muted)]">Sem rifas no periodo.</p> : null}
          </TableSection>

          <TableSection title="Caixa no periodo">
            <div className="grid gap-3 text-sm">
              <div className="flex justify-between gap-4 border-b border-[var(--border)] pb-3">
                <span className="text-[var(--muted)]">Entradas</span>
                <strong className="text-[var(--foreground)]">{formatCurrency(cashflow.incomeInPeriod)}</strong>
              </div>
              <div className="flex justify-between gap-4 border-b border-[var(--border)] pb-3">
                <span className="text-[var(--muted)]">Saidas</span>
                <strong className="text-[var(--foreground)]">{formatCurrency(cashflow.expenseInPeriod)}</strong>
              </div>
              <div className="flex justify-between gap-4 border-b border-[var(--border)] pb-3">
                <span className="text-[var(--muted)]">Ajustes</span>
                <strong className="text-[var(--foreground)]">{formatCurrency(cashflow.adjustmentsInPeriod)}</strong>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-[var(--muted)]">Saldo liquido</span>
                <strong className="text-[var(--foreground)]">{formatCurrency(cashflow.netInPeriod)}</strong>
              </div>
            </div>
          </TableSection>

          <TableSection title="Ranking mensal">
            {ranking ? (
              <div className="grid gap-4">
                <div className="flex flex-col gap-1 text-sm text-[var(--muted)]">
                  <strong className="text-[var(--foreground)]">{ranking.title}</strong>
                  <span>Status: {ranking.status}</span>
                  <Link href="/admin/clube/ranking" className="font-semibold text-[var(--accent)] hover:brightness-110">
                    Abrir ranking do clube
                  </Link>
                </div>
                <table className="w-full min-w-[520px] text-left text-sm">
                  <thead className="text-[var(--muted)]">
                    <tr>
                      <th className="py-2 pr-3">Pos.</th>
                      <th className="py-2 pr-3">Cliente</th>
                      <th className="py-2 pr-3">Pedido</th>
                      <th className="py-2 pr-3">Brinde</th>
                      <th className="py-2 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border)]">
                    {ranking.entries.slice(0, 3).map((entry) => (
                      <tr key={entry.orderNumber}>
                        <td className="py-3 pr-3 text-[var(--muted)]">{entry.position ?? "-"}</td>
                        <td className="py-3 pr-3 text-[var(--foreground)]">{entry.customerName}</td>
                        <td className="py-3 pr-3 text-[var(--muted)]">{entry.orderNumber}</td>
                        <td className="py-3 pr-3 text-[var(--muted)]">{entry.rewardStatus}</td>
                        <td className="py-3 text-right font-semibold text-[var(--foreground)]">{formatCurrency(entry.orderTotal)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {ranking.entries.length === 0 ? <p className="text-sm text-[var(--muted)]">Sem entradas no ranking.</p> : null}
              </div>
            ) : (
              <p className="text-sm text-[var(--muted)]">Sem ranking mensal para o periodo.</p>
            )}
          </TableSection>
        </div>
      </div>
    </AdminShell>
  );
}
