import type { Metadata } from "next";
import Link from "next/link";
import {
  AlertTriangle,
  Banknote,
  CheckCircle2,
  Clock3,
  CreditCard,
  ExternalLink,
  PackageCheck,
  PackageOpen,
  RefreshCcw,
  Send,
  ShoppingCart,
  TrendingUp,
  Users,
} from "lucide-react";
import { AdminShell } from "@/components/admin/admin-shell";
import { formatCurrency, formatDate } from "@/lib/format";
import {
  getV2StatusBadgeClassName,
  v2ApprovalStatusLabels,
  v2FulfillmentStatusLabels,
  v2PaymentStatusLabels,
  v2SourceLabels,
} from "@/lib/orders-v2-labels";
import { requireAdminPage } from "@/server/auth/require-admin-page";
import {
  DashboardService,
  firstRelation,
  type DashboardV2Order,
  type DashboardV2PaymentSession,
} from "@/server/dashboard/dashboard-service";

export const metadata: Metadata = {
  title: "Dashboard admin",
};

type DashboardIcon = typeof ShoppingCart;

type OrdersHrefParams = {
  approvalStatus?: string;
  competenceId?: string;
  fulfillmentStatus?: string;
  paymentStatus?: string;
  view?: string;
};

function ordersHref(params: OrdersHrefParams = {}) {
  const search = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value) {
      search.set(key, value);
    }
  }

  const query = search.toString();
  return query ? `/admin/v2/pedidos?${query}` : "/admin/v2/pedidos";
}

function shortDate(value: string) {
  return formatDate(value).slice(0, 5);
}

function productSummary(order: DashboardV2Order) {
  return (order.v2_order_items ?? [])
    .map((item) => `${item.quantity}x ${item.product_name}`)
    .join(", ");
}

function attentionInfo(order: DashboardV2Order, competenceId?: string) {
  if (order.approval_status === "aguardando_aprovacao") {
    return {
      detail: "Pedido do site precisa de liberacao",
      href: ordersHref({ competenceId, view: "approval" }),
      label: "Aprovar pedido",
    };
  }

  if (order.payment_status === "reembolso_pendente") {
    return {
      detail: "Reembolso manual precisa ser concluido",
      href: ordersHref({ competenceId, view: "refund" }),
      label: "Reembolso pendente",
    };
  }

  if (order.payment_status === "checkout_gerado") {
    return {
      detail: "Cliente ainda nao confirmou o pagamento",
      href: ordersHref({ competenceId, paymentStatus: "checkout_gerado", view: "receivable" }),
      label: "Checkout pendente",
    };
  }

  if (order.payment_status === "pago" && order.fulfillment_status === "aguardando_fechamento") {
    return {
      detail: "Pago e aguardando atualizacao no fechamento",
      href: ordersHref({ competenceId, view: "closing" }),
      label: "Atualizar fechamento",
    };
  }

  if (order.payment_status === "pago" && order.fulfillment_status === "recebido") {
    return {
      detail: "Recebido e aguardando envio/rastreio",
      href: ordersHref({ competenceId, view: "received" }),
      label: "Preparar envio",
    };
  }

  return {
    detail: "Pedido precisa de revisao",
    href: ordersHref({ competenceId }),
    label: "Revisar pedido",
  };
}

function DashboardMetricCard({
  detail,
  href,
  icon: Icon,
  label,
  value,
}: {
  detail: string;
  href?: string;
  icon: DashboardIcon;
  label: string;
  value: string;
}) {
  const content = (
    <>
      <div className="flex min-w-0 items-start justify-between gap-3">
        <span className="text-sm font-semibold text-[var(--muted)]">{label}</span>
        <Icon size={18} className="text-[var(--accent)]" aria-hidden="true" />
      </div>
      <strong className="mt-3 block whitespace-nowrap text-[clamp(1.35rem,2vw,1.75rem)] leading-tight text-[var(--foreground)]">
        {value}
      </strong>
      <span className="mt-1 block text-sm text-[var(--muted)]">{detail}</span>
    </>
  );

  if (href) {
    return (
      <Link
        href={href}
        className="min-w-0 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5 transition hover:border-[var(--accent)] hover:bg-[var(--surface-strong)]"
      >
        {content}
      </Link>
    );
  }

  return (
    <div className="min-w-0 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5">
      {content}
    </div>
  );
}

function ActionCard({
  detail,
  href,
  icon: Icon,
  label,
  value,
}: {
  detail: string;
  href: string;
  icon: DashboardIcon;
  label: string;
  value: string;
}) {
  return (
    <Link
      href={href}
      className="group rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4 transition hover:border-[var(--accent)] hover:bg-[var(--surface-strong)]"
    >
      <div className="flex items-center justify-between gap-3">
        <span className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-[var(--border)] text-[var(--foreground)]">
          <Icon size={17} aria-hidden="true" />
        </span>
        <ExternalLink size={15} className="text-[var(--muted)] group-hover:text-[var(--accent)]" aria-hidden="true" />
      </div>
      <strong className="mt-4 block text-2xl text-[var(--foreground)]">{value}</strong>
      <span className="mt-1 block text-sm font-semibold text-[var(--foreground)]">{label}</span>
      <span className="mt-1 block text-xs text-[var(--muted)]">{detail}</span>
    </Link>
  );
}

function StatusPills({ order }: { order: DashboardV2Order }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      <span className={getV2StatusBadgeClassName(order.approval_status)}>
        {v2ApprovalStatusLabels[order.approval_status] ?? order.approval_status}
      </span>
      <span className={getV2StatusBadgeClassName(order.payment_status)}>
        {v2PaymentStatusLabels[order.payment_status] ?? order.payment_status}
      </span>
      <span className={getV2StatusBadgeClassName(order.fulfillment_status)}>
        {v2FulfillmentStatusLabels[order.fulfillment_status] ?? order.fulfillment_status}
      </span>
    </div>
  );
}

function LatestOrderRow({ order }: { order: DashboardV2Order }) {
  const customer = firstRelation(order.customers);

  return (
    <Link
      href={`/admin/v2/pedidos/${order.id}`}
      className="grid gap-3 py-3 md:grid-cols-[minmax(0,1fr)_120px] md:items-center"
    >
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <strong className="text-sm text-[var(--foreground)]">{order.order_number}</strong>
          <StatusPills order={order} />
        </div>
        <p className="mt-1 truncate text-sm text-[var(--muted)]">
          {customer?.name ?? "Cliente"} · {v2SourceLabels[order.source] ?? order.source} · {productSummary(order) || "Produto"}
        </p>
      </div>
      <strong className="text-sm text-[var(--foreground)] md:text-right">{formatCurrency(Number(order.total))}</strong>
    </Link>
  );
}

function PaymentRow({ payment }: { payment: DashboardV2PaymentSession }) {
  const customer = firstRelation(payment.customers);
  const competence = firstRelation(payment.v2_order_competencies);

  return (
    <div className="grid gap-2 py-3 md:grid-cols-[minmax(0,1fr)_120px] md:items-center">
      <div>
        <strong className="text-sm text-[var(--foreground)]">{payment.checkout_number}</strong>
        <p className="mt-1 text-sm text-[var(--muted)]">
          {customer?.name ?? "Cliente"} · {competence?.label ?? "Competencia"} · {payment.paid_at ? formatDate(payment.paid_at) : "-"}
        </p>
      </div>
      <strong className="text-sm text-emerald-300 md:text-right">{formatCurrency(Number(payment.amount))}</strong>
    </div>
  );
}

export default async function AdminDashboardPage() {
  await requireAdminPage();
  const dashboard = await new DashboardService().getAdminDashboard();
  const competenceId = dashboard.currentCompetence?.id;
  const competenceAmount = dashboard.currentCompetence?.currentAmount ?? 0;
  const competencePaidPercent = competenceAmount > 0
    ? Math.round(((dashboard.currentCompetence?.paidAmount ?? 0) / competenceAmount) * 100)
    : 0;
  const trendMax = Math.max(
    1,
    ...dashboard.dailyTrend.map((day) => Math.max(day.sold, day.received)),
  );

  return (
    <AdminShell
      title="Dashboard"
      description="Painel operacional dos pedidos V2, pagamentos e fechamento mensal."
    >
      <div className="grid gap-6">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <DashboardMetricCard
            label="Pedidos hoje"
            value={`${dashboard.metrics.ordersToday}`}
            detail={`Data comercial ${formatDate(dashboard.today)}`}
            icon={ShoppingCart}
            href={ordersHref({ competenceId })}
          />
          <DashboardMetricCard
            label="Vendido hoje"
            value={formatCurrency(dashboard.metrics.soldToday)}
            detail="Pedidos criados para hoje"
            icon={TrendingUp}
            href={ordersHref({ competenceId })}
          />
          <DashboardMetricCard
            label="Recebido hoje"
            value={formatCurrency(dashboard.metrics.receivedToday)}
            detail="Checkouts InfinitePay pagos"
            icon={Banknote}
          />
          <DashboardMetricCard
            label="A receber"
            value={formatCurrency(dashboard.metrics.receivableAmount)}
            detail={`${dashboard.metrics.receivableOrders} pedidos liberados`}
            icon={CreditCard}
            href={ordersHref({ competenceId, view: "receivable" })}
          />
          <DashboardMetricCard
            label="Fechamento"
            value={`${dashboard.metrics.closingOrders}`}
            detail="Pagos aguardando solicitacao"
            icon={PackageOpen}
            href={ordersHref({ competenceId, view: "closing" })}
          />
          <DashboardMetricCard
            label="Reembolso"
            value={`${dashboard.metrics.refundPendingOrders}`}
            detail="Pendentes de acao manual"
            icon={RefreshCcw}
            href={ordersHref({ competenceId, view: "refund" })}
          />
        </div>

        <section className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5">
          <div className="grid gap-5 lg:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]">
            <div>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <span className="text-xs font-black uppercase text-[var(--muted)]">Competencia atual</span>
                  <h2 className="mt-1 text-2xl font-bold text-[var(--foreground)]">
                    {dashboard.currentCompetence?.label ?? "Sem competencia aberta"}
                  </h2>
                  <p className="mt-1 text-sm text-[var(--muted)]">
                    {dashboard.currentCompetence
                      ? `${formatDate(dashboard.currentCompetence.starts_on)} a ${formatDate(dashboard.currentCompetence.ends_on)}`
                      : "Cadastre uma competencia para ativar o acompanhamento mensal."}
                  </p>
                </div>
                <Link
                  href={ordersHref({ competenceId })}
                  className="inline-flex h-10 items-center justify-center rounded-md border border-[var(--border)] px-3 text-sm font-semibold text-[var(--foreground)] hover:bg-[var(--surface-strong)]"
                >
                  Abrir pedidos
                </Link>
              </div>

              <div className="mt-5">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-semibold text-[var(--foreground)]">Pago na competencia</span>
                  <span className="text-[var(--muted)]">{competencePaidPercent}%</span>
                </div>
                <div className="mt-2 h-3 overflow-hidden rounded-full bg-[var(--surface-strong)]">
                  <div className="h-full rounded-full bg-[var(--accent)]" style={{ width: `${Math.min(100, competencePaidPercent)}%` }} />
                </div>
                <div className="mt-3 grid gap-3 sm:grid-cols-3">
                  <div>
                    <span className="block text-xs font-semibold text-[var(--muted)]">Total previsto</span>
                    <strong className="text-sm text-[var(--foreground)]">{formatCurrency(competenceAmount)}</strong>
                  </div>
                  <div>
                    <span className="block text-xs font-semibold text-[var(--muted)]">Pago</span>
                    <strong className="text-sm text-emerald-300">{formatCurrency(dashboard.currentCompetence?.paidAmount ?? 0)}</strong>
                  </div>
                  <div>
                    <span className="block text-xs font-semibold text-[var(--muted)]">A receber</span>
                    <strong className="text-sm text-[var(--foreground)]">{formatCurrency(dashboard.currentCompetence?.receivableAmount ?? 0)}</strong>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <ActionCard
                label="Aprovar site"
                value={`${dashboard.metrics.sitePendingApproval}`}
                detail="Pedidos aguardando liberacao"
                icon={CheckCircle2}
                href={ordersHref({ competenceId, view: "approval" })}
              />
              <ActionCard
                label="Cobrar clientes"
                value={`${dashboard.currentCompetence?.customersWithPending ?? 0}`}
                detail={`${dashboard.metrics.receivableOrders} pedidos a receber`}
                icon={Users}
                href={ordersHref({ competenceId, view: "receivable" })}
              />
              <ActionCard
                label="Solicitados"
                value={`${dashboard.currentCompetence?.requestedOrders ?? 0}`}
                detail="Pedidos ja solicitados"
                icon={Clock3}
                href={ordersHref({ competenceId, view: "requested" })}
              />
              <ActionCard
                label="Recebidos"
                value={`${dashboard.currentCompetence?.receivedOrders ?? 0}`}
                detail="Prontos para envio"
                icon={PackageCheck}
                href={ordersHref({ competenceId, view: "received" })}
              />
            </div>
          </div>
        </section>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
          <section className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-[var(--foreground)]">Fila de atencao</h2>
                <p className="mt-1 text-sm text-[var(--muted)]">Itens que precisam de uma acao administrativa.</p>
              </div>
              <AlertTriangle size={20} className="text-[var(--accent)]" aria-hidden="true" />
            </div>
            <div className="mt-4 divide-y divide-[var(--border)]">
              {dashboard.attentionOrders.length > 0 ? dashboard.attentionOrders.map((order) => {
                const customer = firstRelation(order.customers);
                const info = attentionInfo(order, competenceId);

                return (
                  <Link
                    key={order.id}
                    href={info.href}
                    className="grid gap-3 py-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-center"
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <strong className="text-sm text-[var(--foreground)]">{info.label}</strong>
                        <span className="text-xs font-semibold text-[var(--muted)]">{order.order_number}</span>
                      </div>
                      <p className="mt-1 truncate text-sm text-[var(--muted)]">
                        {customer?.name ?? "Cliente"} · {info.detail}
                      </p>
                    </div>
                    <span className="text-sm font-semibold text-[var(--foreground)]">{formatCurrency(Number(order.total))}</span>
                  </Link>
                );
              }) : (
                <p className="py-6 text-sm text-[var(--muted)]">Nenhum item critico na competencia atual.</p>
              )}
            </div>
          </section>

          <section className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5">
            <h2 className="text-lg font-bold text-[var(--foreground)]">Ultimos 7 dias</h2>
            <div className="mt-4 grid gap-3">
              {dashboard.dailyTrend.map((day) => (
                <div key={day.date} className="grid gap-2">
                  <div className="flex items-center justify-between text-xs font-semibold text-[var(--muted)]">
                    <span>{shortDate(day.date)}</span>
                    <span>{day.orders} pedidos</span>
                  </div>
                  <div className="grid gap-1.5">
                    <div className="flex items-center gap-2">
                      <span className="w-16 text-xs text-[var(--muted)]">Vendido</span>
                      <div className="h-2 flex-1 overflow-hidden rounded-full bg-[var(--surface-strong)]">
                        <div className="h-full rounded-full bg-[var(--accent)]" style={{ width: `${Math.max(4, (day.sold / trendMax) * 100)}%` }} />
                      </div>
                      <span className="w-28 text-right text-xs text-[var(--foreground)]">{formatCurrency(day.sold)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-16 text-xs text-[var(--muted)]">Recebido</span>
                      <div className="h-2 flex-1 overflow-hidden rounded-full bg-[var(--surface-strong)]">
                        <div className="h-full rounded-full bg-emerald-300" style={{ width: `${Math.max(4, (day.received / trendMax) * 100)}%` }} />
                      </div>
                      <span className="w-28 text-right text-xs text-[var(--foreground)]">{formatCurrency(day.received)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>

        <div className="grid gap-6 xl:grid-cols-2">
          <section className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-bold text-[var(--foreground)]">Pedidos recentes</h2>
              <Link href={ordersHref()} className="text-sm font-semibold text-[var(--accent)] hover:brightness-110">Ver todos</Link>
            </div>
            <div className="mt-4 divide-y divide-[var(--border)]">
              {dashboard.latestOrders.length > 0 ? dashboard.latestOrders.map((order) => (
                <LatestOrderRow key={order.id} order={order} />
              )) : (
                <p className="py-6 text-sm text-[var(--muted)]">Nenhum pedido V2 encontrado.</p>
              )}
            </div>
          </section>

          <section className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-bold text-[var(--foreground)]">Pagamentos recentes</h2>
              <Send size={18} className="text-[var(--accent)]" aria-hidden="true" />
            </div>
            <div className="mt-4 divide-y divide-[var(--border)]">
              {dashboard.recentPayments.length > 0 ? dashboard.recentPayments.map((payment) => (
                <PaymentRow key={payment.id} payment={payment} />
              )) : (
                <p className="py-6 text-sm text-[var(--muted)]">Nenhum pagamento V2 confirmado ainda.</p>
              )}
            </div>
          </section>
        </div>
      </div>
    </AdminShell>
  );
}
