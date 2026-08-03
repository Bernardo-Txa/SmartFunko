import type { Metadata } from "next";
import { OrdersV2PaymentPanel, type CustomerOrderV2 } from "@/components/account/orders-v2-payment-panel";
import { requireUserPage } from "@/server/auth/require-user-page";
import { OrderV2Service } from "@/server/orders-v2/order-v2-service";

export const metadata: Metadata = {
  title: "Meus pedidos V2",
};

export default async function CustomerOrdersV2Page() {
  const { customer, profile } = await requireUserPage("/conta/pedidos-v2");
  const orders = customer
    ? await new OrderV2Service().getCustomerOrders(customer.id) as unknown as CustomerOrderV2[]
    : [];

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-[var(--foreground)]">Meus pedidos</h1>
        <p className="mt-2 text-sm text-[var(--muted)]">
          {profile.name} · pedidos agrupados por competencia.
        </p>
      </div>
      <OrdersV2PaymentPanel orders={orders} />
    </div>
  );
}
