import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Plus } from "lucide-react";
import { AdminShell, MetricCard } from "@/components/admin/admin-shell";
import { RaffleOpenCampaignButton } from "@/components/admin/raffle-admin-actions";
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
    month?: string;
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
  const month = getParam(params?.month);
  const service = new RaffleService(undefined, admin.profile.id);
  const [campaigns, monthlyOverview] = await Promise.all([
    service.listRaffleCampaigns({
      q: search || undefined,
      status: status || undefined,
    }) as Promise<unknown>,
    service.getRaffleMonthlyOverview(month || undefined),
  ]);
  const raffleCampaigns = campaigns as RaffleCampaign[];
  const pendingNumbers = raffleCampaigns.reduce((sum, campaign) => sum + getStats(campaign).pending, 0);
  const soldNumbers = raffleCampaigns.reduce((sum, campaign) => sum + getStats(campaign).sold, 0);
  const projectedRevenue = raffleCampaigns.reduce((sum, campaign) => {
    const stats = getStats(campaign);
    return sum + (stats.sold + stats.pending) * Number(campaign.price_per_number);
  }, 0);
  const openCampaigns = raffleCampaigns.filter((campaign) => campaign.status === "open").length;

  return (
    <AdminShell title="Rifas" description="Painel operacional com cotas, pagamentos, ranking mensal e sorteio interno.">
      <div className="grid gap-5">
        <div className="grid gap-4 md:grid-cols-4">
          <MetricCard label="Abertas" value={`${openCampaigns}`} detail="Aceitando reservas" />
          <MetricCard label="Pendentes" value={`${pendingNumbers}`} detail="Aguardando pagamento" />
          <MetricCard label="Vendidas" value={`${soldNumbers}`} detail="Numeros pagos" />
          <MetricCard label="Receita prevista" value={formatCurrency(projectedRevenue)} detail="Pendentes + pagos" />
        </div>

        <section className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.16em] text-[var(--yellow)]">Resumo mensal</p>
              <h2 className="mt-2 text-2xl font-black text-[var(--foreground)]">{monthlyOverview.monthLabel}</h2>
              <p className="mt-1 text-sm text-[var(--muted)]">
                Compras pagas no mes, ranking por cotas e volume por campanha.
              </p>
            </div>
            <form className="flex flex-wrap items-end gap-2">
              {search ? <input type="hidden" name="q" value={search} /> : null}
              {status ? <input type="hidden" name="status" value={status} /> : null}
              <label className="block">
                <span className="text-sm font-semibold text-[var(--foreground)]">Mes</span>
                <input
                  name="month"
                  type="month"
                  defaultValue={monthlyOverview.month}
                  className="mt-2 h-10 rounded-md border border-[var(--border)] bg-[var(--background)] px-3 text-sm outline-none focus:border-[var(--accent)]"
                />
              </label>
              <button className="h-10 rounded-md bg-[var(--accent)] px-4 text-sm font-black text-[#020617] hover:brightness-110">
                Atualizar
              </button>
            </form>
          </div>
          <div className="mt-5 grid gap-3 md:grid-cols-4">
            <MetricCard label="Cotas pagas" value={`${monthlyOverview.quotas}`} detail={`${monthlyOverview.orders} pedido(s) pago(s)`} />
            <MetricCard label="Receita" value={formatCurrency(monthlyOverview.revenue)} detail="Somente pagamentos confirmados" />
            <MetricCard label="Clientes" value={`${monthlyOverview.uniqueCustomers}`} detail="Compradores unicos" />
            <MetricCard label="Ticket medio" value={formatCurrency(monthlyOverview.orders > 0 ? monthlyOverview.revenue / monthlyOverview.orders : 0)} detail="Por pedido de rifa" />
          </div>
          <div className="mt-5 grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="overflow-hidden rounded-lg border border-[var(--border)]">
              <div className="border-b border-[var(--border)] bg-[var(--surface-strong)] px-4 py-3">
                <h3 className="font-bold text-[var(--foreground)]">Quem comprou mais cotas</h3>
              </div>
              <div className="divide-y divide-[var(--border)]">
                {monthlyOverview.topCustomers.map((customer, index) => (
                  <div key={customer.customerId} className="grid gap-3 px-4 py-3 text-sm sm:grid-cols-[44px_1fr_90px_120px] sm:items-center">
                    <span className="flex h-8 w-8 items-center justify-center rounded-md bg-[var(--background)] font-black text-[var(--yellow)]">{index + 1}</span>
                    <div>
                      <p className="font-bold text-[var(--foreground)]">{customer.customerName}</p>
                      <p className="text-xs text-[var(--muted)]">{customer.customerEmail ?? customer.customerPhone ?? "Sem contato"}</p>
                    </div>
                    <p className="font-black text-[var(--foreground)]">{customer.quotas} cotas</p>
                    <p className="text-[var(--muted)]">{formatCurrency(customer.revenue)}</p>
                  </div>
                ))}
                {monthlyOverview.topCustomers.length === 0 ? (
                  <p className="px-4 py-5 text-sm text-[var(--muted)]">Nenhuma rifa paga neste mes.</p>
                ) : null}
              </div>
            </div>
            <div className="overflow-hidden rounded-lg border border-[var(--border)]">
              <div className="border-b border-[var(--border)] bg-[var(--surface-strong)] px-4 py-3">
                <h3 className="font-bold text-[var(--foreground)]">Rifas do mes</h3>
              </div>
              <div className="divide-y divide-[var(--border)]">
                {monthlyOverview.campaigns.map((campaign) => (
                  <Link key={campaign.campaignId} href={`/admin/rifas/${campaign.campaignId}`} className="block px-4 py-3 hover:bg-[var(--surface-strong)]">
                    <p className="font-bold text-[var(--foreground)]">{campaign.campaignTitle}</p>
                    <p className="mt-1 text-xs text-[var(--muted)]">
                      {campaign.campaignCode ?? "Rifa"} · {campaign.quotas} cotas · {formatCurrency(campaign.revenue)}
                    </p>
                  </Link>
                ))}
                {monthlyOverview.campaigns.length === 0 ? (
                  <p className="px-4 py-5 text-sm text-[var(--muted)]">Sem campanhas com pagamento no mes.</p>
                ) : null}
              </div>
            </div>
          </div>
        </section>

        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <form className="grid gap-3 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4 md:grid-cols-[minmax(180px,1fr)_220px_auto] md:items-end">
            {monthlyOverview.month ? <input type="hidden" name="month" value={monthlyOverview.month} /> : null}
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
            <table className="w-full min-w-[1180px] text-left text-sm">
              <thead className="bg-[var(--surface-strong)] text-[var(--muted)]">
                <tr>
                  <th className="px-4 py-3">Campanha</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Preco</th>
                  <th className="px-4 py-3">Vendidos</th>
                  <th className="px-4 py-3">Pendentes</th>
                  <th className="px-4 py-3">Total</th>
                  <th className="px-4 py-3">Receita confirmada</th>
                  <th className="px-4 py-3">Sorteio</th>
                  <th className="px-4 py-3">Acao</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {raffleCampaigns.map((campaign) => {
                  const stats = getStats(campaign);

                  return (
                    <tr key={campaign.id}>
                      <td className="px-4 py-3">
                        <Link href={`/admin/rifas/${campaign.id}`} className="font-semibold text-[var(--foreground)] hover:text-[var(--accent)]">
                          {campaign.title}
                        </Link>
                        <p className="text-xs text-[var(--muted)]">
                          {campaign.code} · {campaign.prize_title}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <RaffleCampaignStatusBadge status={campaign.status} />
                      </td>
                      <td className="px-4 py-3 text-[var(--foreground)]">{formatCurrency(Number(campaign.price_per_number))}</td>
                      <td className="px-4 py-3 text-[var(--muted)]">{stats.sold}</td>
                      <td className="px-4 py-3 text-[var(--muted)]">{stats.pending}</td>
                      <td className="px-4 py-3 text-[var(--muted)]">{stats.total}</td>
                      <td className="px-4 py-3 text-[var(--foreground)]">{formatCurrency(stats.revenue)}</td>
                      <td className="px-4 py-3 text-[var(--muted)]">{campaign.draw_at ? formatDate(campaign.draw_at) : "-"}</td>
                      <td className="px-4 py-3">
                        <RaffleOpenCampaignButton
                          campaignId={campaign.id}
                          disabled={["open", "drawn", "cancelled"].includes(campaign.status)}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
        {raffleCampaigns.length === 0 ? (
          <p className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4 text-sm text-[var(--muted)]">
            Voce ainda nao criou nenhuma rifa.
          </p>
        ) : null}
      </div>
    </AdminShell>
  );
}
