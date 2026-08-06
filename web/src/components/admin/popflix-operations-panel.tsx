"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { CreditCard, ExternalLink, LinkIcon, Search } from "lucide-react";
import { PopFlixSubscriptionActions } from "@/components/admin/popflix-subscription-actions";
import { formatCurrency, formatDate } from "@/lib/format";
import { POPFLIX_PLANS } from "@/lib/popflix";

export type AdminPopFlixSubscription = {
  createdAt: string;
  customer?: {
    email?: string | null;
    id?: string | null;
    name?: string | null;
    phone?: string | null;
  } | null;
  favoriteFranchises?: string | null;
  id: string;
  lastPaymentAt?: string | null;
  monthlyPrice: number;
  nextBillingAt?: string | null;
  notes?: string | null;
  paidAmount?: number | null;
  paymentLinkCreatedAt?: string | null;
  paymentLinkUrl?: string | null;
  paymentStatus: string;
  plan: {
    name: string;
    slug: string;
  };
  receiptUrl?: string | null;
  status: string;
  subscriptionCode: string;
};

export type PopFlixAdminFilters = {
  paymentStatus: string;
  plan: string;
  q: string;
  status: string;
};

type QuickView = {
  count: number;
  id: string;
  label: string;
};

const subscriptionStatusOptions = [
  { label: "Aguardando pagamento", value: "pending_payment" },
  { label: "Ativa", value: "active" },
  { label: "Pausada", value: "paused" },
  { label: "Expirada", value: "expired" },
  { label: "Cancelada", value: "cancelled" },
] as const;

const paymentStatusOptions = [
  { label: "Pendente", value: "pending" },
  { label: "Pago", value: "paid" },
  { label: "Revisao manual", value: "manual_review" },
  { label: "Falhou", value: "failed" },
  { label: "Expirado", value: "expired" },
  { label: "Cancelado", value: "cancelled" },
] as const;

const quickViewIds = new Set([
  "all",
  "collect",
  "checkout",
  "renew",
  "active",
  "paid",
  "review",
  "paused",
  "closed",
]);

function normalizeQuickView(view: string | undefined) {
  return view && quickViewIds.has(view) ? view : "all";
}

function statusLabel(status: string) {
  const labels: Record<string, string> = {
    active: "Ativa",
    cancelled: "Cancelada",
    expired: "Expirada",
    paused: "Pausada",
    pending_payment: "Aguardando pagamento",
  };

  return labels[status] ?? status;
}

function paymentStatusLabel(status: string) {
  const labels: Record<string, string> = {
    cancelled: "Cancelado",
    expired: "Expirado",
    failed: "Falhou",
    manual_review: "Revisao manual",
    paid: "Pago",
    pending: "Pendente",
  };

  return labels[status] ?? status;
}

function badgeClassName(status: string) {
  if (status === "active" || status === "paid") {
    return "border-emerald-300/35 bg-emerald-500/12 text-emerald-200";
  }

  if (status === "pending_payment" || status === "pending") {
    return "border-yellow-300/40 bg-yellow-300/12 text-yellow-100";
  }

  if (status === "manual_review") {
    return "border-sky-300/35 bg-sky-400/12 text-sky-100";
  }

  if (["cancelled", "expired", "failed"].includes(status)) {
    return "border-red-300/35 bg-red-500/12 text-red-100";
  }

  return "border-[var(--border)] bg-[var(--surface-strong)] text-[var(--muted)]";
}

function Badge({ label, status }: { label: string; status: string }) {
  return (
    <span className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-black uppercase ${badgeClassName(status)}`}>
      {label}
    </span>
  );
}

function isClosed(subscription: AdminPopFlixSubscription) {
  return ["cancelled", "expired"].includes(subscription.status);
}

function isCollectable(subscription: AdminPopFlixSubscription) {
  return !isClosed(subscription) && ["pending", "failed", "expired", "cancelled"].includes(subscription.paymentStatus);
}

function hasOpenCheckout(subscription: AdminPopFlixSubscription) {
  return Boolean(subscription.paymentLinkUrl) && subscription.paymentStatus === "pending";
}

function isDueSoon(subscription: AdminPopFlixSubscription) {
  if (subscription.status !== "active" || !subscription.nextBillingAt) {
    return false;
  }

  const billingTime = new Date(subscription.nextBillingAt).getTime();

  if (Number.isNaN(billingTime)) {
    return false;
  }

  const sevenDays = 7 * 24 * 60 * 60 * 1000;
  return billingTime <= Date.now() + sevenDays;
}

function matchesView(subscription: AdminPopFlixSubscription, view: string) {
  switch (view) {
    case "collect":
      return isCollectable(subscription);
    case "checkout":
      return hasOpenCheckout(subscription);
    case "renew":
      return isDueSoon(subscription);
    case "active":
      return subscription.status === "active";
    case "paid":
      return subscription.paymentStatus === "paid";
    case "review":
      return subscription.paymentStatus === "manual_review";
    case "paused":
      return subscription.status === "paused";
    case "closed":
      return isClosed(subscription);
    default:
      return true;
  }
}

function getQuickViews(subscriptions: AdminPopFlixSubscription[]): QuickView[] {
  return [
    { count: subscriptions.length, id: "all", label: "Todos" },
    { count: subscriptions.filter(isCollectable).length, id: "collect", label: "A cobrar" },
    { count: subscriptions.filter(hasOpenCheckout).length, id: "checkout", label: "Link aberto" },
    { count: subscriptions.filter(isDueSoon).length, id: "renew", label: "Renovar" },
    { count: subscriptions.filter((subscription) => subscription.status === "active").length, id: "active", label: "Ativas" },
    { count: subscriptions.filter((subscription) => subscription.paymentStatus === "paid").length, id: "paid", label: "Pagas" },
    { count: subscriptions.filter((subscription) => subscription.paymentStatus === "manual_review").length, id: "review", label: "Revisao" },
    { count: subscriptions.filter((subscription) => subscription.status === "paused").length, id: "paused", label: "Pausadas" },
    { count: subscriptions.filter(isClosed).length, id: "closed", label: "Encerradas" },
  ];
}

function getPlanSummaries(subscriptions: AdminPopFlixSubscription[]) {
  return POPFLIX_PLANS.map((plan) => {
    const planSubscriptions = subscriptions.filter((subscription) => subscription.plan.slug === plan.slug);
    const activeSubscriptions = planSubscriptions.filter((subscription) => subscription.status === "active");
    const collectableSubscriptions = planSubscriptions.filter(isCollectable);

    return {
      active: activeSubscriptions.length,
      collectable: collectableSubscriptions.length,
      collectableAmount: collectableSubscriptions.reduce((sum, subscription) => sum + subscription.monthlyPrice, 0),
      id: plan.slug,
      mrr: activeSubscriptions.reduce((sum, subscription) => sum + subscription.monthlyPrice, 0),
      name: plan.name,
      total: planSubscriptions.length,
    };
  });
}

export function PopFlixOperationsPanel({
  filters,
  initialView,
  subscriptions,
}: {
  filters: PopFlixAdminFilters;
  initialView?: string;
  subscriptions: AdminPopFlixSubscription[];
}) {
  const [activeView, setActiveView] = useState(() => normalizeQuickView(initialView));
  const visibleSubscriptions = useMemo(
    () => subscriptions.filter((subscription) => matchesView(subscription, activeView)),
    [activeView, subscriptions],
  );
  const quickViews = getQuickViews(subscriptions);
  const planSummaries = getPlanSummaries(subscriptions);
  const visibleCollectable = visibleSubscriptions.filter(isCollectable);
  const visibleCollectableAmount = visibleCollectable.reduce((sum, subscription) => sum + subscription.monthlyPrice, 0);
  const openCheckoutCount = visibleSubscriptions.filter(hasOpenCheckout).length;

  return (
    <section className="rounded-lg border border-[var(--border)] bg-[var(--surface)]">
      <div className="border-b border-[var(--border)] p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="text-lg font-bold text-[var(--foreground)]">Operacao PopFlix</h2>
            <p className="mt-1 text-sm text-[var(--muted)]">
              Filas para cobrar, conferir pagamentos e acompanhar a base de assinaturas.
            </p>
          </div>
          <div className="grid gap-1 text-sm sm:grid-cols-3 lg:min-w-[520px]">
            <div className="rounded-md border border-[var(--border)] px-3 py-2">
              <span className="block text-xs font-semibold text-[var(--muted)]">Visiveis</span>
              <strong className="text-[var(--foreground)]">{visibleSubscriptions.length}</strong>
            </div>
            <div className="rounded-md border border-[var(--border)] px-3 py-2">
              <span className="block text-xs font-semibold text-[var(--muted)]">A cobrar</span>
              <strong className="text-[var(--foreground)]">{formatCurrency(visibleCollectableAmount)}</strong>
            </div>
            <div className="rounded-md border border-[var(--border)] px-3 py-2">
              <span className="block text-xs font-semibold text-[var(--muted)]">Links abertos</span>
              <strong className="text-[var(--foreground)]">{openCheckoutCount}</strong>
            </div>
          </div>
        </div>

        <div className="mt-4 flex gap-2 overflow-x-auto pb-1" role="tablist" aria-label="Visoes PopFlix">
          {quickViews.map((view) => (
            <button
              key={view.id}
              type="button"
              onClick={() => setActiveView(view.id)}
              className={[
                "inline-flex h-10 shrink-0 items-center gap-2 rounded-md border px-3 text-sm font-semibold transition",
                activeView === view.id
                  ? "border-[var(--accent)] bg-[var(--accent)] text-slate-950"
                  : "border-[var(--border)] text-[var(--foreground)] hover:bg-[var(--surface-strong)]",
              ].join(" ")}
              role="tab"
              aria-selected={activeView === view.id}
            >
              {view.label}
              <span
                className={[
                  "rounded-full px-2 py-0.5 text-xs",
                  activeView === view.id ? "bg-slate-950/15" : "bg-[var(--surface-strong)] text-[var(--muted)]",
                ].join(" ")}
              >
                {view.count}
              </span>
            </button>
          ))}
        </div>

        <form className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3 xl:items-end">
          <input type="hidden" name="view" value={activeView} />
          <label className="block">
            <span className="text-sm font-semibold text-[var(--foreground)]">Cliente ou assinatura</span>
            <input
              name="q"
              defaultValue={filters.q}
              placeholder="Nome, e-mail, telefone ou PF-..."
              className="mt-2 h-11 w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 text-sm outline-none focus:border-[var(--accent)]"
            />
          </label>
          <label className="block">
            <span className="text-sm font-semibold text-[var(--foreground)]">Assinatura</span>
            <select
              name="status"
              defaultValue={filters.status}
              className="mt-2 h-11 w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 text-sm outline-none focus:border-[var(--accent)]"
            >
              <option value="">Todas</option>
              {subscriptionStatusOptions.map(({ label, value }) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-sm font-semibold text-[var(--foreground)]">Pagamento</span>
            <select
              name="paymentStatus"
              defaultValue={filters.paymentStatus}
              className="mt-2 h-11 w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 text-sm outline-none focus:border-[var(--accent)]"
            >
              <option value="">Todos</option>
              {paymentStatusOptions.map(({ label, value }) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-sm font-semibold text-[var(--foreground)]">Plano</span>
            <select
              name="plan"
              defaultValue={filters.plan}
              className="mt-2 h-11 w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 text-sm outline-none focus:border-[var(--accent)]"
            >
              <option value="">Todos</option>
              {POPFLIX_PLANS.map((plan) => (
                <option key={plan.slug} value={plan.slug}>{plan.name}</option>
              ))}
            </select>
          </label>
          <button className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-[var(--accent)] px-4 text-sm font-black text-slate-950 hover:brightness-110">
            <Search size={16} aria-hidden="true" />
            Filtrar
          </button>
          <Link
            href="/admin/popflix"
            className="inline-flex h-11 items-center justify-center rounded-md border border-[var(--border)] px-4 text-sm font-semibold text-[var(--foreground)] hover:bg-[var(--surface-strong)]"
          >
            Limpar
          </Link>
        </form>
      </div>

      <div className="grid gap-3 border-b border-[var(--border)] p-4 md:grid-cols-3">
        {planSummaries.map((plan) => (
          <div key={plan.id} className="rounded-md border border-[var(--border)] p-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <span className="block text-sm font-bold text-[var(--foreground)]">{plan.name}</span>
                <span className="mt-1 block text-xs text-[var(--muted)]">{plan.total} assinatura{plan.total === 1 ? "" : "s"}</span>
              </div>
              <strong className="text-lg text-[var(--foreground)]">{plan.active}</strong>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="block font-semibold text-[var(--muted)]">MRR</span>
                <strong className="text-[var(--foreground)]">{formatCurrency(plan.mrr)}</strong>
              </div>
              <div>
                <span className="block font-semibold text-[var(--muted)]">A cobrar</span>
                <strong className="text-[var(--foreground)]">{plan.collectable} · {formatCurrency(plan.collectableAmount)}</strong>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[1180px] text-left text-sm">
          <thead className="bg-[var(--surface-strong)] text-[var(--muted)]">
            <tr>
              <th className="px-4 py-3">Assinatura</th>
              <th className="px-4 py-3">Cliente</th>
              <th className="px-4 py-3">Plano</th>
              <th className="px-4 py-3">Mensalidade</th>
              <th className="px-4 py-3">Fluxo</th>
              <th className="px-4 py-3">Cobranca</th>
              <th className="px-4 py-3">Acoes</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border)]">
            {visibleSubscriptions.map((subscription) => (
              <tr key={subscription.id} className="hover:bg-[var(--surface-strong)]/40">
                <td className="px-4 py-3 align-top">
                  <p className="font-semibold text-[var(--foreground)]">{subscription.subscriptionCode}</p>
                  <p className="mt-1 text-xs text-[var(--muted)]">Criada em {formatDate(subscription.createdAt)}</p>
                  {subscription.favoriteFranchises ? (
                    <p className="mt-2 max-w-64 truncate text-xs text-[var(--muted)]">
                      {subscription.favoriteFranchises}
                    </p>
                  ) : null}
                </td>
                <td className="px-4 py-3 align-top">
                  <p className="font-semibold text-[var(--foreground)]">
                    {subscription.customer?.name ?? "Cliente"}
                  </p>
                  <p className="mt-1 text-xs text-[var(--muted)]">
                    {subscription.customer?.email ?? subscription.customer?.phone ?? "-"}
                  </p>
                  {subscription.customer?.phone && subscription.customer?.email ? (
                    <p className="mt-1 text-xs text-[var(--muted)]">{subscription.customer.phone}</p>
                  ) : null}
                </td>
                <td className="px-4 py-3 align-top">
                  <p className="font-semibold text-[var(--foreground)]">{subscription.plan.name}</p>
                  {subscription.notes ? (
                    <p className="mt-1 max-w-56 truncate text-xs text-[var(--muted)]">{subscription.notes}</p>
                  ) : null}
                </td>
                <td className="px-4 py-3 align-top">
                  <p className="font-semibold text-[var(--foreground)]">{formatCurrency(subscription.monthlyPrice)}</p>
                  {subscription.paidAmount ? (
                    <p className="mt-1 text-xs text-[var(--muted)]">Pago: {formatCurrency(subscription.paidAmount)}</p>
                  ) : null}
                </td>
                <td className="px-4 py-3 align-top">
                  <div className="flex max-w-[260px] flex-wrap gap-1.5">
                    <Badge label={statusLabel(subscription.status)} status={subscription.status} />
                    <Badge label={paymentStatusLabel(subscription.paymentStatus)} status={subscription.paymentStatus} />
                  </div>
                </td>
                <td className="px-4 py-3 align-top text-[var(--muted)]">
                  <div className="grid gap-1.5">
                    <p>
                      Proxima: {subscription.nextBillingAt ? formatDate(subscription.nextBillingAt) : "-"}
                    </p>
                    {subscription.lastPaymentAt ? (
                      <p>Ultimo pagamento: {formatDate(subscription.lastPaymentAt)}</p>
                    ) : null}
                    {subscription.paymentLinkCreatedAt ? (
                      <p className="inline-flex items-center gap-1">
                        <LinkIcon size={13} aria-hidden="true" />
                        Link em {formatDate(subscription.paymentLinkCreatedAt)}
                      </p>
                    ) : null}
                    {subscription.receiptUrl ? (
                      <a
                        href={subscription.receiptUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex w-fit items-center gap-1 text-xs font-semibold text-[var(--accent)] hover:underline"
                      >
                        <CreditCard size={13} aria-hidden="true" />
                        Recibo
                        <ExternalLink size={12} aria-hidden="true" />
                      </a>
                    ) : null}
                  </div>
                </td>
                <td className="px-4 py-3 align-top">
                  <PopFlixSubscriptionActions
                    paymentLinkUrl={subscription.paymentLinkUrl}
                    paymentStatus={subscription.paymentStatus}
                    status={subscription.status}
                    subscriptionId={subscription.id}
                  />
                </td>
              </tr>
            ))}
            {visibleSubscriptions.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-sm text-[var(--muted)]">
                  Nenhuma assinatura PopFlix encontrada para essa visao.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </section>
  );
}
