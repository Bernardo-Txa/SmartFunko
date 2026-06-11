import type { Metadata } from "next";
import { AdminShell } from "@/components/admin/admin-shell";
import { RankingEntryActions } from "@/components/rewards/ranking-entry-actions";
import { RankingRefreshButton } from "@/components/rewards/ranking-refresh-button";
import { isRewardsEnabled } from "@/lib/env";
import { formatCurrency, formatDate } from "@/lib/format";
import { requireAdminPage } from "@/server/auth/require-admin-page";
import { RewardsService } from "@/server/rewards/rewards-service";

export const metadata: Metadata = {
  title: "Ranking Clube",
};

type Props = {
  searchParams?: Promise<{
    month?: string;
    year?: string;
  }>;
};

type RankingEntry = {
  customer_id: string;
  displayName: string;
  id: string;
  is_winner: boolean;
  order_number: string;
  order_total: number;
  paid_at: string;
  rank_position: number | null;
  reward_cancelled_at?: string | null;
  reward_cancelled_by?: string | null;
  reward_delivered_at?: string | null;
  reward_delivered_by?: string | null;
  reward_notes: string | null;
  reward_status: string;
  cancelled_by_profile?: { name?: string | null } | null;
  delivered_by_profile?: { name?: string | null } | null;
};

function getRewardStatusLabel(status: string) {
  const labels: Record<string, string> = {
    cancelled: "Cancelado",
    delivered: "Entregue",
    none: "Sem brinde",
    pending: "Pendente",
  };

  return labels[status] ?? status;
}

export default async function AdminClubRankingPage({ searchParams }: Props) {
  const admin = await requireAdminPage("/admin/clube/ranking");
  const params = await searchParams;
  const now = new Date();
  const year = Number(params?.year ?? now.getUTCFullYear());
  const month = Number(params?.month ?? now.getUTCMonth() + 1);

  if (!isRewardsEnabled()) {
    return (
      <AdminShell title="Ranking do Clube" description="Módulo de gamificação desativado neste ambiente.">
        <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5 text-sm text-[var(--muted)]">
          Ative `NEXT_PUBLIC_ENABLE_REWARDS=true` para liberar o ranking.
        </div>
      </AdminShell>
    );
  }

  const ranking = await new RewardsService(undefined, admin.profile.id).getRanking(year, month);
  const entries = ranking.entries as RankingEntry[];
  const winners = entries.filter((entry) => entry.is_winner).slice(0, 3);
  const positionRewards = [
    ranking.first_place_reward,
    ranking.second_place_reward,
    ranking.third_place_reward,
  ];

  return (
    <AdminShell title="Ranking Mensal" description="Top 3 maiores pedidos pagos do mês, por pedido individual.">
      <div className="grid gap-5">
        <section className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5">
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div>
              <h2 className="text-xl font-bold text-[var(--foreground)]">{ranking.title}</h2>
              <p className="mt-2 text-sm text-[var(--muted)]">
                Período {formatDate(ranking.starts_at)} até {formatDate(ranking.ends_at)} · status {ranking.status}
              </p>
            </div>
            <RankingRefreshButton year={year} month={month} />
          </div>
        </section>

        <div className="grid gap-4 md:grid-cols-3">
          {[0, 1, 2].map((index) => {
            const entry = winners[index];
            return (
              <section key={index} className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5">
                <span className="text-sm font-semibold text-[var(--muted)]">{index + 1}º lugar</span>
                {entry ? (
                  <>
                    <strong className="mt-3 block text-lg text-[var(--foreground)]">{entry.displayName}</strong>
                    <p className="mt-1 text-sm text-[var(--muted)]">{entry.order_number}</p>
                    <strong className="mt-4 block text-2xl text-[var(--foreground)]">
                      {formatCurrency(Number(entry.order_total))}
                    </strong>
                    <p className="mt-2 text-sm text-[var(--muted)]">
                      Brinde: {getRewardStatusLabel(entry.reward_status)}
                    </p>
                    {positionRewards[index] ? (
                      <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{positionRewards[index]}</p>
                    ) : null}
                  </>
                ) : (
                  <p className="mt-3 text-sm text-[var(--muted)]">Sem pedido classificado.</p>
                )}
              </section>
            );
          })}
        </div>

        <section className="overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--surface)]">
          <div className="border-b border-[var(--border)] p-5">
            <h2 className="text-lg font-bold text-[var(--foreground)]">Entradas do mês</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="text-xs uppercase text-[var(--muted)]">
                <tr>
                  <th className="px-4 py-3">Posição</th>
                  <th className="px-4 py-3">Cliente</th>
                  <th className="px-4 py-3">Pedido</th>
                  <th className="px-4 py-3">Valor</th>
                  <th className="px-4 py-3">Pago em</th>
                  <th className="px-4 py-3">Brinde</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {entries.map((entry) => (
                  <tr key={entry.id}>
                    <td className="px-4 py-3 font-bold text-[var(--foreground)]">#{entry.rank_position ?? "-"}</td>
                    <td className="px-4 py-3 text-[var(--foreground)]">{entry.displayName}</td>
                    <td className="px-4 py-3 text-[var(--muted)]">{entry.order_number}</td>
                    <td className="px-4 py-3 text-[var(--foreground)]">{formatCurrency(Number(entry.order_total))}</td>
                    <td className="px-4 py-3 text-[var(--muted)]">{formatDate(entry.paid_at)}</td>
                    <td className="px-4 py-3">
                      {entry.is_winner ? (
                        <div className="grid gap-2">
                          <RankingEntryActions
                            entryId={entry.id}
                            rewardNotes={entry.reward_notes}
                            rewardStatus={entry.reward_status}
                          />
                          {entry.reward_delivered_at ? (
                            <p className="text-xs text-[var(--muted)]">
                              Entregue por {entry.delivered_by_profile?.name ?? "admin"} em {formatDate(entry.reward_delivered_at)}
                            </p>
                          ) : null}
                          {entry.reward_cancelled_at ? (
                            <p className="text-xs text-[var(--muted)]">
                              Cancelado por {entry.cancelled_by_profile?.name ?? "admin"} em {formatDate(entry.reward_cancelled_at)}
                            </p>
                          ) : null}
                        </div>
                      ) : (
                        <span className="text-[var(--muted)]">Fora do Top 3</span>
                      )}
                    </td>
                  </tr>
                ))}
                {entries.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-6 text-center text-[var(--muted)]">
                      Nenhum pedido pago encontrado para este mês.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </AdminShell>
  );
}
