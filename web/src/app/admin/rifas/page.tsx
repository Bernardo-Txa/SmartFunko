import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Plus } from "lucide-react";
import { AdminShell, MetricCard } from "@/components/admin/admin-shell";
import { RaffleExperimentalNotice } from "@/components/raffles/raffle-experimental-notice";
import type { RaffleCampaign } from "@/components/raffles/raffle-types";
import { RaffleCampaignStatusBadge } from "@/components/ui/status-badge";
import { isRafflesEnabled } from "@/lib/env";
import { formatCurrency, formatDate } from "@/lib/format";
import { raffleCampaignStatusOptions } from "@/lib/status-labels";
import { requireAdminPage } from "@/server/auth/require-admin-page";
import { RaffleService } from "@/server/raffles/raffle-service";

export const metadata: Metadata = {
  title: "Rifas admin",
};

type Props = {
  searchParams?: Promise<{
    q?: string;
    status?: string;
  }>;
};

function getParam(value: string | undefined) {
  return value?.trim() ?? "";
}

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

export default async function AdminRafflesPage({ searchParams }: Props) {
  if (!isRafflesEnabled()) {
    notFound();
  }

  const admin = await requireAdminPage("/admin/rifas");
  const params = await searchParams;
  const search = getParam(params?.q);
  const status = getParam(params?.status);
  const campaigns = (await new RaffleService(undefined, admin.profile.id).listRaffleCampaigns({
    q: search || undefined,
    status: status || undefined,
  })) as unknown as RaffleCampaign[];
  const totalRevenue = campaigns.reduce((sum, campaign) => sum + getStats(campaign).revenue, 0);
  const openCampaigns = campaigns.filter((campaign) => campaign.status === "open").length;

  return (
    <AdminShell title="Rifas" description="Campanhas DEV 1.0 com reserva temporaria e confirmacao manual.">
      <div className="grid gap-5">
        <RaffleExperimentalNotice />
        <div className="grid gap-4 md:grid-cols-4">
          <MetricCard label="Campanhas" value={`${campaigns.length}`} detail="No filtro atual" />
          <MetricCard label="Abertas" value={`${openCampaigns}`} detail="Aceitando reservas" />
          <MetricCard label="Vendidos" value={`${campaigns.reduce((sum, campaign) => sum + getStats(campaign).sold, 0)}`} detail="Numeros pagos" />
          <MetricCard label="Receita" value={formatCurrency(totalRevenue)} detail="Pagamentos confirmados" />
        </div>

        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <form className="grid gap-3 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4 md:grid-cols-[minmax(180px,1fr)_220px_auto] md:items-end">
            <label className="block">
              <span className="text-sm font-semibold text-[var(--foreground)]">Busca</span>
              <input
                name="q"
                defaultValue={search}
                placeholder="Titulo, codigo ou slug"
                className="mt-2 h-10 w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 text-sm outline-none focus:border-[var(--accent)]"
              />
            </label>
            <label className="block">
              <span className="text-sm font-semibold text-[var(--foreground)]">Status</span>
              <select
                name="status"
                defaultValue={status}
                className="mt-2 h-10 w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 text-sm outline-none focus:border-[var(--accent)]"
              >
                <option value="">Todos</option>
                {raffleCampaignStatusOptions.map(({ label, value }) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <button className="h-10 rounded-md bg-[var(--accent)] px-4 text-sm font-black text-[#020617] hover:brightness-110">
              Filtrar
            </button>
          </form>
          <Link
            href="/admin/rifas/nova"
            className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-md bg-[var(--accent)] px-4 text-sm font-black text-[#020617] hover:brightness-110"
          >
            <Plus size={16} aria-hidden="true" />
            Nova rifa
          </Link>
        </div>

        <section className="overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--surface)]">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[960px] text-left text-sm">
              <thead className="bg-[var(--surface-strong)] text-[var(--muted)]">
                <tr>
                  <th className="px-4 py-3">Campanha</th>
                  <th className="px-4 py-3">Premio</th>
                  <th className="px-4 py-3">Preco</th>
                  <th className="px-4 py-3">Progresso</th>
                  <th className="px-4 py-3">Receita</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Sorteio</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {campaigns.map((campaign) => {
                  const stats = getStats(campaign);

                  return (
                    <tr key={campaign.id}>
                      <td className="px-4 py-3">
                        <Link href={`/admin/rifas/${campaign.id}`} className="font-semibold text-[var(--foreground)] hover:text-[var(--accent)]">
                          {campaign.title}
                        </Link>
                        <p className="text-xs text-[var(--muted)]">{campaign.code} · /rifas/{campaign.slug}</p>
                      </td>
                      <td className="px-4 py-3 text-[var(--muted)]">{campaign.prize_title}</td>
                      <td className="px-4 py-3 text-[var(--foreground)]">{formatCurrency(Number(campaign.price_per_number))}</td>
                      <td className="px-4 py-3 text-[var(--muted)]">
                        {stats.sold}/{stats.total} vendidos · {stats.soldPercent}%
                      </td>
                      <td className="px-4 py-3 text-[var(--foreground)]">{formatCurrency(stats.revenue)}</td>
                      <td className="px-4 py-3">
                        <RaffleCampaignStatusBadge status={campaign.status} />
                      </td>
                      <td className="px-4 py-3 text-[var(--muted)]">{campaign.draw_at ? formatDate(campaign.draw_at) : "-"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
        {campaigns.length === 0 ? (
          <p className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4 text-sm text-[var(--muted)]">
            Nenhuma rifa encontrada com os filtros atuais.
          </p>
        ) : null}
      </div>
    </AdminShell>
  );
}
