import type { Metadata } from "next";
import Link from "next/link";
import { AdminShell, MetricCard } from "@/components/admin/admin-shell";
import { OrderV2Actions } from "@/components/admin/order-v2-actions";
import { OrderV2BlingNfePanel } from "@/components/admin/order-v2-bling-nfe-panel";
import { formatCurrency, formatDate, formatPhoneNumber } from "@/lib/format";
import {
  getV2StatusBadgeClassName,
  v2ApprovalStatusLabels,
  v2FulfillmentStatusLabels,
  v2PaymentStatusLabels,
  v2SourceLabels,
} from "@/lib/orders-v2-labels";
import { requireAdminPage } from "@/server/auth/require-admin-page";
import { BlingNfeService } from "@/server/bling/bling-nfe-service";
import { OrderV2Service } from "@/server/orders-v2/order-v2-service";

export const metadata: Metadata = {
  title: "Pedido V2 admin",
};

type Props = {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{
    bling_oauth?: string;
  }>;
};

type AdminOrderV2Detail = {
  approval_status: string;
  cancellation_reason: string | null;
  created_at: string;
  customers?: {
    cpf?: string | null;
    email?: string | null;
    name?: string;
    phone?: string | null;
  } | Array<{
    cpf?: string | null;
    email?: string | null;
    name?: string;
    phone?: string | null;
  }> | null;
  temporary_customers?: {
    name?: string | null;
    phone?: string | null;
  } | Array<{
    name?: string | null;
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

function getOrderBuyer(order: AdminOrderV2Detail) {
  const customer = firstRelation(order.customers);
  const temporaryCustomer = firstRelation(order.temporary_customers);

  if (customer) {
    return {
      cpf: customer.cpf ?? null,
      email: customer.email ?? null,
      isTemporary: false,
      name: customer.name?.trim() || "Cliente",
      phone: customer.phone ?? null,
    };
  }

  if (temporaryCustomer) {
    return {
      cpf: null,
      email: null,
      isTemporary: true,
      name: temporaryCustomer.name?.trim() || "Cliente temporario",
      phone: temporaryCustomer.phone ?? null,
    };
  }

  return {
    cpf: null,
    email: null,
    isTemporary: false,
    name: "Cliente",
    phone: null,
  };
}

export default async function AdminOrderV2DetailPage({ params, searchParams }: Props) {
  const { id } = await params;
  const query = await searchParams;
  const blingOAuthStatus = query?.bling_oauth === "connected" || query?.bling_oauth === "error"
    ? query.bling_oauth
    : null;
  const admin = await requireAdminPage(`/admin/v2/pedidos/${id}`);
  const [order, blingNfeIssue] = await Promise.all([
    new OrderV2Service(undefined, admin.profile.id).getAdminOrderById(id) as Promise<unknown>,
    new BlingNfeService(undefined, admin.profile.id).getOrderIssue(id),
  ]);
  const typedOrder = order as AdminOrderV2Detail;
  const buyer = getOrderBuyer(typedOrder);
  const competence = firstRelation(typedOrder.v2_order_competencies);

  return (
    <AdminShell title={typedOrder.order_number} description="Detalhe operacional do pedido V2.">
      <div className="grid gap-6">
        <div className="flex flex-wrap gap-2">
          <Badge status={typedOrder.approval_status} label={v2ApprovalStatusLabels[typedOrder.approval_status] ?? typedOrder.approval_status} />
          <Badge status={typedOrder.payment_status} label={v2PaymentStatusLabels[typedOrder.payment_status] ?? typedOrder.payment_status} />
          <Badge status={typedOrder.fulfillment_status} label={v2FulfillmentStatusLabels[typedOrder.fulfillment_status] ?? typedOrder.fulfillment_status} />
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard label="Total" value={formatCurrency(Number(typedOrder.total))} detail="Valor do pedido" />
          <MetricCard label="Origem" value={v2SourceLabels[typedOrder.source] ?? typedOrder.source} detail={formatDate(typedOrder.order_date)} />
          <MetricCard label="Competencia" value={competence?.label ?? "-"} detail={competence?.starts_on && competence?.ends_on ? `${formatDate(competence.starts_on)} a ${formatDate(competence.ends_on)}` : "-"} />
          <MetricCard label="Pagamento" value={typedOrder.paid_at ? formatDate(typedOrder.paid_at) : "-"} detail={v2PaymentStatusLabels[typedOrder.payment_status] ?? typedOrder.payment_status} />
        </div>

        <OrderV2Actions
          approvalStatus={typedOrder.approval_status}
          fulfillmentStatus={typedOrder.fulfillment_status}
          orderId={typedOrder.id}
          paymentStatus={typedOrder.payment_status}
          trackingCode={typedOrder.tracking_code}
          trackingUrl={typedOrder.tracking_url}
        />

        <OrderV2BlingNfePanel
          blingOAuthStatus={blingOAuthStatus}
          fulfillmentStatus={typedOrder.fulfillment_status}
          issue={blingNfeIssue}
          orderId={typedOrder.id}
          paymentStatus={typedOrder.payment_status}
        />

        <section className="grid gap-4 md:grid-cols-2">
          <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-bold text-[var(--foreground)]">Cliente</h2>
              {buyer.isTemporary ? (
                <span className="rounded-full border border-yellow-300/40 px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.08em] text-yellow-100">
                  Temporario
                </span>
              ) : null}
            </div>
            <dl className="mt-4 grid gap-2 text-sm">
              <div>
                <dt className="text-[var(--muted)]">Nome</dt>
                <dd className="font-semibold text-[var(--foreground)]">{buyer.name}</dd>
              </div>
              <div>
                <dt className="text-[var(--muted)]">E-mail</dt>
                <dd className="text-[var(--foreground)]">{buyer.email ?? "-"}</dd>
              </div>
              <div>
                <dt className="text-[var(--muted)]">Telefone</dt>
                <dd className="text-[var(--foreground)]">{formatPhoneNumber(buyer.phone) || "-"}</dd>
              </div>
              <div>
                <dt className="text-[var(--muted)]">CPF/CNPJ</dt>
                <dd className="text-[var(--foreground)]">{buyer.cpf ?? "-"}</dd>
              </div>
            </dl>
          </div>

          <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5">
            <h2 className="text-lg font-bold text-[var(--foreground)]">Notas</h2>
            <dl className="mt-4 grid gap-2 text-sm">
              <div>
                <dt className="text-[var(--muted)]">Cliente</dt>
                <dd className="text-[var(--foreground)]">{typedOrder.notes ?? "-"}</dd>
              </div>
              <div>
                <dt className="text-[var(--muted)]">Interna</dt>
                <dd className="text-[var(--foreground)]">{typedOrder.internal_notes ?? "-"}</dd>
              </div>
              {typedOrder.rejection_reason || typedOrder.cancellation_reason || typedOrder.refund_notes ? (
                <div>
                  <dt className="text-[var(--muted)]">Ocorrencias</dt>
                  <dd className="text-[var(--foreground)]">
                    {[typedOrder.rejection_reason, typedOrder.cancellation_reason, typedOrder.refund_notes].filter(Boolean).join(" · ")}
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
              {(typedOrder.v2_order_items ?? []).map((item) => (
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
            {(typedOrder.v2_payment_session_orders ?? []).length === 0 ? (
              <p className="text-sm text-[var(--muted)]">Nenhum checkout gerado para este pedido.</p>
            ) : (
              typedOrder.v2_payment_session_orders?.map((link, index) => {
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
