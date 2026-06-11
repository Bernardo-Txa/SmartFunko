import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { MessageCircle } from "lucide-react";
import { RaffleExperimentalNotice } from "@/components/raffles/raffle-experimental-notice";
import { RaffleNumberPicker } from "@/components/raffles/raffle-number-picker";
import type { RaffleCampaign, RaffleNumber } from "@/components/raffles/raffle-types";
import { RaffleCampaignStatusBadge, RaffleNumberStatusBadge } from "@/components/ui/status-badge";
import { isRafflesEnabled } from "@/lib/env";
import { formatCurrency } from "@/lib/format";
import { cleanDescription, createRaffleWebPageJsonLd, ogImages } from "@/lib/seo";
import { createRaffleWhatsAppUrl } from "@/lib/whatsapp";
import { RaffleService } from "@/server/raffles/raffle-service";

type Props = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;

  if (!isRafflesEnabled()) {
    return {
      title: {
        absolute: "Rifa indisponível — Smart Funkos",
      },
      robots: {
        follow: false,
        index: false,
      },
    };
  }

  try {
    const raffle = (await new RaffleService().getPublicRaffleCampaignBySlug(slug)) as unknown as RaffleCampaign;
    const title = `${raffle.title} — Rifa Smart Funkos`;
    const description = cleanDescription(
      raffle.description,
      raffle.status === "open"
        ? `Escolha seus números e participe da rifa ${raffle.title} na Smart Funkos. Pagamento por Pix ou cartão via InfinitePay.`
        : `Confira os detalhes da rifa ${raffle.title} na Smart Funkos.`,
    );

    return {
      title: {
        absolute: title,
      },
      description,
      alternates: {
        canonical: `/rifas/${raffle.slug}`,
      },
      openGraph: {
        title,
        description,
        images: ogImages(raffle.prize_image_url, raffle.title),
        type: "website",
        url: `/rifas/${raffle.slug}`,
      },
      robots:
        raffle.status === "cancelled"
          ? {
              follow: false,
              index: false,
            }
          : {
              follow: true,
              index: true,
            },
      twitter: {
        card: "summary_large_image",
        description,
        images: [raffle.prize_image_url || "/og/smart-funkos-og.png"],
        title,
      },
    };
  } catch {
    return {
      title: {
        absolute: "Rifa não encontrada — Smart Funkos",
      },
      description: "Rifa não encontrada na Smart Funkos.",
      robots: {
        follow: false,
        index: false,
      },
    };
  }
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

export default async function RaffleDetailPage({ params }: Props) {
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

  const { slug } = await params;
  const service = new RaffleService();
  let raffle: RaffleCampaign;

  try {
    raffle = (await service.getPublicRaffleCampaignBySlug(slug)) as unknown as RaffleCampaign;
  } catch {
    notFound();
  }

  const numbers = (await service.listPublicRaffleNumbers(raffle.id)) as unknown as RaffleNumber[];
  const stats = getStats(raffle);
  const winnerNumber = numbers.find((number) => number.status === "winner");
  const raffleDescription = cleanDescription(
    raffle.description,
    raffle.status === "open"
      ? `Escolha seus números e participe da rifa ${raffle.title} na Smart Funkos. Pagamento por Pix ou cartão via InfinitePay.`
      : `Confira os detalhes da rifa ${raffle.title} na Smart Funkos.`,
  );
  const raffleJsonLd = createRaffleWebPageJsonLd({
    description: raffleDescription,
    imageUrl: raffle.prize_image_url,
    slug: raffle.slug,
    title: raffle.title,
  });

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(raffleJsonLd) }}
      />
      <div className="grid gap-6">
        <RaffleExperimentalNotice />
        <section className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5">
            {raffle.prize_image_url ? (
              <div className="mb-5 overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--surface-strong)]">
                <div
                  aria-label={raffle.prize_title}
                  className="aspect-[4/3] w-full bg-cover bg-center"
                  role="img"
                  style={{ backgroundImage: `url(${raffle.prize_image_url})` }}
                />
              </div>
            ) : null}
            <div className="flex flex-wrap items-center gap-2">
              <RaffleCampaignStatusBadge status={raffle.status} />
              <span className="rounded-md bg-[var(--surface-strong)] px-2 py-1 text-xs font-semibold text-[var(--muted)]">
                {raffle.code}
              </span>
            </div>
            <h1 className="mt-5 text-3xl font-black text-[var(--foreground)]">{raffle.title}</h1>
            <p className="mt-2 text-lg font-semibold text-[var(--muted)]">{raffle.prize_title}</p>
            <a
              href={createRaffleWhatsAppUrl({ slug: raffle.slug, title: raffle.title })}
              target="_blank"
              rel="noreferrer"
              className="mt-4 inline-flex h-11 items-center justify-center gap-2 rounded-md border border-emerald-200/30 bg-emerald-500/90 px-4 text-sm font-black text-[#042f1a] hover:bg-emerald-400"
            >
              <MessageCircle size={16} aria-hidden="true" />
              Compartilhar rifa
            </a>
            {raffle.prize_description ? (
              <p className="mt-4 text-sm leading-6 text-[var(--muted)]">{raffle.prize_description}</p>
            ) : null}
            <div className="mt-6 rounded-lg border border-cyan-300/16 bg-slate-950/35 p-4">
              <p className="text-3xl font-black text-[var(--foreground)]">
                {formatCurrency(Number(raffle.price_per_number))}
                <span className="ml-2 text-sm font-semibold text-[var(--muted)]">por numero</span>
              </p>
            </div>
          </div>

          <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5">
            <h2 className="text-lg font-bold text-[var(--foreground)]">Progresso</h2>
            <div className="mt-4 h-3 overflow-hidden rounded-full bg-slate-800">
              <div className="h-full bg-[var(--accent)]" style={{ width: `${Math.min(100, stats.soldPercent)}%` }} />
            </div>
            <dl className="mt-5 grid gap-3 text-sm sm:grid-cols-2">
              <div>
                <dt className="font-semibold text-[var(--foreground)]">Pagos</dt>
                <dd className="text-[var(--muted)]">{stats.sold}/{stats.total}</dd>
              </div>
              <div>
                <dt className="font-semibold text-[var(--foreground)]">Disponiveis</dt>
                <dd className="text-[var(--muted)]">{stats.available}</dd>
              </div>
              <div>
                <dt className="font-semibold text-[var(--foreground)]">Inicio</dt>
                <dd className="text-[var(--muted)]">{formatDateTime(raffle.starts_at)}</dd>
              </div>
              <div>
                <dt className="font-semibold text-[var(--foreground)]">Encerramento</dt>
                <dd className="text-[var(--muted)]">{formatDateTime(raffle.ends_at)}</dd>
              </div>
              <div>
                <dt className="font-semibold text-[var(--foreground)]">Sorteio</dt>
                <dd className="text-[var(--muted)]">{formatDateTime(raffle.draw_at)}</dd>
              </div>
              <div>
                <dt className="font-semibold text-[var(--foreground)]">Reserva</dt>
                <dd className="text-[var(--muted)]">{raffle.reservation_minutes} minuto(s)</dd>
              </div>
              {winnerNumber ? (
                <div className="sm:col-span-2">
                  <dt className="font-semibold text-[var(--foreground)]">Resultado</dt>
                  <dd className="mt-1 flex items-center gap-2 text-[var(--muted)]">
                    Numero {winnerNumber.label}
                    <RaffleNumberStatusBadge status={winnerNumber.status} />
                  </dd>
                </div>
              ) : null}
            </dl>
          </div>
        </section>

        <section className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5">
          <h2 className="text-lg font-bold text-[var(--foreground)]">Regras</h2>
          <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-[var(--muted)]">
            {raffle.rules ?? "Regulamento ainda nao informado."}
          </p>
        </section>

        {raffle.status === "open" ? (
          <section>
            <div className="mb-4">
              <h2 className="text-2xl font-black text-[var(--foreground)]">Escolha seus numeros</h2>
              <p className="mt-1 text-sm text-[var(--muted)]">
                A reserva gera um link InfinitePay para Pix ou cartao. Se o link nao estiver disponivel, o atendimento manual continua como fallback.
              </p>
            </div>
            <RaffleNumberPicker
              numbers={numbers}
              pricePerNumber={Number(raffle.price_per_number)}
              slug={raffle.slug}
            />
          </section>
        ) : (
          <p className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4 text-sm text-[var(--muted)]">
            Esta rifa nao esta aberta para novas reservas.
          </p>
        )}
      </div>
    </div>
  );
}
