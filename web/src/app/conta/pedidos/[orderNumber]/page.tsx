import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { OrderDetail } from "@/components/product/order-detail";
import { getOrderByNumber } from "@/lib/mock-data";

type Props = {
  params: Promise<{ orderNumber: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { orderNumber } = await params;
  return {
    title: `Pedido ${orderNumber}`,
  };
}

export default async function AccountOrderPage({ params }: Props) {
  const { orderNumber } = await params;
  const order = getOrderByNumber(orderNumber);

  if (!order) {
    notFound();
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <OrderDetail order={order} />
    </div>
  );
}
