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
import {
  getOperationalStatusMeta,
  getOrderItemStatusMeta,
  getPaymentStatusMeta,
} from "@/lib/status-labels";
import { requireAdminPage } from "@/server/auth/require-admin-page";
import { InventoryService } from "@/server/inventory/inventory-service";
import { OrderService } from "@/server/orders/order-service";
import { PurchaseBatchService } from "@/server/purchase-batches/purchase-batch-service";

type Props = {
  params: Promise<{ id: string }>;
};

type OrderDetail = {
  id: string;
  order_number: string;
  customer_id: string;
  channel: string;
  status: string;
  subtotal: number;
  discount: number;
  shipping_amount: number;
  total: number;
  public_token: string;
  public_tracking_enabled: boolean;
  notes: string | null;
  internal_notes: string | null;
  created_at: string;
  updated_at: string;
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
  quantity: number;
  source: string;
  status: string;
  total_price: number;
  unit_price: number;
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
  amount: number;
  fee_amount: number;
  method: string;
  net_amount: number;
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

const sourceLabels: Record<string, string> = {
  international_order: "Importado",
  national_order: "Encomenda nacional",
  preorder: "Pré-venda",
  stock: "Pronta-entrega",
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  return {
    title: `Pedido ${id}`,
  };
}

export default async function AdminOrderDetailPage({ params }: Props) {
  const { id } = await params;
  const admin = await requireAdminPage();
  const orderService = new OrderService(undefined, admin.profile.id);

  let order: OrderDetail;

  try {
    order = (await orderService.getOrderById(id)) as unknown as OrderDetail;
  } catch {
    notFound();
  }

  const [inventory, history, logs, batchLinks] = await Promise.all([
    new InventoryService(undefined, admin.profile.id).listInventory(),
    orderService.listOrderStatusHistory(id),
    orderService.listOrderAuditLogs(id),
    new PurchaseBatchService(undefined, admin.profile.id).listBatchItemsForOrder(id),
  ]);
  const batchByOrderItem = new Map(
    (batchLinks as unknown as OrderBatchLink[])
      .filter((link) => link.order_item_id)
      .map((link) => [link.order_item_id as string, link]),
  );

  const payments = order.payments ?? [];
  const paidAmount = payments
    .filter((payment) => payment.status === "paid")
    .reduce((sum, payment) => sum + Number(payment.amount), 0);
  const pendingAmount = Math.max(0, Number(order.total) - paidAmount);
  const publicLink = `${env.siteUrl}/pedido/${order.order_number}?token=${order.public_token}`;

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
                <OrderStatusBadge status={order.status} />
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
            </div>
            <div className="grid gap-1 text-sm md:text-right">
              <span>Criado em {formatDate(order.created_at)}</span>
              <span>Atualizado em {formatDate(order.updated_at)}</span>
            </div>
          </div>
        </section>

        <div className="grid gap-4 md:grid-cols-4">
          <MetricCard label="Total" value={formatCurrency(order.total)} detail="Valor do pedido" />
          <MetricCard label="Pago" value={formatCurrency(paidAmount)} detail="Pagamentos confirmados" />
          <MetricCard label="Pendente" value={formatCurrency(pendingAmount)} detail="Saldo aberto" />
          <MetricCard label="Itens" value={`${order.order_items?.length ?? 0}`} detail="Unidades no pedido" />
        </div>

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
                      <td className="px-4 py-3 text-[var(--muted)]">{sourceLabels[item.source] ?? item.source}</td>
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
                      <td className="px-4 py-3 text-[var(--muted)]">{item.quantity}</td>
                      <td className="px-4 py-3 text-[var(--foreground)]">{formatCurrency(item.unit_price)}</td>
                      <td className="px-4 py-3 text-[var(--foreground)]">{formatCurrency(item.total_price)}</td>
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
                        <span>{payment.paid_at ? formatDate(payment.paid_at) : "Sem data de baixa"}</span>
                        <span title={statusMeta.label}>Taxa {formatCurrency(payment.fee_amount)}</span>
                        <span>Líquido {formatCurrency(payment.net_amount)}</span>
                      </p>
                    </div>
                    <span className="font-semibold text-[var(--foreground)]">{formatCurrency(payment.amount)}</span>
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
          orderTotal={Number(order.total)}
          paidAmount={paidAmount}
          pendingAmount={pendingAmount}
          publicLink={publicLink}
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
                    {formatDate(entry.created_at)} · {entry.profiles?.name ?? "Sistema"}
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
                    {entry.entity_type} · {formatDate(entry.created_at)} · {entry.profiles?.name ?? "Sistema"}
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
