"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { CalendarClock, ExternalLink, ShoppingBag, XCircle } from "lucide-react";
import { formatCurrency } from "@/lib/format";

export type CustomerPreorderReservation = {
  canCancel: boolean;
  canPay: boolean;
  checkoutNumber: string | null;
  createdAt: string;
  id: string;
  items: Array<{
    code: string;
    quantity: number;
    title: string;
    totalPrice: number;
    unitPrice: number;
  }>;
  notes: string | null;
  paymentLinkUrl: string | null;
  paymentStatus: string | null;
  reservationNumber: string;
  status: string;
  totalAmount: number;
  updatedAt: string;
};

type ApiResponse = {
  data?: unknown;
  error?: {
    message?: string;
  };
};

const statusLabels: Record<string, string> = {
  approved: "Aprovada",
  awaiting_approval: "Em analise",
  cancelled: "Cancelada",
  failed: "Falhou",
  paid: "Paga",
  pending_payment: "Aguardando pagamento",
};

const paymentStatusLabels: Record<string, string> = {
  checkout_generated: "Checkout gerado",
  manual_review: "Revisao manual",
  paid: "Pago",
  pending: "Pendente",
};

export function PreorderReservationsPanel({
  reservations,
}: {
  reservations: CustomerPreorderReservation[];
}) {
  const router = useRouter();
  const [busyId, setBusyId] = useState("");
  const [error, setError] = useState("");

  async function cancelReservation(reservation: CustomerPreorderReservation) {
    if (!reservation.canCancel || busyId) {
      return;
    }

    const confirmed = window.confirm(
      "Cancelar este checkout de pre-venda? Se o pagamento ja tiver sido feito, o pedido nao sera cancelado por aqui.",
    );

    if (!confirmed) {
      return;
    }

    setError("");
    setBusyId(reservation.id);

    try {
      const response = await fetch(`/api/v1/me/preorders/${reservation.id}/cancel`, {
        method: "POST",
      });
      const payload = (await response.json()) as ApiResponse;

      if (!response.ok) {
        throw new Error(payload.error?.message ?? "Falha ao cancelar pre-venda");
      }

      router.refresh();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Falha ao cancelar pre-venda");
    } finally {
      setBusyId("");
    }
  }

  if (reservations.length === 0) {
    return null;
  }

  return (
    <section className="mb-5 rounded-lg border border-yellow-300/25 bg-yellow-300/10 p-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="flex items-center gap-2 text-yellow-100">
            <CalendarClock size={18} aria-hidden="true" />
            <h2 className="text-lg font-black">Pre-vendas aguardando pagamento</h2>
          </div>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--muted)]">
            Estes checkouts ainda nao viraram pedido. Pague para confirmar ou cancele enquanto a InfinitePay nao confirmou.
          </p>
        </div>
        <Link
          href="/pre-vendas"
          className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-yellow-300/35 px-3 text-sm font-bold text-yellow-100 hover:bg-yellow-300/10"
        >
          <ShoppingBag size={16} aria-hidden="true" />
          Ver pre-vendas
        </Link>
      </div>

      {error ? <p className="mt-3 text-sm font-semibold text-red-200">{error}</p> : null}

      <div className="mt-4 grid gap-3">
        {reservations.map((reservation) => (
          <article
            key={reservation.id}
            className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4"
          >
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <strong className="text-sm text-[var(--foreground)]">{reservation.reservationNumber}</strong>
                  {reservation.checkoutNumber ? (
                    <span className="rounded-full border border-[var(--border)] px-2 py-1 text-[10px] font-black uppercase text-[var(--muted)]">
                      {reservation.checkoutNumber}
                    </span>
                  ) : null}
                  <span className="rounded-full border border-yellow-300/30 bg-yellow-300/10 px-2 py-1 text-[10px] font-black uppercase text-yellow-100">
                    {paymentStatusLabels[reservation.paymentStatus ?? ""] ?? reservation.paymentStatus ?? "Pendente"}
                  </span>
                  <span className="rounded-full border border-[var(--border)] px-2 py-1 text-[10px] font-black uppercase text-[var(--muted)]">
                    {statusLabels[reservation.status] ?? reservation.status}
                  </span>
                </div>

                <div className="mt-3 grid gap-2">
                  {reservation.items.map((item) => (
                    <div key={`${reservation.id}-${item.code}`} className="flex gap-3 text-sm">
                      <span className="shrink-0 font-black text-[var(--foreground)]">{item.quantity}x</span>
                      <span className="min-w-0 flex-1 text-[var(--muted)]">{item.title}</span>
                      <strong className="shrink-0 text-[var(--foreground)]">{formatCurrency(item.totalPrice)}</strong>
                    </div>
                  ))}
                </div>

                {reservation.notes ? (
                  <p className="mt-3 text-sm text-[var(--muted)]">Obs: {reservation.notes}</p>
                ) : null}
              </div>

              <div className="flex flex-col gap-2 lg:min-w-56">
                <div className="rounded-md border border-[var(--border)] bg-[var(--background)] p-3">
                  <span className="block text-[10px] font-black uppercase tracking-[0.12em] text-[var(--muted)]">
                    Total
                  </span>
                  <strong className="mt-1 block text-xl text-[var(--foreground)]">
                    {formatCurrency(reservation.totalAmount)}
                  </strong>
                </div>

                {reservation.canPay && reservation.paymentLinkUrl ? (
                  <Link
                    href={reservation.paymentLinkUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-[var(--yellow)] px-3 text-sm font-black text-[#020617] hover:brightness-110"
                  >
                    Continuar pagamento
                    <ExternalLink size={16} aria-hidden="true" />
                  </Link>
                ) : null}

                {reservation.canCancel ? (
                  <button
                    type="button"
                    onClick={() => cancelReservation(reservation)}
                    disabled={busyId === reservation.id}
                    className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-red-300/30 px-3 text-sm font-bold text-red-100 hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <XCircle size={16} aria-hidden="true" />
                    {busyId === reservation.id ? "Cancelando..." : "Cancelar checkout"}
                  </button>
                ) : null}
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
