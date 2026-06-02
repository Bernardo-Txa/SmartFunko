import { OrderStatusBadge } from "@/components/ui/status-badge";
import { formatCurrency, formatDate } from "@/lib/format";
import type { CustomerOrder } from "@/lib/mock-data";

const labels = {
  pending_payment: "Aguardando pagamento",
  paid: "Pago",
  processing: "Em separacao",
  ready_to_ship: "Pronto para envio",
  shipped: "Enviado",
};

export function OrderDetail({ order }: { order: CustomerOrder }) {
  const pendingAmount = order.total - order.paidAmount;

  return (
    <section className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5">
      <div className="flex flex-col gap-4 border-b border-[var(--border)] pb-5 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold text-[var(--foreground)]">
              {order.orderNumber}
            </h1>
            <OrderStatusBadge label={labels[order.status]} />
          </div>
          <p className="mt-2 text-sm text-[var(--muted)]">
            {order.customerName} · atualizado em {formatDate(order.updatedAt)}
          </p>
        </div>
        <div className="grid gap-2 text-sm md:text-right">
          <span>Total: {formatCurrency(order.total)}</span>
          <span>Pago: {formatCurrency(order.paidAmount)}</span>
          <strong className="text-[var(--foreground)]">
            Pendente: {formatCurrency(pendingAmount)}
          </strong>
        </div>
      </div>

      <div className="mt-5 space-y-3">
        {order.items.map((item) => (
          <div
            key={`${order.orderNumber}-${item.sku}`}
            className="grid gap-3 rounded-lg border border-[var(--border)] p-4 md:grid-cols-[1fr_auto]"
          >
            <div>
              <strong className="block text-sm text-[var(--foreground)]">{item.name}</strong>
              <span className="mt-1 block text-xs text-[var(--muted)]">
                {item.sku} · {item.quantity} unidade(s)
              </span>
            </div>
            <div className="flex items-center justify-between gap-4 md:justify-end">
              <OrderStatusBadge label={item.status} />
              <strong className="text-sm text-[var(--foreground)]">
                {formatCurrency(item.unitPrice)}
              </strong>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
