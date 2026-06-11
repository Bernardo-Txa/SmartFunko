import type { Metadata } from "next";
import { Trophy } from "lucide-react";
import { RewardProfileForm } from "@/components/rewards/reward-profile-form";
import { isRewardsEnabled } from "@/lib/env";
import { formatCurrency, formatDate } from "@/lib/format";
import { requireUserPage } from "@/server/auth/require-user-page";
import { RewardsService } from "@/server/rewards/rewards-service";

export const metadata: Metadata = {
  title: "Clube Smart Funkos",
};

type LedgerItem = {
  id: string;
  created_at: string;
  direction: string;
  points: number;
  reason: string;
  metadata?: {
    orderNumber?: string | null;
  } | null;
};

type RankingEntry = {
  id: string;
  displayName: string;
  is_winner: boolean;
  order_total: number;
  rank_position: number | null;
  reward_status: string;
};

type BadgeItem = {
  id: string;
  granted_at: string;
  reward_badges?: {
    code: string;
    description?: string | null;
    icon?: string | null;
    name: string;
  } | Array<{
    code: string;
    description?: string | null;
    icon?: string | null;
    name: string;
  }> | null;
};

function DisabledState() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <section className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5">
        <h1 className="text-2xl font-bold text-[var(--foreground)]">Clube Smart Funkos desativado</h1>
        <p className="mt-2 text-sm text-[var(--muted)]">Este módulo não está ativo neste ambiente.</p>
      </section>
    </div>
  );
}

function reasonLabel(reason: string) {
  const labels: Record<string, string> = {
    payment_paid: "Pagamento confirmado",
    payment_refunded: "Pagamento estornado",
  };

  return labels[reason] ?? reason;
}

export default async function AccountClubPage() {
  if (!isRewardsEnabled()) {
    return <DisabledState />;
  }

  const { customer } = await requireUserPage("/conta/clube");

  if (!customer) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <section className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5">
          <h1 className="text-2xl font-bold text-[var(--foreground)]">Clube Smart Funkos</h1>
          <p className="mt-2 text-sm text-[var(--muted)]">Nenhum cadastro de cliente vinculado a este login ainda.</p>
        </section>
      </div>
    );
  }

  const club = await new RewardsService().getCustomerClub(customer.id);
  const profile = club.profile;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-[var(--foreground)]">Clube Smart Funkos</h1>
        <p className="mt-2 text-sm text-[var(--muted)]">Pontos, níveis longos e ranking mensal de maiores pedidos pagos.</p>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_360px]">
        <div className="grid gap-5">
          <section className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div>
                <span className="text-sm font-semibold text-[var(--muted)]">Nível atual</span>
                <h2 className="mt-2 text-3xl font-black text-[var(--foreground)]">{profile.currentLevel.label}</h2>
                <p className="mt-2 text-sm text-[var(--muted)]">
                  {profile.lifetime_points.toLocaleString("pt-BR")} pontos vitalícios · {profile.current_points.toLocaleString("pt-BR")} pontos atuais
                </p>
              </div>
              <Trophy className="text-[var(--yellow)]" size={34} aria-hidden="true" />
            </div>
            <div className="mt-5">
              <div className="h-3 overflow-hidden rounded-full bg-[var(--background)]">
                <div className="h-full rounded-full bg-[var(--accent)]" style={{ width: `${profile.progressPercent}%` }} />
              </div>
              <p className="mt-2 text-sm text-[var(--muted)]">
                {profile.nextLevel
                  ? `Faltam ${profile.pointsToNextLevel.toLocaleString("pt-BR")} pontos para ${profile.nextLevel.label}.`
                  : "Você chegou ao Hall da Fama."}
              </p>
            </div>
          </section>

          <section className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5">
            <h2 className="text-lg font-bold text-[var(--foreground)]">Ranking mensal Top 3 pedidos</h2>
            <p className="mt-2 text-sm text-[var(--muted)]">{club.ranking.title}</p>
            <div className="mt-4 grid gap-3">
              {(club.ranking.entries as RankingEntry[]).slice(0, 10).map((entry) => (
                <div key={entry.id} className="flex items-center justify-between rounded-md border border-[var(--border)] bg-[var(--background)] p-3 text-sm">
                  <div>
                    <strong className="text-[var(--foreground)]">#{entry.rank_position} {entry.displayName}</strong>
                    <p className="mt-1 text-xs text-[var(--muted)]">
                      {entry.is_winner ? `Brinde: ${entry.reward_status}` : "Fora do Top 3"}
                    </p>
                  </div>
                  <strong className="text-[var(--foreground)]">{formatCurrency(Number(entry.order_total))}</strong>
                </div>
              ))}
              {club.ranking.entries.length === 0 ? (
                <p className="text-sm text-[var(--muted)]">Nenhum pedido pago entrou no ranking deste mês ainda.</p>
              ) : null}
            </div>
          </section>

          <section className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5">
            <h2 className="text-lg font-bold text-[var(--foreground)]">Badges</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {(club.badges as unknown as BadgeItem[]).map((badge) => {
                const badgeInfo = Array.isArray(badge.reward_badges)
                  ? badge.reward_badges[0]
                  : badge.reward_badges;

                return (
                  <div key={badge.id} className="rounded-md border border-[var(--border)] bg-[var(--background)] p-3">
                    <strong className="text-[var(--foreground)]">{badgeInfo?.name ?? "Badge"}</strong>
                    <p className="mt-1 text-xs leading-5 text-[var(--muted)]">
                      {badgeInfo?.description ?? `Concedido em ${formatDate(badge.granted_at)}`}
                    </p>
                  </div>
                );
              })}
              {club.badges.length === 0 ? (
                <p className="text-sm text-[var(--muted)]">Nenhum badge conquistado ainda.</p>
              ) : null}
            </div>
          </section>

          <section className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5">
            <h2 className="text-lg font-bold text-[var(--foreground)]">Extrato de pontos</h2>
            <div className="mt-4 grid gap-3">
              {(club.ledger as LedgerItem[]).map((entry) => (
                <div key={entry.id} className="flex items-center justify-between border-b border-[var(--border)] pb-3 text-sm last:border-0 last:pb-0">
                  <div>
                    <strong className="text-[var(--foreground)]">{reasonLabel(entry.reason)}</strong>
                    <p className="mt-1 text-xs text-[var(--muted)]">
                      {formatDate(entry.created_at)} {entry.metadata?.orderNumber ? `· ${entry.metadata.orderNumber}` : ""}
                    </p>
                  </div>
                  <span className={entry.direction === "reverse" ? "font-bold text-red-300" : "font-bold text-emerald-300"}>
                    {entry.direction === "reverse" ? "-" : "+"}{entry.points.toLocaleString("pt-BR")}
                  </span>
                </div>
              ))}
              {club.ledger.length === 0 ? <p className="text-sm text-[var(--muted)]">Nenhum ponto registrado ainda.</p> : null}
            </div>
          </section>
        </div>

        <div className="grid gap-5 content-start">
          <RewardProfileForm publicNickname={profile.public_nickname} showInRankings={profile.show_in_rankings} />
          <section className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5">
            <h2 className="text-lg font-bold text-[var(--foreground)]">Níveis</h2>
            <div className="mt-4 grid gap-2">
              {club.levels.map((level) => (
                <div key={level.code} className="flex items-center justify-between text-sm">
                  <span className={level.code === profile.currentLevel.code ? "font-bold text-[var(--foreground)]" : "text-[var(--muted)]"}>
                    {level.label}
                  </span>
                  <span className="text-[var(--muted)]">{level.minPoints.toLocaleString("pt-BR")}</span>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
