import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { OrderDetail } from "@/components/product/order-detail";
import { AssistedCheckoutService } from "@/server/checkout/assisted-checkout-service";
import { OrderService } from "@/server/orders/order-service";

type Props = {
  params: Promise<{ orderNumber: string }>;
  searchParams: Promise<{
    capture_method?: string;
    order_nsu?: string;
    receipt_url?: string;
    slug?: string;
    token?: string;
    transaction_nsu?: string;
  }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { orderNumber } = await params;
  return {
    title: `Acompanhamento ${orderNumber}`,
  };
}

export default async function PublicOrderPage({ params, searchParams }: Props) {
  const { orderNumber } = await params;
  const query = await searchParams;
  const { token } = query;

  if (!token) {
    notFound();
  }

  let order;

  if (query.slug || query.transaction_nsu || query.receipt_url) {
    try {
      await new AssistedCheckoutService().checkInfinitePayPaymentForPublicOrder(
        orderNumber,
        token,
        {
          slug: query.slug ?? null,
          transactionNsu: query.transaction_nsu ?? null,
        },
      );
    } catch (error) {
      console.error("Falha ao consultar retorno InfinitePay", error);
    }
  }

  try {
    order = await new OrderService().getPublicOrderByNumberAndToken(orderNumber, token);
  } catch {
    notFound();
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-4 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4 text-sm text-[var(--muted)]">
        Link publico com token. Dados sensiveis ficam fora desta visualizacao.
      </div>
      <OrderDetail order={order} />
    </div>
  );
}
