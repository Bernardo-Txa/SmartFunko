"use client";

import Link from "next/link";
import { Download, Filter, PackageSearch, Printer, RotateCcw, Users } from "lucide-react";
import { formatCurrency, formatDate, formatPhoneNumber } from "@/lib/format";
import {
  v2FulfillmentStatusLabels,
  v2PaymentStatusLabels,
  v2SourceLabels,
} from "@/lib/orders-v2-labels";
import type {
  OrderPdfCustomer,
  OrderPdfCustomerSection,
  OrderPdfProductSection,
  OrderPdfReport,
  OrderPdfReportOrder,
} from "@/server/reports/order-pdf-report-service";

type Props = {
  basePath: string;
  report: OrderPdfReport;
};

const reportMeta = {
  customer_map: {
    description: "Todos os pedidos aprovados da competencia, separados por cliente para conferencia e de/para.",
    empty: "Nenhum pedido aprovado encontrado nesta competencia.",
    eyebrow: "De/para mensal",
    primaryLabel: "Clientes",
    title: "Pedidos do mes por cliente",
  },
  supplier_request: {
    description: "Pedidos aguardando fechamento, com pagos primeiro e pendentes depois. Use para montar o pedido com fornecedores sem perder o que ainda pode entrar.",
    empty: "Nenhum pedido aguardando fechamento nesta competencia.",
    eyebrow: "Compra com fornecedores",
    primaryLabel: "Produtos",
    title: "A pedir: pagos e pendentes",
  },
} as const;

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function statusLabel(source: Record<string, string>, value: string) {
  return source[value] ?? value;
}

function customerBadge(customer: OrderPdfCustomer) {
  if (customer.kind === "temporary") {
    return "Temporario";
  }

  if (customer.kind === "unknown") {
    return "Sem cadastro";
  }

  return "Cliente";
}

function contactLine(customer: OrderPdfCustomer) {
  return [formatPhoneNumber(customer.phone) || customer.phone, customer.email].filter(Boolean).join(" - ") || "Sem contato";
}

function orderQuantity(order: OrderPdfReportOrder) {
  return order.items.reduce((sum, item) => sum + item.quantity, 0);
}

function isPaidStatus(status: string) {
  return status === "pago";
}

function printableHeader(report: OrderPdfReport) {
  const meta = reportMeta[report.kind];
  const period = report.competence
    ? `${formatDate(report.competence.starts_on)} a ${formatDate(report.competence.ends_on)}`
    : "-";

  return `
    <section class="header">
      <div>
        <span class="eyebrow">${escapeHtml(meta.eyebrow)}</span>
        <h1>${escapeHtml(meta.title)}</h1>
        <p>${escapeHtml(report.competence?.label ?? "Sem competencia")} - ${escapeHtml(period)}</p>
        <p>Gerado em ${escapeHtml(formatDate(report.generatedAt))}</p>
      </div>
      <div class="summary">
        <div><span>Pedidos</span><strong>${report.totals.orders}</strong></div>
        <div><span>Clientes</span><strong>${report.totals.customers}</strong></div>
        <div><span>Unidades</span><strong>${report.totals.quantity}</strong></div>
        <div><span>Total</span><strong>${escapeHtml(formatCurrency(report.totals.amount))}</strong></div>
      </div>
    </section>
  `;
}

function printableStyles() {
  return `
    <style>
      * { box-sizing: border-box; }
      @page { margin: 12mm; size: A4; }
      body { color: #111827; font: 12px Arial, sans-serif; margin: 0; padding: 0; }
      h1, h2, h3, p { margin: 0; }
      h1 { font-size: 24px; line-height: 1.1; margin-top: 6px; }
      h2 { font-size: 16px; margin-bottom: 4px; }
      h3 { font-size: 13px; }
      table { border-collapse: collapse; width: 100%; }
      th { background: #f3f4f6; color: #374151; font-size: 9px; letter-spacing: .08em; text-align: left; text-transform: uppercase; }
      th, td { border-bottom: 1px solid #e5e7eb; padding: 7px; vertical-align: top; }
      .header { align-items: flex-start; border-bottom: 2px solid #111827; display: flex; gap: 18px; justify-content: space-between; padding-bottom: 16px; }
      .eyebrow { color: #6b7280; display: block; font-size: 10px; font-weight: 800; letter-spacing: .14em; text-transform: uppercase; }
      .summary { display: grid; gap: 8px; grid-template-columns: repeat(2, 105px); }
      .summary div { border: 1px solid #d1d5db; border-radius: 6px; padding: 8px; }
      .summary span, .muted, .label { color: #6b7280; }
      .summary span, .label { display: block; font-size: 9px; font-weight: 800; letter-spacing: .1em; text-transform: uppercase; }
      .summary strong { display: block; font-size: 14px; margin-top: 3px; }
      .section { break-inside: avoid; margin-top: 18px; page-break-inside: avoid; }
      .section-head { align-items: flex-start; display: flex; gap: 16px; justify-content: space-between; margin-bottom: 8px; }
      .badge { border: 1px solid #d1d5db; border-radius: 999px; display: inline-block; font-size: 9px; font-weight: 800; margin-left: 6px; padding: 2px 6px; text-transform: uppercase; }
      .money { font-weight: 800; text-align: right; white-space: nowrap; }
      .number { text-align: right; white-space: nowrap; }
      .empty { color: #6b7280; padding: 24px 0; text-align: center; }
      .footer { border-top: 1px solid #d1d5db; color: #6b7280; font-size: 10px; margin-top: 18px; padding-top: 10px; }
    </style>
  `;
}

function renderCustomerOrderRows(section: OrderPdfCustomerSection) {
  return section.orders.flatMap((order) => {
    if (order.items.length === 0) {
      return [`
        <tr>
          <td>${escapeHtml(order.orderNumber)}</td>
          <td>${escapeHtml(formatDate(order.orderDate))}</td>
          <td>Pedido sem itens</td>
          <td class="number">0</td>
          <td>${escapeHtml(statusLabel(v2PaymentStatusLabels, order.paymentStatus))}</td>
          <td>${escapeHtml(statusLabel(v2FulfillmentStatusLabels, order.fulfillmentStatus))}</td>
          <td class="money">${escapeHtml(formatCurrency(order.total))}</td>
        </tr>
      `];
    }

    return order.items.map((item, index) => `
      <tr>
        <td>${index === 0 ? escapeHtml(order.orderNumber) : ""}</td>
        <td>${index === 0 ? escapeHtml(formatDate(order.orderDate)) : ""}</td>
        <td>${escapeHtml(item.productName)}${item.productSku ? `<br><span class="muted">SKU ${escapeHtml(item.productSku)}</span>` : ""}</td>
        <td class="number">${item.quantity}</td>
        <td>${index === 0 ? escapeHtml(statusLabel(v2PaymentStatusLabels, order.paymentStatus)) : ""}</td>
        <td>${index === 0 ? escapeHtml(statusLabel(v2FulfillmentStatusLabels, order.fulfillmentStatus)) : ""}</td>
        <td class="money">${escapeHtml(formatCurrency(item.total))}</td>
      </tr>
    `);
  }).join("");
}

function buildCustomerPrintableReport(report: OrderPdfReport) {
  const sections = report.customerSections.length === 0
    ? `<p class="empty">${escapeHtml(reportMeta.customer_map.empty)}</p>`
    : report.customerSections.map((section) => `
      <section class="section">
        <div class="section-head">
          <div>
            <h2>${escapeHtml(section.customer.name)}<span class="badge">${escapeHtml(customerBadge(section.customer))}</span></h2>
            <p class="muted">${escapeHtml(contactLine(section.customer))}</p>
          </div>
          <div class="money">${escapeHtml(formatCurrency(section.totals.amount))}<br><span class="muted">${section.totals.orders} pedido(s) - ${section.totals.quantity} un.</span></div>
        </div>
        <table>
          <thead>
            <tr>
              <th>Pedido</th>
              <th>Data</th>
              <th>Produto</th>
              <th>Qtd.</th>
              <th>Pagamento</th>
              <th>Operacao</th>
              <th>Valor</th>
            </tr>
          </thead>
          <tbody>${renderCustomerOrderRows(section)}</tbody>
        </table>
      </section>
    `).join("");

  return `
    <!doctype html>
    <html lang="pt-BR">
      <head>
        <meta charset="utf-8" />
        <title>${escapeHtml(reportMeta.customer_map.title)}</title>
        ${printableStyles()}
      </head>
      <body>
        ${printableHeader(report)}
        ${sections}
        <p class="footer">Relatorio operacional Smart Funkos para conferencia mensal e de/para de pedidos.</p>
        <script>window.print();</script>
      </body>
    </html>
  `;
}

function renderProductLines(section: OrderPdfProductSection) {
  return section.lines.map((line) => `
    <tr>
      <td>${escapeHtml(line.customer.name)}<br><span class="muted">${escapeHtml(contactLine(line.customer))}</span></td>
      <td>${escapeHtml(line.orderNumber)}</td>
      <td>${escapeHtml(formatDate(line.orderDate))}</td>
      <td>${escapeHtml(statusLabel(v2PaymentStatusLabels, line.paymentStatus))}</td>
      <td>${escapeHtml(statusLabel(v2SourceLabels, line.source))}</td>
      <td class="number">${line.quantity}</td>
      <td class="money">${escapeHtml(formatCurrency(line.unitPrice))}</td>
      <td class="money">${escapeHtml(formatCurrency(line.total))}</td>
    </tr>
  `).join("");
}

function buildSupplierPrintableReport(report: OrderPdfReport) {
  const sections = report.productSections.length === 0
    ? `<p class="empty">${escapeHtml(reportMeta.supplier_request.empty)}</p>`
    : report.productSections.map((section) => `
      <section class="section">
        <div class="section-head">
          <div>
            <h2>${escapeHtml(section.productName)}</h2>
            <p class="muted">${section.productSku ? `SKU ${escapeHtml(section.productSku)}` : "Sem SKU no pedido"}</p>
          </div>
          <div class="money">${section.quantity} un.<br><span class="muted">${section.customerCount} cliente(s) - ${escapeHtml(formatCurrency(section.amount))}</span></div>
        </div>
        <table>
          <thead>
            <tr>
              <th>Cliente</th>
              <th>Pedido</th>
              <th>Data</th>
              <th>Pagamento</th>
              <th>Origem</th>
              <th>Qtd.</th>
              <th>Unit.</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>${renderProductLines(section)}</tbody>
        </table>
      </section>
    `).join("");

  return `
    <!doctype html>
    <html lang="pt-BR">
      <head>
        <meta charset="utf-8" />
        <title>${escapeHtml(reportMeta.supplier_request.title)}</title>
        ${printableStyles()}
      </head>
      <body>
        ${printableHeader(report)}
        ${sections}
        <p class="footer">Pedidos pagos aparecem primeiro. Pedidos pendentes aparecem depois como apoio de conferencia. Depois de pedir ao fornecedor, atualize os pedidos pagos para solicitado.</p>
        <script>window.print();</script>
      </body>
    </html>
  `;
}

function printReport(report: OrderPdfReport) {
  const popup = window.open("", "_blank", "width=1100,height=760");

  if (!popup) {
    return;
  }

  popup.document.open();
  popup.document.write(report.kind === "supplier_request" ? buildSupplierPrintableReport(report) : buildCustomerPrintableReport(report));
  popup.document.close();
}

function StatCard({
  detail,
  label,
  value,
}: {
  detail: string;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4">
      <span className="text-xs font-black uppercase tracking-[0.12em] text-[var(--muted)]">{label}</span>
      <strong className="mt-2 block text-2xl text-[var(--foreground)]">{value}</strong>
      <span className="mt-1 block text-sm text-[var(--muted)]">{detail}</span>
    </div>
  );
}

function SmallStatus({ children }: { children: string }) {
  return (
    <span className="inline-flex rounded-full border border-[var(--border)] bg-[var(--background)] px-2 py-1 text-[10px] font-black uppercase tracking-wide text-[var(--muted)]">
      {children}
    </span>
  );
}

function CustomerSections({ sections }: { sections: OrderPdfCustomerSection[] }) {
  return (
    <section className="grid gap-4">
      {sections.map((section) => (
        <article key={`${section.customer.kind}:${section.customer.id}`} className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg font-black text-[var(--foreground)]">{section.customer.name}</h2>
                <SmallStatus>{customerBadge(section.customer)}</SmallStatus>
              </div>
              <p className="mt-1 text-sm text-[var(--muted)]">{contactLine(section.customer)}</p>
            </div>
            <div className="grid grid-cols-3 gap-2 text-right text-sm">
              <div>
                <span className="block text-[10px] font-black uppercase tracking-wide text-[var(--muted)]">Pedidos</span>
                <strong className="text-[var(--foreground)]">{section.totals.orders}</strong>
              </div>
              <div>
                <span className="block text-[10px] font-black uppercase tracking-wide text-[var(--muted)]">Un.</span>
                <strong className="text-[var(--foreground)]">{section.totals.quantity}</strong>
              </div>
              <div>
                <span className="block text-[10px] font-black uppercase tracking-wide text-[var(--muted)]">Total</span>
                <strong className="text-[var(--foreground)]">{formatCurrency(section.totals.amount)}</strong>
              </div>
            </div>
          </div>

          <div className="mt-4 overflow-x-auto">
            <table className="min-w-[860px] w-full text-left text-sm">
              <thead className="bg-[var(--surface-strong)] text-xs uppercase tracking-wide text-[var(--muted)]">
                <tr>
                  <th className="px-3 py-2">Pedido</th>
                  <th className="px-3 py-2">Data</th>
                  <th className="px-3 py-2">Produto</th>
                  <th className="px-3 py-2">Qtd.</th>
                  <th className="px-3 py-2">Fluxo</th>
                  <th className="px-3 py-2 text-right">Valor</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {section.orders.map((order) => (
                  <tr key={order.id}>
                    <td className="px-3 py-3 font-semibold text-[var(--foreground)]">{order.orderNumber}</td>
                    <td className="px-3 py-3 text-[var(--muted)]">{formatDate(order.orderDate)}</td>
                    <td className="px-3 py-3 text-[var(--muted)]">
                      <span className="line-clamp-2">{order.productSummary}</span>
                    </td>
                    <td className="px-3 py-3 text-[var(--foreground)]">{orderQuantity(order)}</td>
                    <td className="px-3 py-3">
                      <div className="flex flex-wrap gap-1">
                        <SmallStatus>{statusLabel(v2PaymentStatusLabels, order.paymentStatus)}</SmallStatus>
                        <SmallStatus>{statusLabel(v2FulfillmentStatusLabels, order.fulfillmentStatus)}</SmallStatus>
                      </div>
                    </td>
                    <td className="px-3 py-3 text-right font-black text-[var(--foreground)]">{formatCurrency(order.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>
      ))}
    </section>
  );
}

function ProductSections({ sections }: { sections: OrderPdfProductSection[] }) {
  return (
    <section className="grid gap-4">
      {sections.map((section) => {
        const paidQuantity = section.lines
          .filter((line) => isPaidStatus(line.paymentStatus))
          .reduce((sum, line) => sum + line.quantity, 0);
        const pendingQuantity = section.quantity - paidQuantity;

        return (
          <article key={section.key} className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div className="min-w-0">
                <h2 className="line-clamp-2 text-lg font-black text-[var(--foreground)]">{section.productName}</h2>
                <p className="mt-1 text-sm text-[var(--muted)]">{section.productSku ? `SKU ${section.productSku}` : "Sem SKU no pedido"}</p>
              </div>
              <div className="grid grid-cols-4 gap-2 text-right text-sm">
                <div>
                  <span className="block text-[10px] font-black uppercase tracking-wide text-[var(--muted)]">Pago</span>
                  <strong className="text-emerald-200">{paidQuantity}</strong>
                </div>
                <div>
                  <span className="block text-[10px] font-black uppercase tracking-wide text-[var(--muted)]">Pendente</span>
                  <strong className="text-yellow-100">{pendingQuantity}</strong>
                </div>
                <div>
                  <span className="block text-[10px] font-black uppercase tracking-wide text-[var(--muted)]">Clientes</span>
                  <strong className="text-[var(--foreground)]">{section.customerCount}</strong>
                </div>
                <div>
                  <span className="block text-[10px] font-black uppercase tracking-wide text-[var(--muted)]">Total</span>
                  <strong className="text-[var(--foreground)]">{formatCurrency(section.amount)}</strong>
                </div>
              </div>
            </div>

            <div className="mt-4 overflow-x-auto">
              <table className="min-w-[940px] w-full text-left text-sm">
                <thead className="bg-[var(--surface-strong)] text-xs uppercase tracking-wide text-[var(--muted)]">
                  <tr>
                    <th className="px-3 py-2">Cliente</th>
                    <th className="px-3 py-2">Pedido</th>
                    <th className="px-3 py-2">Data</th>
                    <th className="px-3 py-2">Pagamento</th>
                    <th className="px-3 py-2">Origem</th>
                    <th className="px-3 py-2">Qtd.</th>
                    <th className="px-3 py-2 text-right">Valor</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {section.lines.map((line) => (
                    <tr key={`${line.orderId}:${line.customer.id}:${line.paymentStatus}`}>
                      <td className="px-3 py-3">
                        <strong className="block text-[var(--foreground)]">{line.customer.name}</strong>
                        <span className="text-xs text-[var(--muted)]">{contactLine(line.customer)}</span>
                      </td>
                      <td className="px-3 py-3 font-semibold text-[var(--foreground)]">{line.orderNumber}</td>
                      <td className="px-3 py-3 text-[var(--muted)]">{formatDate(line.orderDate)}</td>
                      <td className="px-3 py-3">
                        <span className={[
                          "inline-flex rounded-full border px-2 py-1 text-[10px] font-black uppercase tracking-wide",
                          isPaidStatus(line.paymentStatus)
                            ? "border-emerald-300/40 bg-emerald-300/10 text-emerald-100"
                            : "border-yellow-300/40 bg-yellow-300/10 text-yellow-100",
                        ].join(" ")}
                        >
                          {statusLabel(v2PaymentStatusLabels, line.paymentStatus)}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-[var(--muted)]">{statusLabel(v2SourceLabels, line.source)}</td>
                      <td className="px-3 py-3 text-[var(--foreground)]">{line.quantity}</td>
                      <td className="px-3 py-3 text-right font-black text-[var(--foreground)]">{formatCurrency(line.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </article>
        );
      })}
    </section>
  );
}

export function OrderPdfReportPanel({ basePath, report }: Props) {
  const meta = reportMeta[report.kind];
  const primaryCount = report.kind === "supplier_request" ? report.totals.products : report.totals.customers;
  const supplierPaidQuantity = report.productSections.reduce((sum, section) => {
    return sum + section.lines
      .filter((line) => isPaidStatus(line.paymentStatus))
      .reduce((lineSum, line) => lineSum + line.quantity, 0);
  }, 0);
  const supplierPendingQuantity = report.kind === "supplier_request" ? report.totals.quantity - supplierPaidQuantity : 0;

  return (
    <div className="grid gap-5">
      <section className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5">
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px] xl:items-end">
          <div>
            <span className="text-xs font-black uppercase tracking-[0.14em] text-[var(--yellow)]">{meta.eyebrow}</span>
            <h2 className="mt-2 text-2xl font-black text-[var(--foreground)]">{report.competence?.label ?? "Sem competencia"}</h2>
            <p className="mt-1 text-sm text-[var(--muted)]">
              {report.competence ? `${formatDate(report.competence.starts_on)} a ${formatDate(report.competence.ends_on)}` : "Cadastre uma competencia para gerar o relatorio."}
            </p>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-[var(--muted)]">{meta.description}</p>
          </div>

          <div className="grid gap-3">
            <form className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto_auto]">
              <label className="block">
                <span className="text-sm font-semibold text-[var(--foreground)]">Competencia</span>
                <select
                  name="competenceId"
                  defaultValue={report.competence?.id ?? ""}
                  className="mt-2 h-10 w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 text-sm text-[var(--foreground)] outline-none focus:border-[var(--accent)]"
                >
                  {report.competencies.map((competence) => (
                    <option key={competence.id} value={competence.id}>
                      {competence.label}
                    </option>
                  ))}
                </select>
              </label>
              <button className="inline-flex h-10 items-center justify-center gap-2 self-end rounded-md bg-[var(--accent)] px-4 text-sm font-black text-slate-950 hover:brightness-110">
                <Filter size={16} aria-hidden="true" />
                Filtrar
              </button>
              <Link
                href={basePath}
                className="inline-flex h-10 items-center justify-center gap-2 self-end rounded-md border border-[var(--border)] px-3 text-sm font-semibold text-[var(--foreground)] hover:bg-[var(--surface-strong)]"
              >
                <RotateCcw size={16} aria-hidden="true" />
                Limpar
              </Link>
            </form>

            <button
              type="button"
              onClick={() => printReport(report)}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-[var(--yellow)] px-4 text-sm font-black text-slate-950 hover:brightness-110"
            >
              <Printer size={17} aria-hidden="true" />
              Imprimir / PDF
            </button>
          </div>
        </div>
      </section>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
        <StatCard label={meta.primaryLabel} value={`${primaryCount}`} detail={report.kind === "supplier_request" ? "Produtos diferentes" : "Clientes no relatorio"} />
        <StatCard label="Pedidos" value={`${report.totals.orders}`} detail="No filtro atual" />
        <StatCard label="Unidades" value={`${report.totals.quantity}`} detail="Somando os itens" />
        <StatCard label="Valor" value={formatCurrency(report.totals.amount)} detail="Total dos pedidos" />
        {report.kind === "supplier_request" ? (
          <>
            <StatCard label="Pagos" value={`${supplierPaidQuantity}`} detail="A pedir agora" />
            <StatCard label="Pendentes" value={`${supplierPendingQuantity}`} detail="Depois dos pagos" />
          </>
        ) : (
          <StatCard label="Arquivo" value="PDF" detail="Gerado pelo imprimir" />
        )}
      </div>

      {report.kind === "supplier_request" ? (
        report.productSections.length > 0 ? (
          <ProductSections sections={report.productSections} />
        ) : (
          <section className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5 text-sm text-[var(--muted)]">
            <div className="flex items-center gap-2">
              <PackageSearch size={18} aria-hidden="true" />
              {meta.empty}
            </div>
          </section>
        )
      ) : report.customerSections.length > 0 ? (
        <CustomerSections sections={report.customerSections} />
      ) : (
        <section className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5 text-sm text-[var(--muted)]">
          <div className="flex items-center gap-2">
            <Users size={18} aria-hidden="true" />
            {meta.empty}
          </div>
        </section>
      )}

      <section className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4 text-sm text-[var(--muted)]">
        <div className="flex items-start gap-3">
          <Download size={18} className="mt-0.5 shrink-0 text-[var(--accent)]" aria-hidden="true" />
          <p>
            O botao abre uma pagina limpa para impressao. No navegador, escolha salvar como PDF para gerar o arquivo final.
          </p>
        </div>
      </section>
    </div>
  );
}
