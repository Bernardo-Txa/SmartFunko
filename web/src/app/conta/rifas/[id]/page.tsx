import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { RaffleExperimentalNotice } from "@/components/raffles/raffle-experimental-notice";
import type { RaffleOrder } from "@/components/raffles/raffle-types";
import { RaffleNumberStatusBadge, RaffleOrderStatusBadge } from "@/components/ui/status-badge";
import { isRafflesEnabled } from "@/lib/env";
import { formatCurrency } from "@/lib/format";
import { requireUserPage } from "@/server/auth/require-user-page";
import { RaffleService } from "@/server/raffles/raffle-service";

type Props = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  return {
    title: `Rifa ${id}`,
  };
}

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

function resultText(order: RaffleOrder) {
  const campaignStatus = order.raffle_campaigns?.status;
  const winningNumber = (order.raffle_numbers ?? []).find((number) => number.status === "winner");

  if (winningNumber) {
    return `Numero premiado: ${winningNumber.label}`;
  }

  if (campaignStatus === "drawn") {
    return "Sorteio concluido. Seus numeros nao foram marcados como premiados.";
  }

  if (campaignStatus === "closed" || campaignStatus === "sold_out") {
    return "Rifa encerrada. Resultado ainda nao registrado.";
  }

  return "Resultado ainda nao disponivel.";
}

export default async function AccountRaffleDetailPage({ params }: Props) {
  if (!isRafflesEnabled()) {
    notFound();
  }

  const { id } = await params;
  const { customer } = await requireUserPage(`/conta/rifas/${id}`);

  if (!customer) {
    notFound();
  }

  let order: RaffleOrder;

  try {
    order = (await new RaffleService().getMyRaffleOrderById(id, customer.id)) as unknown as RaffleOrder;
  } catch {
    notFound();
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6">
        <Link href="/conta/rifas" className="text-sm font-semibold text-[var(--accent)] hover:underline">
          Voltar para minhas rifas
        </Link>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <h1 className="text-3xl font-bold text-[var(--foreground)]">{order.order_number}</h1>
          <RaffleOrderStatusBadge status={order.status} />
        </div>
        <p className="mt-2 text-sm text-[var(--muted)]">
          {order.raffle_campaigns?.title ?? "Rifa"} · {order.raffle_campaigns?.prize_title ?? "Premio"}
        </p>
      </div>

      <div className="grid gap-5">
        <RaffleExperimentalNotice />
        <section className="grid gap-4 md:grid-cols-4">
          <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5">
            <span className="text-sm font-semibold text-[var(--muted)]">Total</span>
            <strong className="mt-3 block text-2xl text-[var(--foreground)]">{formatCurrency(Number(order.total_amount))}</strong>
          </div>
          <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5">
            <span className="text-sm font-semibold text-[var(--muted)]">Quantidade</span>
            <strong className="mt-3 block text-2xl text-[var(--foreground)]">{order.quantity}</strong>
          </div>
          <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5">
            <span className="text-sm font-semibold text-[var(--muted)]">Reservado ate</span>
            <strong className="mt-3 block text-base text-[var(--foreground)]">{formatDateTime(order.reserved_until)}</strong>
          </div>
          <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5">
            <span className="text-sm font-semibold text-[var(--muted)]">Pago em</span>
            <strong className="mt-3 block text-base text-[var(--foreground)]">{formatDateTime(order.paid_at)}</strong>
          </div>
        </section>

        <section className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5">
          <h2 className="text-lg font-bold text-[var(--foreground)]">Numeros</h2>
          <div className="mt-4 flex flex-wrap gap-2">
            {(order.raffle_numbers ?? []).map((number) => (
              <span
                key={number.id}
                className="inline-flex items-center gap-2 rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm font-semibold text-[var(--foreground)]"
              >
                {number.label}
                <RaffleNumberStatusBadge status={number.status} />
              </span>
            ))}
          </div>
        </section>

        <section className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5">
          <h2 className="text-lg font-bold text-[var(--foreground)]">Resultado</h2>
          <p className="mt-3 text-sm text-[var(--muted)]">{resultText(order)}</p>
          <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="font-semibold text-[var(--foreground)]">Status da campanha</dt>
              <dd className="text-[var(--muted)]">{order.raffle_campaigns?.status ?? "-"}</dd>
            </div>
            <div>
              <dt className="font-semibold text-[var(--foreground)]">Data prevista do sorteio</dt>
              <dd className="text-[var(--muted)]">{formatDateTime(order.raffle_campaigns?.draw_at)}</dd>
            </div>
          </dl>
        </section>
      </div>
    </div>
  );
}
