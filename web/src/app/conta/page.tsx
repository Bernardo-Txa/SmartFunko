import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Package, UserRound } from "lucide-react";
import { formatCurrency } from "@/lib/format";
import { requireUserPage } from "@/server/auth/require-user-page";
import { OrderService } from "@/server/orders/order-service";

export const metadata: Metadata = {
  title: "Minha conta",
};

type AccountOrder = {
  total: number;
  payments?: Array<{
    amount: number;
    status: string;
  }>;
};

function getPaidAmount(order: AccountOrder) {
  return (order.payments ?? [])
    .filter((payment) => payment.status === "paid")
    .reduce((sum, payment) => sum + Number(payment.amount), 0);
}

export default async function AccountPage() {
  const { customer, profile } = await requireUserPage();
  const orders = customer
    ? ((await new OrderService().getCustomerOrders(customer.id)) as unknown as AccountOrder[])
    : [];
  const totalOpen = orders.reduce(
    (sum, order) => sum + Math.max(0, Number(order.total) - getPaidAmount(order)),
    0,
  );

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-[var(--foreground)]">Minha conta</h1>
        <p className="mt-2 text-sm text-[var(--muted)]">
          {profile.name} · {profile.email}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <section className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5">
          <UserRound className="text-[var(--accent)]" size={24} />
          <strong className="mt-4 block text-sm">Cadastro</strong>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Nome, e-mail e telefone vinculados aos pedidos manuais.
          </p>
        </section>
        <section className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5">
          <Package className="text-[var(--pink)]" size={24} />
          <strong className="mt-4 block text-sm">{orders.length} pedidos</strong>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Historico do atendimento pelo WhatsApp.
          </p>
        </section>
        <section className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5">
          <strong className="block text-2xl text-[var(--foreground)]">
            {formatCurrency(totalOpen)}
          </strong>
          <p className="mt-1 text-sm text-[var(--muted)]">Pendente a pagar</p>
        </section>
      </div>

      <Link
        href="/conta/pedidos"
        className="mt-6 inline-flex h-11 items-center gap-2 rounded-full bg-[var(--yellow)] px-5 text-sm font-black text-[#020617] shadow-[0_0_22px_rgba(250,204,21,0.22)] hover:brightness-110"
      >
        Ver meus pedidos
        <ArrowRight size={17} aria-hidden="true" />
      </Link>
    </div>
  );
}
