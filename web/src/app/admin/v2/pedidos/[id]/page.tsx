import type { Metadata } from "next";
import Link from "next/link";
import { AdminShell, MetricCard } from "@/components/admin/admin-shell";
import { OrderV2Actions } from "@/components/admin/order-v2-actions";
import { formatCurrency, formatDate } from "@/lib/format";
import {
  getV2StatusBadgeClassName,
  v2ApprovalStatusLabels,
  v2FulfillmentStatusLabels,
  v2PaymentStatusLabels,
  v2SourceLabels,
} from "@/lib/orders-v2-labels";
import { requireAdminPage } from "@/server/auth/require-admin-page";
import { OrderV2Service } from "@/server/orders-v2/order-v2-service";

export const metadata: Metadata = {
  title: "Pedido V2 admin",
};

type Props = {
  params: Promise<{ id: string }>;
};

type AdminOrderV2Detail = {
  approval_status: string;
  cancellation_reason: string | null;
  created_at: string;
  customers?: {
    email?: string | null;
    name?: string;
    phone?: string | null;
  } | Array<{
    email?: string | null;
    name?: string;
    phone?: string | null;
  }> | null;
  fulfillment_status: string;
  id: string;
  internal_notes: string | null;
  notes: string | null;
  order_date: string;
  order_number: string;
  paid_at: string | null;
  payment_status: string;
  rejection_reason: string | null;
  refund_notes: string | null;
  refunded_at: string | null;
  source: string;
  subtotal: number | string;
  total: number | string;
  tracking_code: string | null;
  tracking_url: string | null;
  v2_order_competencies?: {
    ends_on?: string;
    label?: string;
    starts_on?: string;
  } | Array<{
    ends_on?: string;
    label?: string;
    starts_on?: string;
  }> | null;
  v2_order_items?: Array<{
    id: string;
    product_name: string;
    product_sku: string | null;
    quantity: number | string;
    total_price: number | string;
    unit_price: number | string;
  }>;
  v2_payment_session_orders?: Array<{
    amount: number | string;
    v2_payment_sessions?: {
      checkout_number?: string;
      payment_link_url?: string | null;
      status?: string;
    } | Array<{
      checkout_number?: string;
      payment_link_url?: string | null;
      status?: string;
    }> | null;
  }>;
};

function firstRelation<T>(relation: T | T[] | null | undefined) {
  return Array.isArray(relation) ? relation[0] ?? null : relation ?? null;
}

function Badge({ label, status }: { label: string; status: string }) {
  return <span className={getV2StatusBadgeClassName(status)}>{label}</span>;
}

export default async function AdminOrderV2DetailPage({ params }: Props) {
  const { id } = await params;
  const admin = await requireAdminPage(`/admin/v2/pedidos/${id}`);
  const order = await new OrderV2Service(undefined, admin.profile.id).getAdminOrderById(id) as unknown as AdminOrderV2Detail;
  const customer = firstRelation(order.customers);
  const competence = firstRelation(order.v2_order_competencies);

  return (
    <AdminShell title={order.order_number} description="Detalhe operacional do pedido V2.">
      <div className="grid gap-6">
        <div className="flex flex-wrap gap-2">
          <Badge status={order.approval_status} label={v2ApprovalStatusLabels[order.approval_status] ?? order.approval_status} />
          <Badge status={order.payment_status} label={v2PaymentStatusLabels[order.payment_status] ?? order.payment_status} />
          <Badge status={order.fulfillment_status} label={v2FulfillmentStatusLabels[order.fulfillment_status] ?? order.fulfillment_status} />
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <MetricCard label="Total" value={formatCurrency(Number(order.total))} detail="Valor do pedido" />
          <MetricCard label="Origem" value={v2SourceLabels[order.source] ?? order.source} detail={formatDate(order.order_date)} />
          <MetricCard label="Competencia" value={competence?.label ?? "-"} detail={competence?.starts_on && competence?.ends_on ? `${formatDate(competence.starts_on)} a ${formatDate(competence.ends_on)}` : "-"} />
          <MetricCard label="Pagamento" value={order.paid_at ? formatDate(order.paid_at) : "-"} detail={v2PaymentStatusLabels[order.payment_status] ?? order.payment_status} />
        </div>

        <OrderV2Actions
          approvalStatus={order.approval_status}
          fulfillmentStatus={order.fulfillment_status}
          orderId={order.id}
          paymentStatus={order.payment_status}
          trackingCode={order.tracking_code}
          trackingUrl={order.tracking_url}
        />

        <section className="grid gap-4 md:grid-cols-2">
          <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5">
            <h2 className="text-lg font-bold text-[var(--foreground)]">Cliente</h2>
            <dl className="mt-4 grid gap-2 text-sm">
              <div>
                <dt className="text-[var(--muted)]">Nome</dt>
                <dd className="font-semibold text-[var(--foreground)]">{customer?.name ?? "Cliente"}</dd>
              </div>
              <div>
                <dt className="text-[var(--muted)]">E-mail</dt>
                <dd className="text-[var(--foreground)]">{customer?.email ?? "-"}</dd>
              </div>
              <div>
                <dt className="text-[var(--muted)]">Telefone</dt>
                <dd className="text-[var(--foreground)]">{customer?.phone ?? "-"}</dd>
              </div>
            </dl>
          </div>

          <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5">
            <h2 className="text-lg font-bold text-[var(--foreground)]">Notas</h2>
            <dl className="mt-4 grid gap-2 text-sm">
              <div>
                <dt className="text-[var(--muted)]">Cliente</dt>
                <dd className="text-[var(--foreground)]">{order.notes ?? "-"}</dd>
              </div>
              <div>
                <dt className="text-[var(--muted)]">Interna</dt>
                <dd className="text-[var(--foreground)]">{order.internal_notes ?? "-"}</dd>
              </div>
              {order.rejection_reason || order.cancellation_reason || order.refund_notes ? (
                <div>
                  <dt className="text-[var(--muted)]">Ocorrencias</dt>
                  <dd className="text-[var(--foreground)]">
                    {[order.rejection_reason, order.cancellation_reason, order.refund_notes].filter(Boolean).join(" · ")}
                  </dd>
                </div>
              ) : null}
            </dl>
          </div>
        </section>

        <section className="overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--surface)]">
          <div className="border-b border-[var(--border)] p-5">
            <h2 className="text-lg font-bold text-[var(--foreground)]">Itens</h2>
          </div>
          <table className="w-full min-w-[700px] text-left text-sm">
            <thead className="bg-[var(--surface-strong)] text-[var(--muted)]">
              <tr>
                <th className="px-4 py-3">Produto</th>
                <th className="px-4 py-3">SKU</th>
                <th className="px-4 py-3">Qtd.</th>
                <th className="px-4 py-3">Unitario</th>
                <th className="px-4 py-3">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {(order.v2_order_items ?? []).map((item) => (
                <tr key={item.id}>
                  <td className="px-4 py-3 font-semibold text-[var(--foreground)]">{item.product_name}</td>
                  <td className="px-4 py-3 text-[var(--muted)]">{item.product_sku ?? "-"}</td>
                  <td className="px-4 py-3 text-[var(--muted)]">{item.quantity}</td>
                  <td className="px-4 py-3 text-[var(--muted)]">{formatCurrency(Number(item.unit_price))}</td>
                  <td className="px-4 py-3 text-[var(--foreground)]">{formatCurrency(Number(item.total_price))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5">
          <h2 className="text-lg font-bold text-[var(--foreground)]">Checkouts</h2>
          <div className="mt-4 grid gap-2">
            {(order.v2_payment_session_orders ?? []).length === 0 ? (
              <p className="text-sm text-[var(--muted)]">Nenhum checkout gerado para este pedido.</p>
            ) : (
              order.v2_payment_session_orders?.map((link, index) => {
                const session = firstRelation(link.v2_payment_sessions);

                return (
                  <div key={`${session?.checkout_number ?? index}`} className="flex flex-col gap-2 rounded-md border border-[var(--border)] p-3 md:flex-row md:items-center md:justify-between">
                    <div>
                      <strong className="text-sm text-[var(--foreground)]">{session?.checkout_number ?? "Checkout"}</strong>
                      <p className="text-sm text-[var(--muted)]">
                        {formatCurrency(Number(link.amount))} · {session?.status ?? "-"}
                      </p>
                    </div>
                    {session?.payment_link_url ? (
                      <Link
                        href={session.payment_link_url}
                        target="_blank"
                        className="inline-flex h-9 items-center justify-center rounded-md border border-[var(--border)] px-3 text-sm font-semibold text-[var(--foreground)] hover:bg-[var(--surface-strong)]"
                      >
                        Abrir link
                      </Link>
                    ) : null}
                  </div>
                );
              })
            )}
          </div>
        </section>
      </div>
    </AdminShell>
  );
}
