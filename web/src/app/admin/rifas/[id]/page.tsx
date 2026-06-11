import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminShell, MetricCard } from "@/components/admin/admin-shell";
import {
  RaffleCampaignStatusActions,
  RaffleDrawForm,
  RaffleExpireReservationsButton,
  RaffleOrderActions,
} from "@/components/admin/raffle-admin-actions";
import { RaffleExperimentalNotice } from "@/components/raffles/raffle-experimental-notice";
import type { RaffleCampaign, RaffleNumber, RaffleOrder } from "@/components/raffles/raffle-types";
import { RaffleCampaignStatusBadge, RaffleNumberStatusBadge, RaffleOrderStatusBadge } from "@/components/ui/status-badge";
import { isRafflesEnabled } from "@/lib/env";
import { formatCurrency, formatDate } from "@/lib/format";
import { getRaffleDrawMethodMeta } from "@/lib/status-labels";
import { requireAdminPage } from "@/server/auth/require-admin-page";
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

function getStats(campaign: RaffleCampaign) {
  return campaign.stats ?? {
    available: 0,
    pending: 0,
    revenue: 0,
    sold: 0,
    soldPercent: 0,
    total: campaign.total_numbers,
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

function numbersText(numbers: RaffleNumber[] | undefined) {
  if (!numbers || numbers.length === 0) {
    return "-";
  }

  return numbers.map((number) => number.label).join(", ");
}

export default async function AdminRaffleDetailPage({ params }: Props) {
  if (!isRafflesEnabled()) {
    notFound();
  }

  const { id } = await params;
  const admin = await requireAdminPage(`/admin/rifas/${id}`);
  const service = new RaffleService(undefined, admin.profile.id);
  let campaign: RaffleCampaign;

  try {
    campaign = (await service.getRaffleCampaignById(id)) as unknown as RaffleCampaign;
  } catch {
    notFound();
  }

  const [ordersResult, numbersResult] = await Promise.all([
    service.listRaffleOrders(id),
    service.listPublicRaffleNumbers(id),
  ]);
  const orders = ordersResult as unknown as RaffleOrder[];
  const numbers = numbersResult as unknown as RaffleNumber[];
  const winnerNumber = numbers.find((number) => number.status === "winner");
  const stats = getStats(campaign);
  const pendingRevenue = stats.pending * Number(campaign.price_per_number);
  const drawMethod = getRaffleDrawMethodMeta(campaign.draw_method);

  return (
    <AdminShell title={campaign.title} description="Detalhe operacional da campanha de rifa.">
      <div className="grid gap-5">
        <RaffleExperimentalNotice />
        <section className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <RaffleCampaignStatusBadge status={campaign.status} />
                <span className="rounded-md bg-[var(--surface-strong)] px-2 py-1 text-xs font-semibold text-[var(--muted)]">
                  {campaign.code}
                </span>
              </div>
              <h2 className="mt-4 text-xl font-bold text-[var(--foreground)]">{campaign.prize_title}</h2>
              <p className="mt-1 text-sm text-[var(--muted)]">
                Slug publico: <Link href={`/rifas/${campaign.slug}`} className="hover:text-[var(--accent)]">/rifas/{campaign.slug}</Link>
              </p>
            </div>
            <div className="grid gap-3">
              <RaffleCampaignStatusActions campaignId={campaign.id} status={campaign.status} />
              <RaffleExpireReservationsButton />
            </div>
          </div>
        </section>

        <div className="grid gap-4 md:grid-cols-5">
          <MetricCard label="Numeros" value={`${stats.total}`} detail={`${stats.available} disponiveis`} />
          <MetricCard label="Vendidos" value={`${stats.sold}`} detail={`${stats.soldPercent}% da campanha`} />
          <MetricCard label="Pendentes" value={`${stats.pending}`} detail="Aguardando pagamento" />
          <MetricCard label="Receita pendente" value={formatCurrency(pendingRevenue)} detail="Reservas abertas" />
          <MetricCard label="Receita confirmada" value={formatCurrency(stats.revenue)} detail="Pagamentos confirmados" />
        </div>

        <section className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5">
            <h2 className="text-lg font-bold text-[var(--foreground)]">Dados da campanha</h2>
            <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
              <div>
                <dt className="font-semibold text-[var(--foreground)]">Preco por numero</dt>
                <dd className="text-[var(--muted)]">{formatCurrency(Number(campaign.price_per_number))}</dd>
              </div>
              <div>
                <dt className="font-semibold text-[var(--foreground)]">Intervalo</dt>
                <dd className="text-[var(--muted)]">{campaign.number_start} a {campaign.number_end}</dd>
              </div>
              <div>
                <dt className="font-semibold text-[var(--foreground)]">Inicio</dt>
                <dd className="text-[var(--muted)]">{formatDateTime(campaign.starts_at)}</dd>
              </div>
              <div>
                <dt className="font-semibold text-[var(--foreground)]">Encerramento</dt>
                <dd className="text-[var(--muted)]">{formatDateTime(campaign.ends_at)}</dd>
              </div>
              <div>
                <dt className="font-semibold text-[var(--foreground)]">Sorteio</dt>
                <dd className="text-[var(--muted)]">{formatDateTime(campaign.draw_at)}</dd>
              </div>
              <div>
                <dt className="font-semibold text-[var(--foreground)]">Metodo</dt>
                <dd className="text-[var(--muted)]">{drawMethod.label}</dd>
              </div>
              <div>
                <dt className="font-semibold text-[var(--foreground)]">Reserva</dt>
                <dd className="text-[var(--muted)]">{campaign.reservation_minutes} minuto(s)</dd>
              </div>
              <div>
                <dt className="font-semibold text-[var(--foreground)]">Limite por cliente</dt>
                <dd className="text-[var(--muted)]">{campaign.max_numbers_per_customer ?? "Sem limite"}</dd>
              </div>
            </dl>
          </div>
          <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5">
            <h2 className="text-lg font-bold text-[var(--foreground)]">Resultado</h2>
            <dl className="mt-4 grid gap-3 text-sm">
              <div>
                <dt className="font-semibold text-[var(--foreground)]">Numero vencedor</dt>
                <dd className="mt-1 flex items-center gap-2 text-[var(--muted)]">
                  {winnerNumber ? (
                    <>
                      <span className="font-bold text-[var(--foreground)]">{winnerNumber.label}</span>
                      <RaffleNumberStatusBadge status={winnerNumber.status} />
                    </>
                  ) : (
                    "Ainda nao registrado"
                  )}
                </dd>
              </div>
              <div>
                <dt className="font-semibold text-[var(--foreground)]">Registrado em</dt>
                <dd className="text-[var(--muted)]">{formatDateTime(campaign.drawn_at)}</dd>
              </div>
              <div>
                <dt className="font-semibold text-[var(--foreground)]">Referencia</dt>
                <dd className="break-words text-[var(--muted)]">{campaign.draw_reference ?? "-"}</dd>
              </div>
              <div>
                <dt className="font-semibold text-[var(--foreground)]">Notas</dt>
                <dd className="whitespace-pre-wrap text-[var(--muted)]">{campaign.draw_notes ?? "-"}</dd>
              </div>
            </dl>
          </div>
        </section>

        <RaffleDrawForm
          campaignId={campaign.id}
          disabled={!["closed", "sold_out"].includes(campaign.status) || Boolean(winnerNumber)}
        />

        <section className="overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--surface)]">
          <div className="border-b border-[var(--border)] p-5">
            <h2 className="text-lg font-bold text-[var(--foreground)]">Pedidos da rifa</h2>
            <p className="mt-1 text-sm text-[var(--muted)]">
              Reservas e compras vinculadas a esta campanha.
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1300px] text-left text-sm">
              <thead className="bg-[var(--surface-strong)] text-[var(--muted)]">
                <tr>
                  <th className="px-4 py-3">Pedido</th>
                  <th className="px-4 py-3">Cliente</th>
                  <th className="px-4 py-3">Numeros</th>
                  <th className="px-4 py-3">Total</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Pagamento</th>
                  <th className="px-4 py-3">Reservado ate</th>
                  <th className="px-4 py-3">Pago em</th>
                  <th className="px-4 py-3">Gateway</th>
                  <th className="px-4 py-3">Acoes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {orders.map((order) => (
                  <tr key={order.id}>
                    <td className="px-4 py-3 font-semibold text-[var(--foreground)]">{order.order_number}</td>
                    <td className="px-4 py-3 text-[var(--muted)]">
                      {order.customers?.name ?? "Cliente"}
                      <p className="text-xs">{order.customers?.email ?? order.customers?.phone ?? ""}</p>
                    </td>
                    <td className="px-4 py-3 text-[var(--muted)]">{numbersText(order.raffle_numbers)}</td>
                    <td className="px-4 py-3 text-[var(--foreground)]">{formatCurrency(Number(order.total_amount))}</td>
                    <td className="px-4 py-3">
                      <RaffleOrderStatusBadge status={order.status} />
                    </td>
                    <td className="px-4 py-3 text-[var(--muted)]">{order.payment_status ?? "-"}</td>
                    <td className="px-4 py-3 text-[var(--muted)]">{formatDateTime(order.reserved_until)}</td>
                    <td className="px-4 py-3 text-[var(--muted)]">{order.paid_at ? formatDate(order.paid_at) : "-"}</td>
                    <td className="px-4 py-3 text-[var(--muted)]">
                      {order.payment_provider ?? "-"}
                      {order.capture_method ? <p className="text-xs">{order.capture_method}</p> : null}
                      {order.transaction_nsu ? <p className="max-w-48 break-all text-xs">{order.transaction_nsu}</p> : null}
                      {order.cash_entry_id ? <p className="text-xs">Caixa: {order.cash_entry_id.slice(0, 8)}</p> : null}
                      {order.payment_id ? <p className="text-xs">Pagamento: {order.payment_id.slice(0, 8)}</p> : null}
                    </td>
                    <td className="px-4 py-3">
                      <RaffleOrderActions
                        orderId={order.id}
                        paymentLinkUrl={order.payment_link_url}
                        status={order.status}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {orders.length === 0 ? (
            <p className="p-5 text-sm text-[var(--muted)]">Nenhum pedido de rifa criado ainda.</p>
          ) : null}
        </section>
      </div>
    </AdminShell>
  );
}
