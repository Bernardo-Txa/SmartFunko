import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { OrderDetail, type OrderDetailData } from "@/components/product/order-detail";
import { getOrderPaidAmount, getOrderPendingAmount, isOrderPayable } from "@/lib/orders/payable";
import { requireUserPage } from "@/server/auth/require-user-page";
import { AssistedCheckoutService } from "@/server/checkout/assisted-checkout-service";
import { OrderService } from "@/server/orders/order-service";

type Props = {
  params: Promise<{ orderNumber: string }>;
  searchParams?: Promise<{
    capture_method?: string;
    order_nsu?: string;
    receipt_url?: string;
    slug?: string;
    transaction_nsu?: string;
  }>;
};

type AccountOrderItem = {
  product_variants?: {
    sku?: string;
    products?: {
      name?: string;
    } | null;
  } | null;
  quantity: number;
  source: string;
  status: string;
  unit_price: number;
};

type AccountOrderDetail = {
  id: string;
  customers?: {
    name?: string;
  } | null;
  order_items?: AccountOrderItem[];
  order_number: string;
  payment_link_url: string | null;
  rejected_reason: string | null;
  review_notes: string | null;
  review_status: string | null;
  seller: string | null;
  notes: string | null;
  payments?: Array<{
    amount: number;
    created_at: string;
    method: string;
    paid_at: string | null;
    status: string;
  }>;
  status: string;
  total: number;
  updated_at: string;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { orderNumber } = await params;
  return {
    title: `Pedido ${orderNumber}`,
  };
}

export default async function AccountOrderPage({ params, searchParams }: Props) {
  const { orderNumber } = await params;
  const query = await searchParams;
  const { customer } = await requireUserPage(`/conta/pedidos/${orderNumber}`);

  if (!customer) {
    notFound();
  }

  let order: AccountOrderDetail;

  try {
    order = (await new OrderService().getCustomerOrderByNumber(
      customer.id,
      orderNumber,
    )) as unknown as AccountOrderDetail;
  } catch {
    notFound();
  }

  if (query?.slug || query?.transaction_nsu || query?.receipt_url) {
    try {
      await new AssistedCheckoutService().checkInfinitePayPaymentForOrder(
        order.id,
        null,
        {
          slug: query.slug ?? null,
          transactionNsu: query.transaction_nsu ?? null,
        },
      );
      order = (await new OrderService().getCustomerOrderByNumber(
        customer.id,
        orderNumber,
      )) as unknown as AccountOrderDetail;
    } catch (error) {
      console.error("Falha ao consultar retorno InfinitePay autenticado", error);
    }
  }

  const payments = order.payments ?? [];
  const paidAmount = getOrderPaidAmount(order);
  const pendingAmount = getOrderPendingAmount(order);
  const payable = isOrderPayable(order);
  const detail: OrderDetailData = {
    customerName: order.customers?.name ?? "Cliente",
    items: ((order.order_items ?? []) as AccountOrderItem[]).map((item) => ({
      name: item.product_variants?.products?.name ?? "Produto",
      quantity: item.quantity,
      sku: item.product_variants?.sku ?? "-",
      source: item.source,
      status: item.status,
      unitPrice: item.unit_price,
    })),
    orderNumber: order.order_number,
    notes: order.notes,
    paidAmount,
    pendingAmount,
    paymentLinkUrl: payable ? order.payment_link_url : null,
    payments: payments.map((payment) => ({
      amount: payment.amount,
      createdAt: payment.created_at,
      method: payment.method,
      paidAt: payment.paid_at,
      status: payment.status,
    })),
    rejectedReason: order.rejected_reason,
    reviewNotes: order.review_notes,
    reviewStatus: order.review_status,
    seller: order.seller,
    status: order.status,
    total: order.total,
    updatedAt: order.updated_at,
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <OrderDetail order={detail} />
    </div>
  );
}
