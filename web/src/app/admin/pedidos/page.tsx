import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";
import { AdminShell } from "@/components/admin/admin-shell";
import { OrderStatusBadge } from "@/components/ui/status-badge";
import { formatCurrency, formatDate } from "@/lib/format";
import { getOrderSellerLabel, orderSellerOptions } from "@/lib/order-labels";
import { getOrderReviewStatusMeta, getStatusBadgeClassName, orderReviewStatusOptions, orderStatusOptions } from "@/lib/status-labels";
import { requireAdminPage } from "@/server/auth/require-admin-page";
import { OrderService } from "@/server/orders/order-service";

export const metadata: Metadata = {
  title: "Pedidos admin",
};

const channels = {
  admin: "Admin",
  preorder: "Pré-venda",
  website: "Site",
  whatsapp: "WhatsApp",
};

type AdminOrder = {
  channel: keyof typeof channels;
  created_at: string | null;
  id: string;
  order_number: string;
  review_status: string | null;
  seller: string | null;
  status: string | null;
  total: number | string | null;
  customers?: {
    name?: string;
  } | null;
  payments?: Array<{
    amount: number | string | null;
    status: string | null;
  }> | null;
};

type Props = {
  searchParams?: Promise<{
    channel?: string;
    q?: string;
    seller?: string;
    reviewStatus?: string;
    status?: string;
  }>;
};

function getParam(value: string | undefined) {
  return value?.trim() ?? "";
}

function toNumber(value: number | string | null | undefined) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function safeDate(value: string | null | undefined) {
  return value ? formatDate(value) : "-";
}

export default async function AdminOrdersPage({ searchParams }: Props) {
  const admin = await requireAdminPage();
  const params = await searchParams;
  const channel = getParam(params?.channel);
  const search = getParam(params?.q);
  const seller = getParam(params?.seller);
  const reviewStatus = getParam(params?.reviewStatus);
  const status = getParam(params?.status);
  let orders: AdminOrder[] = [];
  let loadError = false;

  try {
    orders = (await new OrderService(
      undefined,
      admin.profile.id,
    ).listOrders({
      channel: channel || undefined,
      search: search || undefined,
      seller: seller || undefined,
      reviewStatus: reviewStatus || undefined,
      status: status || undefined,
    })) as unknown as AdminOrder[];
  } catch (error) {
    loadError = true;
    console.error("[AdminOrdersPage] failed to load orders", error);
  }

  return (
    <AdminShell title="Pedidos" description="Pedidos manuais e pedidos enviados pelo carrinho assistido.">
      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <form className="grid gap-3 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4 md:grid-cols-[minmax(180px,1fr)_150px_170px_150px_150px_auto] md:items-end">
          <label className="block">
            <span className="text-sm font-semibold text-[var(--foreground)]">Busca</span>
            <input
              name="q"
              defaultValue={search}
              placeholder="Pedido ou cliente"
              className="mt-2 h-11 w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 text-sm outline-none focus:border-[var(--accent)]"
            />
          </label>
          <label className="block">
            <span className="text-sm font-semibold text-[var(--foreground)]">Análise</span>
            <select
              name="reviewStatus"
              defaultValue={reviewStatus}
              className="mt-2 h-11 w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 text-sm outline-none focus:border-[var(--accent)]"
            >
              <option value="">Todas</option>
              {orderReviewStatusOptions.map(({ label, value }) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-sm font-semibold text-[var(--foreground)]">Status</span>
            <select
              name="status"
              defaultValue={status}
              className="mt-2 h-11 w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 text-sm outline-none focus:border-[var(--accent)]"
            >
              <option value="">Todos</option>
              {orderStatusOptions.map(({ label, value }) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-sm font-semibold text-[var(--foreground)]">Canal</span>
            <select
              name="channel"
              defaultValue={channel}
              className="mt-2 h-11 w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 text-sm outline-none focus:border-[var(--accent)]"
            >
              <option value="">Todos</option>
              {Object.entries(channels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-sm font-semibold text-[var(--foreground)]">Vendedor</span>
            <select
              name="seller"
              defaultValue={seller}
              className="mt-2 h-11 w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 text-sm outline-none focus:border-[var(--accent)]"
            >
              <option value="">Todos</option>
              {orderSellerOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <button className="h-11 rounded-md bg-[var(--accent)] px-4 text-sm font-black text-[#020617] hover:brightness-110">
            Filtrar
          </button>
        </form>
        <Link
          href="/admin/pedidos/novo"
          className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-md bg-[var(--accent)] px-4 text-sm font-black text-[#020617] hover:brightness-110"
        >
          <Plus size={16} />
          Novo pedido
        </Link>
      </div>
      <div className="overflow-x-auto rounded-lg border border-[var(--border)] bg-[var(--surface)]">
        <table className="w-full min-w-[820px] text-left text-sm">
          <thead className="bg-[var(--surface-strong)] text-[var(--muted)]">
            <tr>
              <th className="px-4 py-3">Pedido</th>
              <th className="px-4 py-3">Cliente</th>
              <th className="px-4 py-3">Canal</th>
              <th className="px-4 py-3">Vendedor</th>
              <th className="px-4 py-3">Total</th>
              <th className="px-4 py-3">Pago</th>
              <th className="px-4 py-3">Pendente</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Análise</th>
              <th className="px-4 py-3">Data</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border)]">
            {!loadError && orders.map((order) => {
              const paidAmount = (order.payments ?? [])
                .filter((payment) => payment.status === "paid")
                .reduce((sum, payment) => sum + toNumber(payment.amount), 0);
              const total = toNumber(order.total);
              const pendingAmount = Math.max(0, total - paidAmount);
              const reviewMeta = getOrderReviewStatusMeta(order.review_status);
              const statusValue = order.status ?? "draft";

              return (
                <tr key={order.id} className={order.review_status === "under_review" ? "bg-yellow-300/8" : undefined}>
                  <td className="px-4 py-3 font-semibold text-[var(--foreground)]">
                    <Link href={`/admin/pedidos/${order.id}`} className="hover:text-[var(--accent)]">
                      {order.order_number}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-[var(--muted)]">{order.customers?.name ?? "Cliente"}</td>
                  <td className="px-4 py-3 text-[var(--muted)]">{channels[order.channel] ?? order.channel}</td>
                  <td className="px-4 py-3 text-[var(--muted)]">{getOrderSellerLabel(order.seller)}</td>
                  <td className="px-4 py-3 text-[var(--foreground)]">{formatCurrency(total)}</td>
                  <td className="px-4 py-3 text-[var(--muted)]">{formatCurrency(paidAmount)}</td>
                  <td className="px-4 py-3 text-[var(--muted)]">{formatCurrency(pendingAmount)}</td>
                  <td className="px-4 py-3">
                    <OrderStatusBadge status={statusValue} />
                  </td>
                  <td className="px-4 py-3">
                    {order.review_status ? (
                      <span className={getStatusBadgeClassName(reviewMeta)}>{reviewMeta.label}</span>
                    ) : (
                      <span className="text-[var(--muted)]">-</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-[var(--muted)]">{safeDate(order.created_at)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {loadError ? (
        <p className="mt-4 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4 text-sm text-[var(--muted)]">
          Não foi possível carregar os pedidos agora.
        </p>
      ) : orders.length === 0 ? (
        <p className="mt-4 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4 text-sm text-[var(--muted)]">
          Nenhum pedido encontrado com os filtros atuais.
        </p>
      ) : null}
    </AdminShell>
  );
}
