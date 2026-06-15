import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminShell, MetricCard } from "@/components/admin/admin-shell";
import { OrderDetailActions } from "@/components/admin/order-detail-actions";
import {
  OrderItemStatusBadge,
  OrderStatusBadge,
  PaymentStatusBadge,
  PurchaseBatchStatusBadge,
} from "@/components/ui/status-badge";
import { env } from "@/lib/env";
import { formatCurrency, formatDate } from "@/lib/format";
import { getOrderItemSourceLabel, getOrderSellerLabel } from "@/lib/order-labels";
import {
  getOperationalStatusMeta,
  getOrderItemStatusMeta,
  getOrderReviewStatusMeta,
  getStatusBadgeClassName,
  getPaymentStatusMeta,
} from "@/lib/status-labels";
import { requireAdminPage } from "@/server/auth/require-admin-page";
import { HttpError } from "@/server/http/errors";
import { InventoryService } from "@/server/inventory/inventory-service";
import { OrderService } from "@/server/orders/order-service";
import { getDefaultOrderMaxInstallments } from "@/server/payments/payment-rules";
import { PurchaseBatchService } from "@/server/purchase-batches/purchase-batch-service";

type Props = {
  params: Promise<{ id: string }>;
};

type OrderDetail = {
  id: string;
  order_number: string;
  customer_id: string;
  channel: string;
  coupon_code: string | null;
  seller: string | null;
  status: string | null;
  subtotal: number | string | null;
  discount: number | string | null;
  shipping_amount: number | string | null;
  total: number | string | null;
  public_token: string;
  public_tracking_enabled: boolean;
  payment_link_created_at: string | null;
  payment_link_url: string | null;
  payment_max_installments: number | null;
  payment_max_installments_source: string | null;
  payment_fee_mode: string | null;
  payment_provider: string | null;
  payment_provider_reference: string | null;
  rejected_reason: string | null;
  review_notes: string | null;
  review_status: string | null;
  reviewed_at: string | null;
  notes: string | null;
  internal_notes: string | null;
  created_at: string | null;
  updated_at: string | null;
  customers?: {
    email: string | null;
    name: string;
    phone: string | null;
    status: string;
  } | null;
  order_items?: OrderItem[];
  payments?: PaymentItem[];
};

type OrderItem = {
  id: string;
  inventory_item_id: string | null;
  product_variant_id: string;
  quantity: number | string | null;
  source: string;
  status: string;
  total_price: number | string | null;
  unit_price: number | string | null;
  product_variants?: {
    sku: string;
    products?: {
      name: string;
      slug: string;
    } | null;
  } | null;
};

type PaymentItem = {
  id: string;
  amount: number | string | null;
  fee_amount: number | string | null;
  method: string;
  net_amount: number | string | null;
  paid_at: string | null;
  status: string;
};

type InventoryOption = {
  id: string;
  location: string | null;
  product_variant_id: string;
  sku: string;
  status: string;
};

type HistoryItem = {
  id: string;
  created_at: string;
  new_status: string;
  notes: string | null;
  previous_status: string | null;
  profiles?: {
    name?: string;
  } | null;
};

type AuditLogItem = {
  id: string;
  action: string;
  created_at: string;
  entity_type: string;
  profiles?: {
    name?: string;
  } | null;
};

type OrderBatchLink = {
  id: string;
  order_item_id: string | null;
  purchase_batches?: {
    code?: string;
    id?: string;
    name?: string;
    status?: string;
  } | null;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  return {
    title: `Pedido ${id}`,
  };
}

function toNumber(value: number | string | null | undefined) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function safeDate(value: string | null | undefined) {
  return value ? formatDate(value) : "-";
}

function AdminOrderDetailErrorState() {
  return (
    <AdminShell title="Pedido" description="Detalhe operacional do pedido.">
      <p className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4 text-sm text-[var(--muted)]">
        Não foi possível carregar este pedido agora.
      </p>
    </AdminShell>
  );
}

export default async function AdminOrderDetailPage({ params }: Props) {
  const { id } = await params;
  const admin = await requireAdminPage();
  const orderService = new OrderService(undefined, admin.profile.id);

  let order: OrderDetail;

  try {
    order = (await orderService.getOrderById(id)) as unknown as OrderDetail;
  } catch (error) {
    if (error instanceof HttpError && error.status === 404) {
      notFound();
    }

    console.error("[AdminOrderDetailPage] failed to load order", { id, error });
    return <AdminOrderDetailErrorState />;
  }

  const [inventory, history, logs, batchLinks] = await Promise.all([
    new InventoryService(undefined, admin.profile.id).listInventory().catch((error) => {
      console.error("[AdminOrderDetailPage] failed to load inventory", { id, error });
      return [];
    }),
    orderService.listOrderStatusHistory(id).catch((error) => {
      console.error("[AdminOrderDetailPage] failed to load order history", { id, error });
      return [];
    }),
    orderService.listOrderAuditLogs(id).catch((error) => {
      console.error("[AdminOrderDetailPage] failed to load order audit logs", { id, error });
      return [];
    }),
    new PurchaseBatchService(undefined, admin.profile.id).listBatchItemsForOrder(id).catch((error) => {
      console.error("[AdminOrderDetailPage] failed to load batch links", { id, error });
      return [];
    }),
  ]);
  const batchByOrderItem = new Map(
    (batchLinks as unknown as OrderBatchLink[])
      .filter((link) => link.order_item_id)
      .map((link) => [link.order_item_id as string, link]),
  );

  const payments = order.payments ?? [];
  const paidAmount = payments
    .filter((payment) => payment.status === "paid")
    .reduce((sum, payment) => sum + toNumber(payment.amount), 0);
  const orderTotal = toNumber(order.total);
  const pendingAmount = Math.max(0, orderTotal - paidAmount);
  const defaultMaxInstallments = getDefaultOrderMaxInstallments(Math.round(orderTotal * 100));
  const publicLink = `${env.siteUrl}/pedido/${order.order_number}?token=${order.public_token}`;
  const reviewMeta = getOrderReviewStatusMeta(order.review_status);

  return (
    <AdminShell
      title={order.order_number}
      description="Detalhe operacional do pedido, pagamentos, historico e link publico."
    >
      <div className="grid gap-5">
        <section className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <OrderStatusBadge status={order.status ?? "draft"} />
                {order.review_status ? (
                  <span className={getStatusBadgeClassName(reviewMeta)}>{reviewMeta.label}</span>
                ) : null}
                <span className="rounded-md bg-[var(--surface-strong)] px-2 py-1 text-xs font-semibold text-[var(--muted)]">
                  {order.channel}
                </span>
              </div>
              <h2 className="mt-4 text-xl font-bold text-[var(--foreground)]">
                {order.customers?.name ?? "Cliente"}
              </h2>
              <p className="mt-1 text-sm text-[var(--muted)]">
                {order.customers?.email ?? "Sem e-mail"} · {order.customers?.phone ?? "Sem telefone"}
              </p>
              <p className="mt-2 text-sm font-semibold text-[var(--foreground)]">
                Vendedor: {getOrderSellerLabel(order.seller)}
              </p>
            </div>
            <div className="grid gap-1 text-sm md:text-right">
              <span>Criado em {safeDate(order.created_at)}</span>
              <span>Atualizado em {safeDate(order.updated_at)}</span>
            </div>
          </div>
        </section>

        <div className="grid gap-4 md:grid-cols-5">
          <MetricCard
            label="Subtotal"
            value={formatCurrency(toNumber(order.subtotal))}
            detail={order.coupon_code ? `Cupom ${order.coupon_code}` : "Antes de descontos"}
          />
          <MetricCard label="Desconto" value={formatCurrency(toNumber(order.discount))} detail="Aplicado no pedido" />
          <MetricCard label="Total" value={formatCurrency(orderTotal)} detail="Valor do pedido" />
          <MetricCard label="Pago" value={formatCurrency(paidAmount)} detail="Pagamentos confirmados" />
          <MetricCard label="Pendente" value={formatCurrency(pendingAmount)} detail="Saldo aberto" />
        </div>

        <section className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5">
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div>
              <h2 className="text-lg font-bold text-[var(--foreground)]">Análise do pedido</h2>
              <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                Status: <span className="font-semibold text-[var(--foreground)]">{reviewMeta.label}</span>
                {order.reviewed_at ? ` · revisado em ${safeDate(order.reviewed_at)}` : ""}
              </p>
              {order.rejected_reason ? (
                <p className="mt-2 rounded-md border border-red-300/25 bg-red-500/10 p-3 text-sm text-red-100">
                  Motivo da recusa: {order.rejected_reason}
                </p>
              ) : null}
              {order.review_notes ? (
                <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{order.review_notes}</p>
              ) : null}
              {order.payment_max_installments ? (
                <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                  Parcelamento aprovado:{" "}
                  <span className="font-semibold text-[var(--foreground)]">até {order.payment_max_installments}x</span>
                  {" · "}
                  Origem: {order.payment_max_installments_source === "admin_override" ? "ajuste manual" : "regra padrão"}
                </p>
              ) : null}
            </div>
            {order.payment_link_url ? (
              <div className="grid gap-1 text-sm md:max-w-md md:text-right">
                <span className="font-semibold text-[var(--foreground)]">InfinitePay</span>
                <a
                  href={order.payment_link_url}
                  target="_blank"
                  rel="noreferrer"
                  className="break-all text-[var(--accent)] hover:underline"
                >
                  {order.payment_link_url}
                </a>
                <span className="text-[var(--muted)]">
                  Ref. {order.payment_provider_reference ?? "-"}
                </span>
              </div>
            ) : null}
          </div>
        </section>

        <section className="overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--surface)]">
          <div className="border-b border-[var(--border)] p-5">
            <h2 className="text-lg font-bold text-[var(--foreground)]">Itens</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] text-left text-sm">
              <thead className="bg-[var(--surface-strong)] text-[var(--muted)]">
                <tr>
                  <th className="px-4 py-3">Produto</th>
                  <th className="px-4 py-3">SKU</th>
                  <th className="px-4 py-3">Origem</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Lote</th>
                  <th className="px-4 py-3">Qtd.</th>
                  <th className="px-4 py-3">Unitario</th>
                  <th className="px-4 py-3">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {(order.order_items ?? []).map((item) => {
                  const statusMeta = getOrderItemStatusMeta(item.status);
                  const batchLink = batchByOrderItem.get(item.id);
                  const batch = batchLink?.purchase_batches;

                  return (
                    <tr key={item.id}>
                      <td className="px-4 py-3 font-semibold text-[var(--foreground)]">
                        {item.product_variants?.products?.name ?? "Produto"}
                      </td>
                      <td className="px-4 py-3 text-[var(--muted)]">{item.product_variants?.sku ?? "-"}</td>
                      <td className="px-4 py-3 text-[var(--muted)]">{getOrderItemSourceLabel(item.source)}</td>
                      <td className="px-4 py-3" title={statusMeta.label}>
                        <OrderItemStatusBadge status={item.status} />
                      </td>
                      <td className="px-4 py-3">
                        {batch?.id ? (
                          <Link href={`/admin/lotes/${batch.id}`} className="grid gap-1 hover:text-[var(--accent)]">
                            <span className="font-semibold text-[var(--foreground)]">{batch.code}</span>
                            <span className="text-xs text-[var(--muted)]">{batch.name}</span>
                            <PurchaseBatchStatusBadge status={batch.status} />
                          </Link>
                        ) : (
                          <span className="text-[var(--muted)]">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-[var(--muted)]">{toNumber(item.quantity)}</td>
                      <td className="px-4 py-3 text-[var(--foreground)]">{formatCurrency(toNumber(item.unit_price))}</td>
                      <td className="px-4 py-3 text-[var(--foreground)]">{formatCurrency(toNumber(item.total_price))}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        <section className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5">
          <h2 className="text-lg font-bold text-[var(--foreground)]">Pagamentos</h2>
          <div className="mt-4 grid gap-3">
            {payments.length > 0 ? (
              payments.map((payment) => {
                const statusMeta = getPaymentStatusMeta(payment.status);

                return (
                  <div
                    key={payment.id}
                    className="grid gap-2 rounded-lg border border-[var(--border)] p-4 text-sm md:grid-cols-[1fr_auto]"
                  >
                    <div>
                      <strong className="text-[var(--foreground)]">{payment.method}</strong>
                      <p className="mt-1 flex flex-wrap items-center gap-2 text-[var(--muted)]">
                        <PaymentStatusBadge status={payment.status} />
                        <span>{payment.paid_at ? safeDate(payment.paid_at) : "Sem data de baixa"}</span>
                        <span title={statusMeta.label}>Taxa {formatCurrency(toNumber(payment.fee_amount))}</span>
                        <span>Líquido {formatCurrency(toNumber(payment.net_amount))}</span>
                      </p>
                    </div>
                    <span className="font-semibold text-[var(--foreground)]">{formatCurrency(toNumber(payment.amount))}</span>
                  </div>
                );
              })
            ) : (
              <p className="text-sm text-[var(--muted)]">Nenhum pagamento registrado.</p>
            )}
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2">
          <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5">
            <h2 className="text-lg font-bold text-[var(--foreground)]">Observacao publica</h2>
            <p className="mt-3 text-sm leading-6 text-[var(--muted)]">{order.notes || "Sem observacao publica."}</p>
          </div>
          <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5">
            <h2 className="text-lg font-bold text-[var(--foreground)]">Observacao interna</h2>
            <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
              {order.internal_notes || "Sem observacao interna."}
            </p>
          </div>
        </section>

        <OrderDetailActions
          customerId={order.customer_id}
          inventory={inventory as unknown as InventoryOption[]}
          items={(order.order_items ?? []).map((item) => ({ id: item.id, status: item.status }))}
          orderId={order.id}
          orderTotal={orderTotal}
          paidAmount={paidAmount}
          pendingAmount={pendingAmount}
          defaultMaxInstallments={defaultMaxInstallments}
          paymentMaxInstallments={order.payment_max_installments}
          paymentMaxInstallmentsSource={order.payment_max_installments_source}
          paymentLinkUrl={order.payment_link_url}
          publicLink={publicLink}
          reviewStatus={order.review_status}
          seller={order.seller}
        />

        <section className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5">
            <h2 className="text-lg font-bold text-[var(--foreground)]">Historico de status</h2>
            <div className="mt-4 grid gap-3">
              {(history as unknown as HistoryItem[]).map((entry) => (
                <div key={entry.id} className="rounded-lg border border-[var(--border)] p-3 text-sm">
                  <strong className="text-[var(--foreground)]">
                    {entry.previous_status ? getOperationalStatusMeta(entry.previous_status).label : "Inicio"} {"->"}{" "}
                    {getOperationalStatusMeta(entry.new_status).label}
                  </strong>
                  <p className="mt-1 text-[var(--muted)]">
                    {safeDate(entry.created_at)} · {entry.profiles?.name ?? "Sistema"}
                  </p>
                  {entry.notes ? <p className="mt-1 text-[var(--muted)]">{entry.notes}</p> : null}
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5">
            <h2 className="text-lg font-bold text-[var(--foreground)]">Logs administrativos</h2>
            <div className="mt-4 grid gap-3">
              {(logs as unknown as AuditLogItem[]).map((entry) => (
                <div key={entry.id} className="rounded-lg border border-[var(--border)] p-3 text-sm">
                  <strong className="text-[var(--foreground)]">{entry.action}</strong>
                  <p className="mt-1 text-[var(--muted)]">
                    {entry.entity_type} · {safeDate(entry.created_at)} · {entry.profiles?.name ?? "Sistema"}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </AdminShell>
  );
}
