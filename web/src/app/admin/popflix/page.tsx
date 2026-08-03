import type { Metadata } from "next";
import { AdminShell, MetricCard } from "@/components/admin/admin-shell";
import {
  PopFlixOperationsPanel,
  type AdminPopFlixSubscription,
  type PopFlixAdminFilters,
} from "@/components/admin/popflix-operations-panel";
import { formatCurrency } from "@/lib/format";
import { requireAdminPage } from "@/server/auth/require-admin-page";
import { PopFlixSubscriptionService } from "@/server/popflix/popflix-subscription-service";

export const metadata: Metadata = {
  title: "PopFlix admin",
};

type PopFlixSubscription = Awaited<
  ReturnType<PopFlixSubscriptionService["listAdminSubscriptions"]>
>[number];

type Props = {
  searchParams?: Promise<{
    paymentStatus?: string;
    plan?: string;
    q?: string;
    status?: string;
    view?: string;
  }>;
};

function getParam(value: string | undefined) {
  return value?.trim() ?? "";
}

function getStats(subscriptions: PopFlixSubscription[]) {
  return {
    active: subscriptions.filter((subscription) => subscription.status === "active").length,
    activeMonthly: subscriptions
      .filter((subscription) => subscription.status === "active")
      .reduce((sum, subscription) => sum + subscription.monthlyPrice, 0),
    pending: subscriptions.filter((subscription) => subscription.status === "pending_payment").length,
    pendingAmount: subscriptions
      .filter((subscription) => subscription.status === "pending_payment")
      .reduce((sum, subscription) => sum + subscription.monthlyPrice, 0),
    review: subscriptions.filter((subscription) => subscription.paymentStatus === "manual_review").length,
    total: subscriptions.length,
  };
}

export default async function AdminPopFlixPage({ searchParams }: Props) {
  const admin = await requireAdminPage("/admin/popflix");
  const params = await searchParams;
  const paymentStatus = getParam(params?.paymentStatus);
  const plan = getParam(params?.plan);
  const search = getParam(params?.q);
  const status = getParam(params?.status);
  const view = getParam(params?.view);
  const subscriptions = await new PopFlixSubscriptionService(undefined, admin.profile.id)
    .listAdminSubscriptions({
      paymentStatus: paymentStatus || undefined,
      plan: plan || undefined,
      q: search || undefined,
      status: status || undefined,
    });
  const stats = getStats(subscriptions);
  const filters: PopFlixAdminFilters = {
    paymentStatus,
    plan,
    q: search,
    status,
  };

  return (
    <AdminShell title="PopFlix" description="Assinaturas, cobranças InfinitePay e confirmação de mensalidades.">
      <div className="grid gap-6">
        <div className="grid gap-4 md:grid-cols-4">
          <MetricCard label="Assinaturas" value={`${stats.total}`} detail={`${stats.active} ativas no filtro`} />
          <MetricCard label="MRR PopFlix" value={formatCurrency(stats.activeMonthly)} detail="Mensalidade ativa prevista" />
          <MetricCard label="A receber" value={formatCurrency(stats.pendingAmount)} detail={`${stats.pending} pendente${stats.pending === 1 ? "" : "s"}`} />
          <MetricCard label="Revisao" value={`${stats.review}`} detail="Pagamentos para conferir" />
        </div>

        <PopFlixOperationsPanel
          key={`${paymentStatus}-${plan}-${search}-${status}-${view}`}
          filters={filters}
          initialView={view}
          subscriptions={subscriptions as AdminPopFlixSubscription[]}
        />
      </div>
    </AdminShell>
  );
}
