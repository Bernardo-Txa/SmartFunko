import { OrderItemStatusBadge, OrderStatusBadge, PaymentStatusBadge } from "@/components/ui/status-badge";
import { formatCurrency, formatDate } from "@/lib/format";

export type OrderDetailData = {
  orderNumber: string;
  customerName: string;
  status: string;
  total: number;
  paidAmount: number;
  pendingAmount?: number;
  notes?: string | null;
  payments?: Array<{
    amount: number;
    createdAt?: string | null;
    method: string;
    paidAt?: string | null;
    status: string;
  }>;
  updatedAt: string;
  items: Array<{
    name: string;
    sku: string;
    status: string;
    quantity: number;
    unitPrice: number;
  }>;
};

const paymentMethodLabels: Record<string, string> = {
  cash: "Dinheiro",
  credit_card: "Crédito",
  debit_card: "Débito",
  manual: "Manual",
  pix: "Pix",
};

export function OrderDetail({ order }: { order: OrderDetailData }) {
  const pendingAmount = order.pendingAmount ?? order.total - order.paidAmount;

  return (
    <section className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5">
      <div className="flex flex-col gap-4 border-b border-[var(--border)] pb-5 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold text-[var(--foreground)]">
              {order.orderNumber}
            </h1>
            <OrderStatusBadge status={order.status} />
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
              <OrderItemStatusBadge status={item.status} />
              <strong className="text-sm text-[var(--foreground)]">
                {formatCurrency(item.unitPrice)}
              </strong>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <section className="rounded-lg border border-[var(--border)] p-4">
          <h2 className="text-sm font-bold text-[var(--foreground)]">Pagamentos</h2>
          <div className="mt-3 grid gap-3">
            {(order.payments ?? []).length > 0 ? (
              (order.payments ?? []).map((payment, index) => (
                <div
                  key={`${order.orderNumber}-payment-${index}`}
                  className="flex flex-col gap-2 rounded-md border border-[var(--border)] p-3 text-sm sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <strong className="text-[var(--foreground)]">
                      {paymentMethodLabels[payment.method] ?? payment.method}
                    </strong>
                    <p className="mt-1 text-xs text-[var(--muted)]">
                      {payment.paidAt
                        ? formatDate(payment.paidAt)
                        : payment.createdAt
                          ? formatDate(payment.createdAt)
                          : "Sem data registrada"}
                    </p>
                  </div>
                  <div className="flex items-center justify-between gap-3 sm:justify-end">
                    <PaymentStatusBadge status={payment.status} />
                    <strong className="text-sm text-[var(--foreground)]">
                      {formatCurrency(payment.amount)}
                    </strong>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-[var(--muted)]">Nenhum pagamento registrado.</p>
            )}
          </div>
        </section>

        <section className="rounded-lg border border-[var(--border)] p-4">
          <h2 className="text-sm font-bold text-[var(--foreground)]">Observações</h2>
          <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
            {order.notes || "Nenhuma observação pública registrada."}
          </p>
        </section>
      </div>
    </section>
  );
}
