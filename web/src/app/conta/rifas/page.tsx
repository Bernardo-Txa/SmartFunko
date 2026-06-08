import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { RaffleExperimentalNotice } from "@/components/raffles/raffle-experimental-notice";
import type { RaffleOrder } from "@/components/raffles/raffle-types";
import { RaffleOrderStatusBadge } from "@/components/ui/status-badge";
import { isRafflesEnabled } from "@/lib/env";
import { formatCurrency } from "@/lib/format";
import { requireUserPage } from "@/server/auth/require-user-page";
import { RaffleService } from "@/server/raffles/raffle-service";

export const metadata: Metadata = {
  title: "Minhas rifas",
};

function formatDateTime(value: string | null | undefined) {
  if (!value) {
    return "-";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}

function numbersText(order: RaffleOrder) {
  return (order.raffle_numbers ?? []).map((number) => number.label).join(", ") || "-";
}

export default async function AccountRafflesPage() {
  if (!isRafflesEnabled()) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5">
          <h1 className="text-2xl font-bold text-[var(--foreground)]">Módulo de rifas desativado</h1>
          <p className="mt-2 text-sm text-[var(--muted)]">
            Suas participacoes de rifa nao estao disponiveis neste ambiente.
          </p>
        </div>
      </div>
    );
  }

  const { customer } = await requireUserPage("/conta/rifas");
  const orders = customer
    ? ((await new RaffleService().getMyRaffleOrders(customer.id)) as unknown as RaffleOrder[])
    : [];

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-[var(--foreground)]">Minhas rifas</h1>
        <p className="mt-2 text-sm text-[var(--muted)]">
          Reservas e compras de numeros vinculadas ao seu cadastro.
        </p>
      </div>

      <div className="grid gap-5">
        <RaffleExperimentalNotice />
        {!customer ? (
          <p className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4 text-sm text-[var(--muted)]">
            Nenhum cadastro de cliente vinculado a este login ainda.
          </p>
        ) : orders.length > 0 ? (
          <div className="space-y-3">
            {orders.map((order) => (
              <article key={order.id} className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-lg font-bold text-[var(--foreground)]">{order.order_number}</h2>
                      <RaffleOrderStatusBadge status={order.status} />
                    </div>
                    <p className="mt-1 text-sm text-[var(--muted)]">
                      {order.raffle_campaigns?.title ?? "Rifa"} · numeros {numbersText(order)}
                    </p>
                    <p className="mt-2 text-sm text-[var(--muted)]">
                      Reservado ate {formatDateTime(order.reserved_until)} · pago em {formatDateTime(order.paid_at)}
                    </p>
                  </div>
                  <div className="flex items-center justify-between gap-4 md:justify-end">
                    <strong className="text-lg text-[var(--foreground)]">
                      {formatCurrency(Number(order.total_amount))}
                    </strong>
                    <Link
                      href={`/conta/rifas/${order.id}`}
                      className="inline-flex h-10 items-center gap-2 rounded-md border border-[var(--border)] px-3 text-sm font-semibold text-[var(--foreground)] hover:bg-[var(--surface-strong)]"
                    >
                      Abrir
                      <ArrowRight size={16} aria-hidden="true" />
                    </Link>
                  </div>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <p className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4 text-sm text-[var(--muted)]">
            Você ainda não participou de nenhuma rifa.
          </p>
        )}
      </div>
    </div>
  );
}
