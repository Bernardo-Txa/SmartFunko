import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Gem, Heart, Package, Ticket } from "lucide-react";
import { isRafflesEnabled, isRewardsEnabled } from "@/lib/env";
import { formatCurrency } from "@/lib/format";
import { getOrderPendingAmount } from "@/lib/orders/payable";
import { requireUserPage } from "@/server/auth/require-user-page";
import { OrderService } from "@/server/orders/order-service";
import { AccountProfileForm } from "@/components/account/account-profile-form";

export const metadata: Metadata = {
  title: "Minha conta",
};

type AccountOrder = {
  review_status?: string | null;
  status?: string | null;
  total: number;
  payments?: Array<{
    amount: number;
    status: string;
  }>;
};

export default async function AccountPage() {
  const { customer, profile } = await requireUserPage("/conta");
  const orders = customer
    ? ((await new OrderService().getCustomerOrders(customer.id)) as unknown as AccountOrder[])
    : [];
  const totalOpen = orders.reduce((sum, order) => sum + getOrderPendingAmount(order), 0);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-[var(--foreground)]">Minha conta</h1>
        <p className="mt-2 text-sm text-[var(--muted)]">
          {profile.name} · {profile.email}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <AccountProfileForm
          customer={customer}
          email={customer?.email ?? profile.email}
          fallbackName={profile.name}
        />
        <section className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5">
          <Package className="text-[var(--pink)]" size={24} />
          <strong className="mt-4 block text-sm">{orders.length} pedidos</strong>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Historico do atendimento pelo WhatsApp.
          </p>
        </section>
        <Link
          href="/conta/wishlist"
          className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5 hover:bg-cyan-400/10"
        >
          <Heart className="text-pink-200" size={24} />
          <strong className="mt-4 block text-sm">Favoritos</strong>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Lista de desejos e produtos acompanhados.
          </p>
        </Link>
        {isRewardsEnabled() ? (
          <Link
            href="/conta/clube"
            className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5 hover:bg-cyan-400/10"
          >
            <Gem className="text-[var(--accent)]" size={24} />
            <strong className="mt-4 block text-sm">Clube Smart Funkos</strong>
            <p className="mt-1 text-sm text-[var(--muted)]">
              Pontos, níveis e ranking mensal de pedidos.
            </p>
          </Link>
        ) : null}
        {isRafflesEnabled() ? (
          <Link
            href="/conta/rifas"
            className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5 hover:bg-cyan-400/10"
          >
            <Ticket className="text-[var(--accent)]" size={24} />
            <strong className="mt-4 block text-sm">Rifas</strong>
            <p className="mt-1 text-sm text-[var(--muted)]">
              Reservas, numeros e resultados das campanhas.
            </p>
          </Link>
        ) : null}
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
