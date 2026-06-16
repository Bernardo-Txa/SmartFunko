import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ExternalLink } from "lucide-react";
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

function paymentMethodText(order: RaffleOrder) {
  if (order.payment_provider === "infinitepay") {
    if (order.capture_method === "pix") {
      return "Pix via InfinitePay";
    }

    if (order.capture_method === "credit_card") {
      return "Cartao de credito via InfinitePay";
    }

    if (order.capture_method === "debit_card") {
      return "Cartao de debito via InfinitePay";
    }

    return "InfinitePay";
  }

  if (order.capture_method === "manual") {
    return "Manual";
  }

  return order.capture_method ?? "-";
}

export default async function AccountRaffleDetailPage({ params }: Props) {
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

        {order.status === "pending_payment" ? (
          <section className="rounded-lg border border-yellow-300/35 bg-yellow-300/10 p-5">
            <h2 className="text-lg font-bold text-yellow-100">Aguardando pagamento</h2>
            {order.payment_link_url ? (
              <div className="mt-3 grid gap-3 text-sm leading-6 text-yellow-100/90">
                <p>Use o link InfinitePay para pagar com Pix ou cartao antes do fim da reserva.</p>
                <a
                  href={order.payment_link_url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex h-10 w-fit items-center justify-center gap-2 rounded-md bg-[var(--yellow)] px-4 text-sm font-black text-[#020617] hover:brightness-110"
                >
                  <ExternalLink size={16} aria-hidden="true" />
                  Pagar agora
                </a>
                <p className="break-all text-xs">{order.payment_link_url}</p>
              </div>
            ) : (
              <p className="mt-3 text-sm leading-6 text-yellow-100/90">
                O link automatico nao esta disponivel para esta reserva. Entre em contato com a Smart Funkos
                e envie o comprovante com o pedido {order.order_number}.
              </p>
            )}
          </section>
        ) : null}

        {order.status === "paid" ? (
          <section className="rounded-lg border border-emerald-300/35 bg-emerald-500/10 p-5">
            <h2 className="text-lg font-bold text-emerald-100">Pagamento confirmado</h2>
            <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
              <div>
                <dt className="font-semibold text-emerald-100">Metodo</dt>
                <dd className="text-emerald-100/90">{paymentMethodText(order)}</dd>
              </div>
              <div>
                <dt className="font-semibold text-emerald-100">Referencia</dt>
                <dd className="break-words text-emerald-100/90">{order.transaction_nsu ?? order.payment_provider_reference ?? "-"}</dd>
              </div>
            </dl>
            {order.receipt_url ? (
              <a
                href={order.receipt_url}
                target="_blank"
                rel="noreferrer"
                className="mt-4 inline-flex h-10 items-center justify-center gap-2 rounded-md border border-emerald-200/40 px-3 text-sm font-semibold text-emerald-100 hover:bg-emerald-500/10"
              >
                <ExternalLink size={16} aria-hidden="true" />
                Ver comprovante
              </a>
            ) : null}
          </section>
        ) : null}

        {order.status === "expired" ? (
          <section className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5">
            <h2 className="text-lg font-bold text-[var(--foreground)]">Reserva expirada</h2>
            <p className="mt-3 text-sm text-[var(--muted)]">
              Os numeros foram liberados. Se voce pagou depois da expiracao, a Smart Funkos precisa revisar manualmente.
            </p>
          </section>
        ) : null}

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
