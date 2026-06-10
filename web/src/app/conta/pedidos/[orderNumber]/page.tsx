import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { OrderDetail, type OrderDetailData } from "@/components/product/order-detail";
import { requireUserPage } from "@/server/auth/require-user-page";
import { OrderService } from "@/server/orders/order-service";

type Props = {
  params: Promise<{ orderNumber: string }>;
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

export default async function AccountOrderPage({ params }: Props) {
  const { orderNumber } = await params;
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

  const payments = order.payments ?? [];
  const paidAmount = payments
    .filter((payment) => payment.status === "paid")
    .reduce((sum, payment) => sum + Number(payment.amount), 0);
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
    pendingAmount: Math.max(0, Number(order.total) - paidAmount),
    paymentLinkUrl: order.payment_link_url,
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
