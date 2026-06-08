import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, Ticket } from "lucide-react";
import { RaffleExperimentalNotice } from "@/components/raffles/raffle-experimental-notice";
import type { RaffleCampaign } from "@/components/raffles/raffle-types";
import { RaffleCampaignStatusBadge } from "@/components/ui/status-badge";
import { isRafflesEnabled } from "@/lib/env";
import { formatCurrency, formatDate } from "@/lib/format";
import { RaffleService } from "@/server/raffles/raffle-service";

export const metadata: Metadata = {
  title: "Rifas Smart Funkos",
  description: "Campanhas experimentais de rifa da Smart Funkos.",
};

function getStats(campaign: RaffleCampaign) {
  return campaign.stats ?? {
    available: 0,
    pending: 0,
    reserved: 0,
    revenue: 0,
    sold: 0,
    soldPercent: 0,
    total: campaign.total_numbers,
  };
}

export default async function RafflesPage() {
  if (!isRafflesEnabled()) {
    notFound();
  }

  const campaigns = (await new RaffleService().listPublicRaffleCampaigns()) as unknown as RaffleCampaign[];

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-[var(--foreground)]">Rifas</h1>
        <p className="mt-2 text-sm text-[var(--muted)]">
          Campanhas experimentais com reserva temporaria e confirmacao manual de pagamento.
        </p>
      </div>

      <div className="grid gap-5">
        <RaffleExperimentalNotice />
        {campaigns.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {campaigns.map((campaign) => {
              const stats = getStats(campaign);

              return (
                <article key={campaign.id} className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5">
                  <div className="flex items-start justify-between gap-3">
                    <span className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-cyan-300/24 bg-cyan-500/10">
                      <Ticket className="text-[var(--accent)]" size={20} aria-hidden="true" />
                    </span>
                    <RaffleCampaignStatusBadge status={campaign.status} />
                  </div>
                  <h2 className="mt-5 text-xl font-black text-[var(--foreground)]">{campaign.title}</h2>
                  <p className="mt-1 text-sm font-semibold text-[var(--muted)]">{campaign.prize_title}</p>
                  <p className="mt-4 text-2xl font-black text-[var(--foreground)]">
                    {formatCurrency(Number(campaign.price_per_number))}
                    <span className="ml-1 text-sm font-semibold text-[var(--muted)]">por numero</span>
                  </p>
                  <div className="mt-4">
                    <div className="h-2 overflow-hidden rounded-full bg-slate-800">
                      <div
                        className="h-full bg-[var(--accent)]"
                        style={{ width: `${Math.min(100, stats.soldPercent)}%` }}
                      />
                    </div>
                    <p className="mt-2 text-xs text-[var(--muted)]">
                      {stats.sold}/{stats.total} numeros pagos · sorteio {campaign.draw_at ? formatDate(campaign.draw_at) : "a definir"}
                    </p>
                  </div>
                  <Link
                    href={`/rifas/${campaign.slug}`}
                    className="mt-5 inline-flex h-10 items-center justify-center gap-2 rounded-md bg-[var(--yellow)] px-4 text-sm font-black text-[#020617] hover:brightness-110"
                  >
                    Abrir rifa
                    <ArrowRight size={16} aria-hidden="true" />
                  </Link>
                </article>
              );
            })}
          </div>
        ) : (
          <p className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4 text-sm text-[var(--muted)]">
            Nenhuma rifa publica no momento.
          </p>
        )}
      </div>
    </div>
  );
}
