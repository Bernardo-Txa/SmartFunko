import type { Metadata } from "next";
import { AdminShell, MetricCard } from "@/components/admin/admin-shell";
import { OrderV2CompetenceForm } from "@/components/admin/order-v2-competence-form";
import { OrderV2CreateForm } from "@/components/admin/order-v2-create-form";
import {
  OrderV2OperationsPanel,
  type AdminOrderV2ListOrder,
  type OrderV2CompetenceOption,
  type OrderV2ListFilters,
} from "@/components/admin/order-v2-operations-panel";
import { formatCurrency, formatDate } from "@/lib/format";
import { requireAdminPage } from "@/server/auth/require-admin-page";
import { CustomerService } from "@/server/customers/customer-service";
import { OrderV2Service } from "@/server/orders-v2/order-v2-service";

export const metadata: Metadata = {
  title: "Pedidos V2 admin",
};

type Props = {
  searchParams?: Promise<{
    approvalStatus?: string;
    competenceId?: string;
    fulfillmentStatus?: string;
    paymentStatus?: string;
    q?: string;
    view?: string;
  }>;
};

type Customer = {
  email: string | null;
  id: string;
  name: string;
  phone: string | null;
};

function firstRelation<T>(relation: T | T[] | null | undefined) {
  return Array.isArray(relation) ? relation[0] ?? null : relation ?? null;
}

function getParam(value: string | undefined) {
  return value?.trim() ?? "";
}

function todayInput() {
  return new Date().toISOString().slice(0, 10);
}

function getStats(orders: AdminOrderV2ListOrder[]) {
  return {
    awaitingApproval: orders.filter((order) => order.approval_status === "aguardando_aprovacao").length,
    inClosing: orders.filter((order) => order.payment_status === "pago" && order.fulfillment_status === "aguardando_fechamento").length,
    openAmount: orders
      .filter((order) => ["nao_pago", "checkout_gerado"].includes(order.payment_status))
      .reduce((sum, order) => sum + Number(order.total), 0),
    paid: orders.filter((order) => order.payment_status === "pago").length,
    total: orders.length,
  };
}

function getCompetenceSummaries(competencies: OrderV2CompetenceOption[], orders: AdminOrderV2ListOrder[]) {
  return competencies.slice(0, 6).map((competence) => {
    const competenceOrders = orders.filter((order) => firstRelation(order.v2_order_competencies)?.id === competence.id);

    return {
      ...competence,
      inClosing: competenceOrders.filter((order) => order.payment_status === "pago" && order.fulfillment_status === "aguardando_fechamento").length,
      openAmount: competenceOrders
        .filter((order) => ["nao_pago", "checkout_gerado"].includes(order.payment_status))
        .reduce((sum, order) => sum + Number(order.total), 0),
      paid: competenceOrders.filter((order) => order.payment_status === "pago").length,
      totalOrders: competenceOrders.length,
    };
  });
}

export default async function AdminOrdersV2Page({ searchParams }: Props) {
  const admin = await requireAdminPage("/admin/v2/pedidos");
  const params = await searchParams;
  const search = getParam(params?.q);
  const approvalStatus = getParam(params?.approvalStatus);
  const paymentStatus = getParam(params?.paymentStatus);
  const fulfillmentStatus = getParam(params?.fulfillmentStatus);
  const competenceId = getParam(params?.competenceId);
  const view = getParam(params?.view);
  const service = new OrderV2Service(undefined, admin.profile.id);
  const [orders, competencies, customers] = await Promise.all([
    service.listAdminOrders({
      approvalStatus: approvalStatus || undefined,
      competenceId: competenceId || undefined,
      fulfillmentStatus: fulfillmentStatus || undefined,
      paymentStatus: paymentStatus || undefined,
      search: search || undefined,
    }) as unknown as Promise<AdminOrderV2ListOrder[]>,
    service.listCompetencies() as unknown as Promise<OrderV2CompetenceOption[]>,
    new CustomerService(undefined, admin.profile.id).listCustomers() as unknown as Promise<Customer[]>,
  ]);
  const stats = getStats(orders);
  const filters: OrderV2ListFilters = {
    approvalStatus,
    competenceId,
    fulfillmentStatus,
    paymentStatus,
    q: search,
  };
  const competenceSummaries = getCompetenceSummaries(competencies, orders);

  return (
    <AdminShell title="Pedidos V2" description="Fluxo novo de pedidos, competencias e pagamento parcial InfinitePay.">
      <div className="grid gap-6">
        <div className="grid gap-4 md:grid-cols-4">
          <MetricCard label="Pedidos" value={`${stats.total}`} detail="No filtro atual" />
          <MetricCard label="Site pendente" value={`${stats.awaitingApproval}`} detail="Aguardando aprovacao" />
          <MetricCard label="A receber" value={formatCurrency(stats.openAmount)} detail="Nao pago ou checkout gerado" />
          <MetricCard label="Fechamento" value={`${stats.inClosing}`} detail={`${stats.paid} pagos no filtro`} />
        </div>

        <OrderV2CreateForm
          customers={customers}
          defaultOrderDate={todayInput()}
        />

        <section className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5">
          <div className="mb-4 flex flex-col gap-1 md:flex-row md:items-end md:justify-between">
            <div>
              <h2 className="text-lg font-bold text-[var(--foreground)]">Competencias</h2>
              <p className="text-sm text-[var(--muted)]">Janelas comerciais que definem o mês de cobrança.</p>
            </div>
          </div>
          <OrderV2CompetenceForm />
          <div className="mt-4 overflow-hidden rounded-lg border border-[var(--border)]">
            <table className="w-full min-w-[820px] text-left text-sm">
              <thead className="bg-[var(--surface-strong)] text-[var(--muted)]">
                <tr>
                  <th className="px-4 py-3">Competencia</th>
                  <th className="px-4 py-3">Periodo</th>
                  <th className="px-4 py-3">Pedidos</th>
                  <th className="px-4 py-3">A receber</th>
                  <th className="px-4 py-3">Pagos</th>
                  <th className="px-4 py-3">Fechamento</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {competenceSummaries.map((competence) => (
                  <tr key={competence.id}>
                    <td className="px-4 py-3 font-semibold text-[var(--foreground)]">{competence.label}</td>
                    <td className="px-4 py-3 text-[var(--muted)]">
                      {formatDate(competence.starts_on)} a {formatDate(competence.ends_on)}
                    </td>
                    <td className="px-4 py-3 text-[var(--foreground)]">{competence.totalOrders}</td>
                    <td className="px-4 py-3 font-semibold text-[var(--foreground)]">{formatCurrency(competence.openAmount)}</td>
                    <td className="px-4 py-3 text-[var(--muted)]">{competence.paid}</td>
                    <td className="px-4 py-3 text-[var(--muted)]">{competence.inClosing}</td>
                    <td className="px-4 py-3 text-[var(--muted)]">{competence.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <OrderV2OperationsPanel
          key={`${competenceId}-${approvalStatus}-${paymentStatus}-${fulfillmentStatus}-${search}-${view}`}
          orders={orders}
          competencies={competencies}
          filters={filters}
          initialView={view}
        />
      </div>
    </AdminShell>
  );
}
