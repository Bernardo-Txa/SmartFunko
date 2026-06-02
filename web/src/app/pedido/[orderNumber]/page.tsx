import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { OrderDetail } from "@/components/product/order-detail";
import { getOrderByNumber } from "@/lib/mock-data";

type Props = {
  params: Promise<{ orderNumber: string }>;
  searchParams: Promise<{ token?: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { orderNumber } = await params;
  return {
    title: `Acompanhamento ${orderNumber}`,
  };
}

export default async function PublicOrderPage({ params, searchParams }: Props) {
  const { orderNumber } = await params;
  const { token } = await searchParams;
  const order = getOrderByNumber(orderNumber);

  if (!order || !token) {
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
