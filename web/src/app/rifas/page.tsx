import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Ticket } from "lucide-react";
import { RaffleExperimentalNotice } from "@/components/raffles/raffle-experimental-notice";
import type { RaffleCampaign } from "@/components/raffles/raffle-types";
import { RaffleCampaignStatusBadge } from "@/components/ui/status-badge";
import { isRafflesEnabled } from "@/lib/env";
import { formatCurrency, formatDate } from "@/lib/format";
import { ogImages } from "@/lib/seo";
import { RaffleService } from "@/server/raffles/raffle-service";

export const metadata: Metadata = {
  title: {
    absolute: "Rifas Smart Funkos — Campanhas e colecionáveis",
  },
  description: "Participe das rifas públicas da Smart Funkos e acompanhe campanhas de colecionáveis.",
  alternates: {
    canonical: "/rifas",
  },
  openGraph: {
    description: "Participe das rifas públicas da Smart Funkos e acompanhe campanhas de colecionáveis.",
    images: ogImages(),
    title: "Rifas Smart Funkos — Campanhas e colecionáveis",
    type: "website",
    url: "/rifas",
  },
  robots: isRafflesEnabled()
    ? {
        follow: true,
        index: true,
      }
    : {
        follow: false,
        index: false,
      },
  twitter: {
    card: "summary_large_image",
    description: "Participe das rifas públicas da Smart Funkos e acompanhe campanhas de colecionáveis.",
    images: ["/og/smart-funkos-og.png"],
    title: "Rifas Smart Funkos — Campanhas e colecionáveis",
  },
};

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

export default async function RafflesPage() {
  if (!isRafflesEnabled()) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5">
          <h1 className="text-2xl font-bold text-[var(--foreground)]">Módulo de rifas desativado</h1>
          <p className="mt-2 text-sm text-[var(--muted)]">
            As campanhas de rifa nao estao disponiveis neste ambiente.
          </p>
        </div>
      </div>
    );
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
                <article key={campaign.id} className="overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--surface)]">
                  <div className="aspect-[4/3] bg-[var(--surface-strong)]">
                    {campaign.prize_image_url ? (
                      <div
                        aria-label={campaign.prize_title}
                        className="h-full w-full bg-cover bg-center"
                        role="img"
                        style={{ backgroundImage: `url(${campaign.prize_image_url})` }}
                      />
                    ) : (
                      <span className="flex h-full items-center justify-center">
                        <Ticket className="text-[var(--accent)]" size={34} aria-hidden="true" />
                      </span>
                    )}
                  </div>
                  <div className="p-5">
                  <div className="flex items-start justify-end gap-3">
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
                    className="mt-5 inline-flex h-11 items-center justify-center gap-2 rounded-md bg-[var(--yellow)] px-4 text-sm font-black text-[#020617] hover:brightness-110"
                  >
                    Participar
                    <ArrowRight size={16} aria-hidden="true" />
                  </Link>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <p className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4 text-sm text-[var(--muted)]">
            Nenhuma rifa aberta no momento.
          </p>
        )}
      </div>
    </div>
  );
}
