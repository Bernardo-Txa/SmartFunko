import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";
import { AdminShell } from "@/components/admin/admin-shell";
import { OrderStatusBadge } from "@/components/ui/status-badge";
import { formatCurrency, formatDate } from "@/lib/format";
import { orderStatusOptions } from "@/lib/status-labels";
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
  created_at: string;
  id: string;
  order_number: string;
  status: string;
  total: number;
  customers?: {
    name?: string;
  } | null;
  payments?: Array<{
    amount: number;
    status: string;
  }>;
};

type Props = {
  searchParams?: Promise<{
    channel?: string;
    q?: string;
    status?: string;
  }>;
};

function getParam(value: string | undefined) {
  return value?.trim() ?? "";
}

export default async function AdminOrdersPage({ searchParams }: Props) {
  const admin = await requireAdminPage();
  const params = await searchParams;
  const channel = getParam(params?.channel);
  const search = getParam(params?.q);
  const status = getParam(params?.status);
  const orders = (await new OrderService(
    undefined,
    admin.profile.id,
  ).listOrders({
    channel: channel || undefined,
    search: search || undefined,
    status: status || undefined,
  })) as unknown as AdminOrder[];

  return (
    <AdminShell title="Pedidos" description="Pedidos manuais criados a partir do WhatsApp.">
      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <form className="grid gap-3 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4 md:grid-cols-[minmax(180px,1fr)_170px_170px_auto] md:items-end">
          <label className="block">
            <span className="text-sm font-semibold text-[var(--foreground)]">Busca</span>
            <input
              name="q"
              defaultValue={search}
              placeholder="Pedido ou cliente"
              className="mt-2 h-10 w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 text-sm outline-none focus:border-[var(--accent)]"
            />
          </label>
          <label className="block">
            <span className="text-sm font-semibold text-[var(--foreground)]">Status</span>
            <select
              name="status"
              defaultValue={status}
              className="mt-2 h-10 w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 text-sm outline-none focus:border-[var(--accent)]"
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
              className="mt-2 h-10 w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 text-sm outline-none focus:border-[var(--accent)]"
            >
              <option value="">Todos</option>
              {Object.entries(channels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <button className="h-10 rounded-md bg-[var(--accent)] px-4 text-sm font-black text-[#020617] hover:brightness-110">
            Filtrar
          </button>
        </form>
        <Link
          href="/admin/pedidos/novo"
          className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-md bg-[var(--accent)] px-4 text-sm font-black text-[#020617] hover:brightness-110"
        >
          <Plus size={16} />
          Novo pedido
        </Link>
      </div>
      <div className="overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--surface)]">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="bg-[var(--surface-strong)] text-[var(--muted)]">
            <tr>
              <th className="px-4 py-3">Pedido</th>
              <th className="px-4 py-3">Cliente</th>
              <th className="px-4 py-3">Canal</th>
              <th className="px-4 py-3">Total</th>
              <th className="px-4 py-3">Pago</th>
              <th className="px-4 py-3">Pendente</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Data</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border)]">
            {orders.map((order) => {
              const paidAmount = (order.payments ?? [])
                .filter((payment) => payment.status === "paid")
                .reduce((sum, payment) => sum + Number(payment.amount), 0);
              const pendingAmount = Math.max(0, Number(order.total) - paidAmount);

              return (
                <tr key={order.id}>
                  <td className="px-4 py-3 font-semibold text-[var(--foreground)]">
                    <Link href={`/admin/pedidos/${order.id}`} className="hover:text-[var(--accent)]">
                      {order.order_number}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-[var(--muted)]">{order.customers?.name ?? "Cliente"}</td>
                  <td className="px-4 py-3 text-[var(--muted)]">{channels[order.channel] ?? order.channel}</td>
                  <td className="px-4 py-3 text-[var(--foreground)]">{formatCurrency(order.total)}</td>
                  <td className="px-4 py-3 text-[var(--muted)]">{formatCurrency(paidAmount)}</td>
                  <td className="px-4 py-3 text-[var(--muted)]">{formatCurrency(pendingAmount)}</td>
                  <td className="px-4 py-3">
                    <OrderStatusBadge status={order.status} />
                  </td>
                  <td className="px-4 py-3 text-[var(--muted)]">{formatDate(order.created_at)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {orders.length === 0 ? (
        <p className="mt-4 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4 text-sm text-[var(--muted)]">
          Nenhum pedido encontrado com os filtros atuais.
        </p>
      ) : null}
    </AdminShell>
  );
}
