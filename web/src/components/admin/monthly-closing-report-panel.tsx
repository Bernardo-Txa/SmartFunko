"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Copy, CreditCard, ExternalLink, FileText, MessageCircle, Printer } from "lucide-react";
import { formatCurrency, formatDate, formatPhoneNumber } from "@/lib/format";
import type {
  MonthlyClosingCustomer,
  MonthlyClosingOrder,
  MonthlyClosingReport,
} from "@/server/reports/monthly-closing-report-service";

type ApiResponse<T = unknown> = {
  data?: {
    payment_link_url?: string | null;
  } & T;
  error?: {
    message?: string;
  };
};

function normalizeWhatsAppPhone(value: string | null | undefined) {
  const digits = (value ?? "").replace(/\D/g, "");

  if (digits.length === 10 || digits.length === 11) {
    return `55${digits}`;
  }

  return digits;
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatOrderDetails(orders: MonthlyClosingOrder[], statusLabel: string) {
  if (orders.length === 0) {
    return [`Nenhum pedido ${statusLabel.toLowerCase()}.`];
  }

  return orders.flatMap((order) => {
    if (order.items.length === 0) {
      return [`- ${order.productSummary} - ${formatCurrency(order.total)}`];
    }

    return order.items.map((item) => `- ${item.quantity}x ${item.productName} - ${formatCurrency(item.total)}`);
  });
}

function buildClosingMessage(
  report: MonthlyClosingReport,
  customer: MonthlyClosingCustomer,
  paymentUrl: string | null,
) {
  const competenceLabel = report.competence?.label ?? "competencia atual";
  const lines = [
    `Oi, ${customer.customer.name}! Segue o fechamento Smart Funkos de ${competenceLabel}.`,
    `Total da nota: ${formatCurrency(customer.noteTotal)}`,
    `Ja pago: ${formatCurrency(customer.paidTotal)}`,
    `Pendente: ${formatCurrency(customer.pendingTotal)}`,
    "",
    "Pedidos pendentes:",
    ...formatOrderDetails(customer.pendingOrders, "Pendente"),
    "",
    "Pedidos pagos:",
    ...formatOrderDetails(customer.paidOrders, "Pago"),
    "",
    paymentUrl ? `Link para pagamento/acompanhamento: ${paymentUrl}` : "Pagamento combinado pelo WhatsApp.",
    "Frete e envio combinados separadamente.",
  ].filter((line): line is string => line !== null);

  return lines.join("\n");
}

function buildWhatsAppUrl(phone: string | null, message: string) {
  const digits = normalizeWhatsAppPhone(phone);

  if (!digits) {
    return null;
  }

  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}

function getReusablePaymentUrl(customer: MonthlyClosingCustomer) {
  const urls = Array.from(new Set(customer.pendingOrders.map((order) => order.paymentLinkUrl).filter(Boolean)));

  return urls.length === 1 ? urls[0] : null;
}

function renderOrderRows(orders: MonthlyClosingOrder[], status: "Pago" | "Pendente") {
  if (orders.length === 0) {
    return `
      <tr>
        <td colspan="5" class="empty">Nenhum pedido ${status === "Pago" ? "pago" : "pendente"}.</td>
      </tr>
    `;
  }

  return orders.map((order) => `
    <tr>
      <td>${escapeHtml(order.orderNumber)}</td>
      <td>${escapeHtml(formatDate(order.orderDate))}</td>
      <td>${escapeHtml(order.productSummary)}</td>
      <td>${status}</td>
      <td class="money">${escapeHtml(formatCurrency(order.total))}</td>
    </tr>
  `).join("");
}

function buildPrintableNote(report: MonthlyClosingReport, customer: MonthlyClosingCustomer) {
  const competence = report.competence;
  const period = competence ? `${formatDate(competence.starts_on)} a ${formatDate(competence.ends_on)}` : "-";

  return `
    <!doctype html>
    <html lang="pt-BR">
      <head>
        <meta charset="utf-8" />
        <title>Nota Smart Funkos - ${escapeHtml(customer.customer.name)}</title>
        <style>
          * { box-sizing: border-box; }
          body { color: #111827; font: 14px Arial, sans-serif; margin: 0; padding: 32px; }
          h1 { font-size: 24px; margin: 0 0 8px; }
          h2 { font-size: 16px; margin: 28px 0 10px; }
          p { margin: 4px 0; }
          .header { border-bottom: 2px solid #111827; display: flex; justify-content: space-between; gap: 24px; padding-bottom: 18px; }
          .muted { color: #6b7280; }
          .cards { display: grid; gap: 12px; grid-template-columns: repeat(3, 1fr); margin: 22px 0; }
          .card { border: 1px solid #d1d5db; border-radius: 8px; padding: 12px; }
          .label { color: #6b7280; display: block; font-size: 11px; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; }
          .value { display: block; font-size: 18px; font-weight: 800; margin-top: 8px; }
          table { border-collapse: collapse; width: 100%; }
          th { background: #f3f4f6; color: #374151; font-size: 11px; letter-spacing: .08em; text-align: left; text-transform: uppercase; }
          th, td { border-bottom: 1px solid #e5e7eb; padding: 10px; vertical-align: top; }
          .money { font-weight: 800; text-align: right; white-space: nowrap; }
          .empty { color: #6b7280; text-align: center; }
          .footer { border-top: 1px solid #d1d5db; color: #6b7280; font-size: 12px; margin-top: 28px; padding-top: 12px; }
          @media print { body { padding: 0; } button { display: none; } }
        </style>
      </head>
      <body>
        <section class="header">
          <div>
            <h1>Fechamento Smart Funkos</h1>
            <p class="muted">${escapeHtml(competence?.label ?? "Competencia")}: ${escapeHtml(period)}</p>
            <p class="muted">Gerado em ${escapeHtml(formatDate(report.generatedAt))}</p>
          </div>
          <div>
            <p><strong>${escapeHtml(customer.customer.name)}</strong></p>
            <p class="muted">${escapeHtml(customer.customer.email ?? "-")}</p>
            <p class="muted">${escapeHtml(formatPhoneNumber(customer.customer.phone) || "-")}</p>
          </div>
        </section>

        <section class="cards">
          <div class="card"><span class="label">Total da nota</span><span class="value">${escapeHtml(formatCurrency(customer.noteTotal))}</span></div>
          <div class="card"><span class="label">Ja pago</span><span class="value">${escapeHtml(formatCurrency(customer.paidTotal))}</span></div>
          <div class="card"><span class="label">Pendente</span><span class="value">${escapeHtml(formatCurrency(customer.pendingTotal))}</span></div>
        </section>

        <h2>Pedidos pendentes</h2>
        <table>
          <thead><tr><th>Pedido</th><th>Data</th><th>Produto</th><th>Status</th><th>Valor</th></tr></thead>
          <tbody>${renderOrderRows(customer.pendingOrders, "Pendente")}</tbody>
        </table>

        <h2>Pedidos pagos</h2>
        <table>
          <thead><tr><th>Pedido</th><th>Data</th><th>Produto</th><th>Status</th><th>Valor</th></tr></thead>
          <tbody>${renderOrderRows(customer.paidOrders, "Pago")}</tbody>
        </table>

        <p class="footer">Nota operacional para conferencia do fechamento mensal. Frete/envio tratados separadamente.</p>
        <script>window.print();</script>
      </body>
    </html>
  `;
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

function MiniOrderList({
  empty,
  orders,
  title,
}: {
  empty: string;
  orders: MonthlyClosingOrder[];
  title: string;
}) {
  return (
    <div className="rounded-lg border border-[var(--border)] bg-[var(--background)] p-3">
      <div className="mb-2 flex items-center justify-between gap-3">
        <h4 className="text-sm font-black text-[var(--foreground)]">{title}</h4>
        <span className="text-xs font-semibold text-[var(--muted)]">{orders.length} pedido(s)</span>
      </div>
      {orders.length === 0 ? (
        <p className="text-sm text-[var(--muted)]">{empty}</p>
      ) : (
        <ul className="grid gap-2">
          {orders.slice(0, 5).map((order) => (
            <li key={order.id} className="flex gap-3 text-sm">
              <span className="min-w-0 flex-1">
                <strong className="block text-[var(--foreground)]">{order.orderNumber}</strong>
                <span className="line-clamp-2 text-[var(--muted)]">{order.productSummary}</span>
              </span>
              <strong className="shrink-0 text-[var(--foreground)]">{formatCurrency(order.total)}</strong>
            </li>
          ))}
          {orders.length > 5 ? (
            <li className="text-xs font-semibold text-[var(--muted)]">+{orders.length - 5} pedido(s) na nota completa</li>
          ) : null}
        </ul>
      )}
    </div>
  );
}

export function MonthlyClosingReportPanel({ report }: { report: MonthlyClosingReport }) {
  const router = useRouter();
  const [copiedCustomerId, setCopiedCustomerId] = useState<string | null>(null);
  const [errorByCustomer, setErrorByCustomer] = useState<Record<string, string>>({});
  const [generatedLinks, setGeneratedLinks] = useState<Record<string, string>>({});
  const [runningAction, setRunningAction] = useState<string | null>(null);
  const [settledCustomerId, setSettledCustomerId] = useState<string | null>(null);
  const customersWithPending = useMemo(
    () => report.customers.filter((customer) => customer.pendingTotal > 0).length,
    [report.customers],
  );

  function getPaymentUrl(customer: MonthlyClosingCustomer) {
    return generatedLinks[customer.customer.key] ?? getReusablePaymentUrl(customer) ?? customer.siteAccountUrl;
  }

  async function generatePaymentLink(customer: MonthlyClosingCustomer) {
    if (customer.customer.kind !== "customer" || customer.orderIdsPending.length === 0) {
      return;
    }

    setRunningAction(`${customer.customer.key}:link`);
    setErrorByCustomer((current) => ({ ...current, [customer.customer.key]: "" }));

    try {
      const response = await fetch("/api/v1/admin/orders-v2/payment-sessions", {
        body: JSON.stringify({
          customerId: customer.customer.id,
          orderIds: customer.orderIdsPending,
        }),
        headers: { "content-type": "application/json" },
        method: "POST",
      });
      const payload = (await response.json()) as ApiResponse;

      if (!response.ok) {
        throw new Error(payload.error?.message ?? "Falha ao gerar link InfinitePay");
      }

      const link = payload.data?.payment_link_url;

      if (!link) {
        throw new Error("Checkout criado sem link InfinitePay");
      }

      setGeneratedLinks((current) => ({ ...current, [customer.customer.key]: link }));
    } catch (requestError) {
      setErrorByCustomer((current) => ({
        ...current,
        [customer.customer.key]: requestError instanceof Error ? requestError.message : "Falha ao gerar link",
      }));
    } finally {
      setRunningAction(null);
    }
  }

  async function markPendingOrdersPaid(customer: MonthlyClosingCustomer) {
    if (customer.orderIdsPending.length === 0) {
      return;
    }

    const confirmed = window.confirm(`Dar baixa em ${customer.orderIdsPending.length} pedido(s) pendente(s) de ${customer.customer.name}?`);

    if (!confirmed) {
      return;
    }

    setRunningAction(`${customer.customer.key}:paid`);
    setSettledCustomerId(null);
    setErrorByCustomer((current) => ({ ...current, [customer.customer.key]: "" }));

    try {
      const response = await fetch("/api/v1/admin/orders-v2/bulk", {
        body: JSON.stringify({
          action: "mark_paid",
          notes: `Baixa em lote pelo fechamento mensal - ${customer.customer.name}`,
          orderIds: customer.orderIdsPending,
        }),
        headers: { "content-type": "application/json" },
        method: "POST",
      });
      const payload = (await response.json()) as ApiResponse;

      if (!response.ok) {
        throw new Error(payload.error?.message ?? "Falha ao dar baixa nos pedidos");
      }

      setSettledCustomerId(customer.customer.key);
      router.refresh();
    } catch (requestError) {
      setErrorByCustomer((current) => ({
        ...current,
        [customer.customer.key]: requestError instanceof Error ? requestError.message : "Falha ao dar baixa",
      }));
    } finally {
      setRunningAction(null);
    }
  }

  async function copyMessage(customer: MonthlyClosingCustomer) {
    const message = buildClosingMessage(report, customer, getPaymentUrl(customer));
    await navigator.clipboard.writeText(message);
    setCopiedCustomerId(customer.customer.key);
  }

  function printCustomerNote(customer: MonthlyClosingCustomer) {
    const popup = window.open("", "_blank", "width=960,height=720");

    if (!popup) {
      return;
    }

    popup.document.open();
    popup.document.write(buildPrintableNote(report, customer));
    popup.document.close();
  }

  return (
    <div className="grid gap-5">
      <section className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5">
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px] xl:items-end">
          <div>
            <span className="text-xs font-black uppercase tracking-[0.14em] text-[var(--yellow)]">Fechamento mensal</span>
            <h2 className="mt-2 text-2xl font-black text-[var(--foreground)]">
              {report.competence?.label ?? "Sem competencia aberta"}
            </h2>
            <p className="mt-1 text-sm text-[var(--muted)]">
              {report.competence ? `${formatDate(report.competence.starts_on)} a ${formatDate(report.competence.ends_on)}` : "Cadastre uma competencia para gerar notas."}
            </p>
          </div>
          <form className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
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
            <button className="inline-flex h-10 items-center justify-center self-end rounded-md bg-[var(--accent)] px-4 text-sm font-black text-slate-950 hover:brightness-110">
              Ver fechamento
            </button>
          </form>
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <StatCard label="Clientes" value={`${report.totals.customers}`} detail="Com pedidos no fechamento" />
        <StatCard label="A cobrar" value={`${customersWithPending}`} detail="Clientes com saldo pendente" />
        <StatCard label="Total da nota" value={formatCurrency(report.totals.noteTotal)} detail="Pago + pendente" />
        <StatCard label="Ja pago" value={formatCurrency(report.totals.paidTotal)} detail={`${report.totals.paidOrders} pedido(s)`} />
        <StatCard label="Pendente" value={formatCurrency(report.totals.pendingTotal)} detail={`${report.totals.pendingOrders} pedido(s)`} />
      </div>

      {report.customers.length === 0 ? (
        <section className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5">
          <p className="text-sm text-[var(--muted)]">Nenhum pedido aprovado nesta competencia.</p>
        </section>
      ) : (
        <section className="grid gap-4">
          {report.customers.map((customer) => {
            const paymentUrl = getPaymentUrl(customer);
            const message = buildClosingMessage(report, customer, paymentUrl);
            const whatsappUrl = buildWhatsAppUrl(customer.customer.phone, message);
            const isLinkRunning = runningAction === `${customer.customer.key}:link`;
            const isPaidRunning = runningAction === `${customer.customer.key}:paid`;
            const error = errorByCustomer[customer.customer.key];

            return (
              <article
                key={customer.customer.key}
                className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4"
              >
                <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_260px]">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-lg font-black text-[var(--foreground)]">{customer.customer.name}</h3>
                          {customer.customer.kind === "temporary" ? (
                            <span className="rounded-full border border-yellow-300/40 px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.08em] text-yellow-100">
                              Temporario
                            </span>
                          ) : null}
                        </div>
                        <p className="text-sm text-[var(--muted)]">
                          {formatPhoneNumber(customer.customer.phone) || "Sem telefone"} {customer.customer.email ? `- ${customer.customer.email}` : ""}
                        </p>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-right">
                        <div>
                          <span className="block text-[10px] font-black uppercase tracking-[0.12em] text-[var(--muted)]">Nota</span>
                          <strong className="text-sm text-[var(--foreground)]">{formatCurrency(customer.noteTotal)}</strong>
                        </div>
                        <div>
                          <span className="block text-[10px] font-black uppercase tracking-[0.12em] text-emerald-300">Pago</span>
                          <strong className="text-sm text-[var(--foreground)]">{formatCurrency(customer.paidTotal)}</strong>
                        </div>
                        <div>
                          <span className="block text-[10px] font-black uppercase tracking-[0.12em] text-[var(--yellow)]">Pendente</span>
                          <strong className="text-sm text-[var(--foreground)]">{formatCurrency(customer.pendingTotal)}</strong>
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 grid gap-3 lg:grid-cols-2">
                      <MiniOrderList empty="Sem pedidos pendentes." orders={customer.pendingOrders} title="Pendentes" />
                      <MiniOrderList empty="Sem pedidos pagos." orders={customer.paidOrders} title="Pagos" />
                    </div>

                    {error ? <p className="mt-3 text-sm font-semibold text-red-300">{error}</p> : null}
                  </div>

                  <div className="grid content-start gap-2 rounded-lg border border-[var(--border)] bg-[var(--background)] p-3">
                    <span className="text-xs font-black uppercase tracking-[0.12em] text-[var(--muted)]">Cobranca</span>
                    {customer.pendingTotal > 0 && customer.customer.kind === "customer" ? (
                      <button
                        type="button"
                        disabled={Boolean(runningAction)}
                        onClick={() => generatePaymentLink(customer)}
                        className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-[var(--yellow)] px-3 text-sm font-black text-slate-950 hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        <CreditCard size={16} aria-hidden="true" />
                        {isLinkRunning ? "Gerando..." : generatedLinks[customer.customer.key] ? "Link gerado" : "Gerar link"}
                      </button>
                    ) : null}
                    {customer.pendingTotal > 0 ? (
                      <button
                        type="button"
                        disabled={Boolean(runningAction)}
                        onClick={() => markPendingOrdersPaid(customer)}
                        className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-emerald-400/40 px-3 text-sm font-semibold text-emerald-200 hover:bg-emerald-400/10 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        <CheckCircle2 size={16} aria-hidden="true" />
                        {isPaidRunning
                          ? "Baixando..."
                          : settledCustomerId === customer.customer.key
                            ? "Baixa feita"
                            : "Dar baixa pendentes"}
                      </button>
                    ) : null}
                    <button
                      type="button"
                      onClick={() => copyMessage(customer)}
                      className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-[var(--border)] px-3 text-sm font-semibold text-[var(--foreground)] hover:bg-[var(--surface-strong)]"
                    >
                      <Copy size={16} aria-hidden="true" />
                      {copiedCustomerId === customer.customer.key ? "Copiado" : "Copiar mensagem"}
                    </button>
                    {whatsappUrl ? (
                      <a
                        href={whatsappUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-emerald-400/40 px-3 text-sm font-semibold text-emerald-200 hover:bg-emerald-400/10"
                      >
                        <MessageCircle size={16} aria-hidden="true" />
                        Abrir WhatsApp
                      </a>
                    ) : (
                      <button
                        type="button"
                        disabled
                        className="inline-flex h-10 cursor-not-allowed items-center justify-center gap-2 rounded-md border border-[var(--border)] px-3 text-sm font-semibold text-[var(--muted)] opacity-60"
                      >
                        <MessageCircle size={16} aria-hidden="true" />
                        Sem WhatsApp
                      </button>
                    )}
                    {paymentUrl ? (
                      <a
                        href={paymentUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-[var(--border)] px-3 text-sm font-semibold text-[var(--foreground)] hover:bg-[var(--surface-strong)]"
                      >
                        <ExternalLink size={16} aria-hidden="true" />
                        Abrir link
                      </a>
                    ) : null}
                    <button
                      type="button"
                      onClick={() => printCustomerNote(customer)}
                      className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-[var(--border)] px-3 text-sm font-semibold text-[var(--foreground)] hover:bg-[var(--surface-strong)]"
                    >
                      <Printer size={16} aria-hidden="true" />
                      Imprimir / PDF
                    </button>
                    {paymentUrl ? (
                      <div className="mt-1 flex items-start gap-2 rounded-md border border-[var(--border)] bg-[var(--surface)] p-2 text-xs text-[var(--muted)]">
                        <FileText size={14} className="mt-0.5 shrink-0" aria-hidden="true" />
                        <span className="break-all">{paymentUrl}</span>
                      </div>
                    ) : (
                      <div className="mt-1 flex items-start gap-2 rounded-md border border-[var(--border)] bg-[var(--surface)] p-2 text-xs text-[var(--muted)]">
                        <FileText size={14} className="mt-0.5 shrink-0" aria-hidden="true" />
                        <span>Sem link de pagamento para cliente temporario.</span>
                      </div>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </section>
      )}
    </div>
  );
}
