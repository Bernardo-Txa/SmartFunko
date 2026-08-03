import type { Metadata } from "next";
import Link from "next/link";
import { Filter, RotateCcw } from "lucide-react";
import { AdminShell } from "@/components/admin/admin-shell";
import {
  CashflowChart,
  PaymentMethodChart,
  RaffleRevenueChart,
  RevenueChart,
  SalesByOriginChart,
  SalesBySellerChart,
  TopProductsChart,
} from "@/components/admin/bi-charts";
import {
  ReportHero,
  ReportKpiCard,
  ReportNavigation,
  ReportProgressBar,
  ReportTableSection as TableSection,
} from "@/components/admin/report-ui";
import { formatCurrency, formatDate } from "@/lib/format";
import { getOrderSellerLabel, orderSellerOptions } from "@/lib/order-labels";
import { requireOwnerPage } from "@/server/auth/require-admin-page";
import { BIService } from "@/server/bi/bi-service";
import { getCompetenceRange, ReportCompetenceService } from "@/server/reports/report-competencies";

export const metadata: Metadata = {
  title: "BI admin",
};

type Props = {
  searchParams?: Promise<{
    competenceId?: string;
    from?: string;
    origin?: string;
    paymentMethod?: string;
    seller?: string;
    to?: string;
  }>;
};

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

function sellerLabel(value: string | null | undefined) {
  if (!value || value === "unassigned") {
    return "Sem vendedor";
  }

  return orderSellerOptions.some((option) => option.value === value) ? getOrderSellerLabel(value) : "Outros";
}

function percent(value: number) {
  return `${value.toFixed(1).replace(".", ",")}%`;
}

function getShare(value: number, total: number) {
  return total > 0 ? (value / total) * 100 : 0;
}

export default async function AdminBiReportsPage({ searchParams }: Props) {
  await requireOwnerPage("/admin/relatorios");
  const params = await searchParams;
  const competenceId = getParam(params?.competenceId);
  const seller = getParam(params?.seller);
  const origin = getParam(params?.origin);
  const paymentMethod = getParam(params?.paymentMethod);
  const competenceService = new ReportCompetenceService();
  const competencies = await competenceService.listCompetencies();
  const competence = competenceService.resolveSelected(competencies, competenceId);
  const range = competence ? getCompetenceRange(competence) : null;
  const filters = {
    from: range?.from,
    origin: origin || undefined,
    paymentMethod: paymentMethod || undefined,
    seller: seller || undefined,
    to: range?.to,
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
  const opportunity = overview.confirmedRevenue + overview.pendingRevenue;
  const confirmedShare = getShare(overview.confirmedRevenue, opportunity);
  const pendingShare = getShare(overview.pendingRevenue, opportunity);
  const attentionOrders = overview.underReviewOrders + overview.awaitingPaymentOrders;
  const topCustomer = topCustomers[0];
  const topProduct = topProducts[0];
  const topCustomerShare = topCustomer ? getShare(topCustomer.amount, overview.confirmedRevenue) : 0;
  const raffleShare = getShare(overview.raffleRevenue, overview.confirmedRevenue);

  return (
    <AdminShell title="Relatorios" description={`BI operacional por competencia: ${competence?.label ?? "sem competencia"}.`}>
      <div className="grid gap-6">
        <ReportNavigation active="bi" />

        <ReportHero
          eyebrow="Visao executiva"
          title="Performance comercial"
          description={`Receita, pendencias e canais da competencia ${competence?.label ?? "selecionada"}${competence ? ` (${formatDate(competence.starts_on)} a ${formatDate(competence.ends_on)})` : ""}.`}
          actions={(
            <>
              <Link
                href="/admin/relatorios/fechamento"
                className="inline-flex h-10 items-center justify-center rounded-md border border-[var(--border)] px-3 text-sm font-semibold text-[var(--foreground)] hover:bg-[var(--surface-strong)]"
              >
                Fechamento
              </Link>
              <Link
                href="/admin/v2/pedidos"
                className="inline-flex h-10 items-center justify-center rounded-md bg-[var(--accent)] px-3 text-sm font-black text-slate-950 hover:brightness-110"
              >
                Abrir pedidos
              </Link>
            </>
          )}
        >
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(280px,0.9fr)]">
            <div className="rounded-lg border border-[var(--border)] bg-[var(--background)] p-4">
              <span className="text-xs font-black uppercase tracking-[0.12em] text-[var(--muted)]">Receita confirmada</span>
              <strong className="mt-2 block text-3xl text-[var(--foreground)]">{formatCurrency(overview.confirmedRevenue)}</strong>
              <p className="mt-2 text-sm text-[var(--muted)]">
                {overview.paidOrders} pedido(s) pago(s), ticket medio de {formatCurrency(overview.averageTicket)}.
              </p>
              <div className="mt-5 grid gap-2">
                <div className="flex justify-between gap-3 text-xs font-semibold text-[var(--muted)]">
                  <span>Confirmado</span>
                  <span>{percent(confirmedShare)}</span>
                </div>
                <ReportProgressBar value={confirmedShare} tone="emerald" />
                <div className="flex justify-between gap-3 text-xs font-semibold text-[var(--muted)]">
                  <span>Pendente</span>
                  <span>{percent(pendingShare)}</span>
                </div>
                <ReportProgressBar value={pendingShare} tone="warning" />
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <ReportKpiCard label="A receber" value={formatCurrency(overview.pendingRevenue)} detail="Pedidos em aberto" tone="warning" />
              <ReportKpiCard label="Atencao" value={`${attentionOrders}`} detail="Analise ou pagamento" tone={attentionOrders > 0 ? "danger" : "emerald"} />
              <ReportKpiCard label="Rifas" value={formatCurrency(overview.raffleRevenue)} detail={`${percent(raffleShare)} da receita`} tone="violet" />
              <ReportKpiCard label="Caixa liquido" value={formatCurrency(overview.cashflowNet)} detail="Entradas - saidas" tone={overview.cashflowNet >= 0 ? "emerald" : "danger"} />
            </div>
          </div>
        </ReportHero>

        <form className="grid gap-3 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4 xl:grid-cols-[minmax(220px,1fr)_140px_190px_160px_auto_auto] xl:items-end">
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
          <button className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-[var(--accent)] px-4 text-sm font-black text-[#020617] hover:brightness-110">
            <Filter size={16} aria-hidden="true" />
            Filtrar
          </button>
          <Link
            href="/admin/relatorios"
            className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-[var(--border)] px-4 text-sm font-semibold text-[var(--foreground)] hover:bg-[var(--surface-strong)]"
          >
            <RotateCcw size={16} aria-hidden="true" />
            Limpar
          </Link>
        </form>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <ReportKpiCard label="Pedidos pagos" value={`${overview.paidOrders}`} detail="Com entrada confirmada" tone="emerald" />
          <ReportKpiCard label="Ticket medio" value={formatCurrency(overview.averageTicket)} detail="Receita / pedidos" tone="accent" />
          <ReportKpiCard label="Top vendedor" value={topSeller ? sellerLabel(topSeller.seller) : "-"} detail={topSeller ? formatCurrency(topSeller.amount) : "Sem vendas"} />
          <ReportKpiCard label="Top origem" value={topOrigin?.origin ?? "-"} detail={topOrigin ? formatCurrency(topOrigin.amount) : "Sem origem"} />
          <ReportKpiCard label="Top cliente" value={topCustomer?.name ?? "-"} detail={topCustomer ? `${formatCurrency(topCustomer.amount)} (${percent(topCustomerShare)})` : "Sem clientes"} tone="violet" />
          <ReportKpiCard label="Top produto" value={topProduct?.productName ?? "-"} detail={topProduct ? `${topProduct.quantity} un. - ${formatCurrency(topProduct.amount)}` : "Sem produtos"} tone="accent" />
          <ReportKpiCard label="Em analise" value={`${overview.underReviewOrders}`} detail="Checkout assistido" tone={overview.underReviewOrders > 0 ? "warning" : "muted"} />
          <ReportKpiCard label="Aguardando" value={`${overview.awaitingPaymentOrders}`} detail="Aprovados ou parciais" tone={overview.awaitingPaymentOrders > 0 ? "warning" : "muted"} />
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
