import type { Metadata } from "next";
import Link from "next/link";
import { AdminShell, MetricCard } from "@/components/admin/admin-shell";
import { CashflowManualEntryForm } from "@/components/admin/cashflow-manual-entry-form";
import { formatCurrency, formatDate } from "@/lib/format";
import {
  cashEntryCategoryOptions,
  cashEntryTypeOptions,
  getCashEntryCategoryMeta,
  getCashEntryTypeMeta,
  getStatusBadgeClassName,
} from "@/lib/status-labels";
import { requireOwnerPage } from "@/server/auth/require-admin-page";
import { CashflowService } from "@/server/cashflow/cashflow-service";

export const metadata: Metadata = {
  title: "Caixa admin",
};

type CashEntryListItem = {
  id: string;
  amount: number | string;
  category: string;
  description: string | null;
  occurred_at: string;
  payment_id: string | null;
  type: string;
  orders?: {
    id?: string;
    order_number?: string;
  } | null;
  payments?: {
    id?: string;
    method?: string;
    status?: string;
  } | null;
  profiles?: {
    name?: string;
  } | null;
};

type Props = {
  searchParams?: Promise<{
    category?: string;
    endDate?: string;
    order?: string;
    q?: string;
    startDate?: string;
    type?: string;
  }>;
};

function getParam(value: string | undefined) {
  return value?.trim() ?? "";
}

function endOfDate(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T23:59:59.999Z` : value;
}

function CashMetaBadge({ meta }: { meta: ReturnType<typeof getCashEntryTypeMeta> }) {
  return <span className={getStatusBadgeClassName(meta)}>{meta.label}</span>;
}

export default async function AdminCashflowPage({ searchParams }: Props) {
  const owner = await requireOwnerPage();
  const params = await searchParams;
  const category = getParam(params?.category);
  const endDate = getParam(params?.endDate);
  const order = getParam(params?.order);
  const search = getParam(params?.q);
  const startDate = getParam(params?.startDate);
  const type = getParam(params?.type);
  const filters = {
    category: category || undefined,
    endDate: endDate ? endOfDate(endDate) : undefined,
    order: order || undefined,
    search: search || undefined,
    startDate: startDate || undefined,
    type: type || undefined,
  };
  const service = new CashflowService(undefined, owner.profile.id);
  const [summary, entries] = await Promise.all([
    service.getCashflowSummary(filters),
    service.listCashEntries(filters),
  ]);
  const items = entries as unknown as CashEntryListItem[];

  return (
    <AdminShell title="Caixa" description="Entradas, saídas, ajustes e reflexos dos pagamentos manuais.">
      <div className="grid gap-6">
        <div className="grid gap-4 md:grid-cols-4">
          <MetricCard label="Entradas" value={formatCurrency(summary.incomeInPeriod)} detail="No período filtrado" />
          <MetricCard label="Saídas" value={formatCurrency(summary.expenseInPeriod)} detail="No período filtrado" />
          <MetricCard label="Saldo" value={formatCurrency(summary.netInPeriod)} detail="Entradas - saídas + ajustes" />
          <MetricCard label="Recebido hoje" value={formatCurrency(summary.incomeToday)} detail="Entradas do dia" />
          <MetricCard label="Recebido no mês" value={formatCurrency(summary.incomeThisMonth)} detail="Entradas do mês atual" />
          <MetricCard label="Reembolsos" value={formatCurrency(summary.refunds)} detail="Categoria refund" />
          <MetricCard label="Taxas" value={formatCurrency(summary.paymentFees)} detail="Categoria taxa" />
          <MetricCard label="Ajustes manuais" value={formatCurrency(summary.manualAdjustments)} detail="Categoria ajuste manual" />
        </div>

        <CashflowManualEntryForm />

        <form className="grid gap-3 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4 lg:grid-cols-[minmax(170px,1fr)_150px_190px_150px_150px_auto_auto] lg:items-end">
          <label className="block">
            <span className="text-sm font-semibold text-[var(--foreground)]">Texto</span>
            <input
              name="q"
              defaultValue={search}
              className="mt-2 h-10 w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 text-sm outline-none focus:border-[var(--accent)]"
            />
          </label>
          <label className="block">
            <span className="text-sm font-semibold text-[var(--foreground)]">Tipo</span>
            <select
              name="type"
              defaultValue={type}
              className="mt-2 h-10 w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 text-sm outline-none focus:border-[var(--accent)]"
            >
              <option value="">Todos</option>
              {cashEntryTypeOptions.map(({ label, value }) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-sm font-semibold text-[var(--foreground)]">Categoria</span>
            <select
              name="category"
              defaultValue={category}
              className="mt-2 h-10 w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 text-sm outline-none focus:border-[var(--accent)]"
            >
              <option value="">Todas</option>
              {cashEntryCategoryOptions.map(({ label, value }) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-sm font-semibold text-[var(--foreground)]">Início</span>
            <input
              name="startDate"
              type="date"
              defaultValue={startDate}
              className="mt-2 h-10 w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 text-sm outline-none focus:border-[var(--accent)]"
            />
          </label>
          <label className="block">
            <span className="text-sm font-semibold text-[var(--foreground)]">Fim</span>
            <input
              name="endDate"
              type="date"
              defaultValue={endDate}
              className="mt-2 h-10 w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 text-sm outline-none focus:border-[var(--accent)]"
            />
          </label>
          <button className="h-10 rounded-md bg-[var(--accent)] px-4 text-sm font-black text-[#020617] hover:brightness-110">
            Filtrar
          </button>
          <Link
            href="/admin/caixa"
            className="inline-flex h-10 items-center justify-center rounded-md border border-[var(--border)] px-4 text-sm font-semibold text-[var(--foreground)] hover:bg-[var(--surface-strong)]"
          >
            Limpar
          </Link>
        </form>

        <section className="overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--surface)]">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] text-left text-sm">
              <thead className="bg-[var(--surface-strong)] text-[var(--muted)]">
                <tr>
                  <th className="px-4 py-3">Tipo</th>
                  <th className="px-4 py-3">Categoria</th>
                  <th className="px-4 py-3">Valor</th>
                  <th className="px-4 py-3">Pedido</th>
                  <th className="px-4 py-3">Pagamento</th>
                  <th className="px-4 py-3">Descrição</th>
                  <th className="px-4 py-3">Data</th>
                  <th className="px-4 py-3">Criado por</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {items.map((entry) => {
                  const typeMeta = getCashEntryTypeMeta(entry.type);
                  const categoryMeta = getCashEntryCategoryMeta(entry.category);

                  return (
                    <tr key={entry.id}>
                      <td className="px-4 py-3">
                        <CashMetaBadge meta={typeMeta} />
                      </td>
                      <td className="px-4 py-3">
                        <CashMetaBadge meta={categoryMeta} />
                      </td>
                      <td className="px-4 py-3 font-semibold text-[var(--foreground)]">
                        {formatCurrency(Number(entry.amount))}
                      </td>
                      <td className="px-4 py-3 text-[var(--muted)]">
                        {entry.orders?.id ? (
                          <Link href={`/admin/pedidos/${entry.orders.id}`} className="hover:text-[var(--accent)]">
                            {entry.orders.order_number ?? "Pedido"}
                          </Link>
                        ) : (
                          "-"
                        )}
                      </td>
                      <td className="px-4 py-3 text-[var(--muted)]">
                        {entry.payment_id ? (
                          <Link href={`/admin/pagamentos?q=${encodeURIComponent(entry.payment_id)}`} className="hover:text-[var(--accent)]">
                            {entry.payment_id.slice(0, 8)}
                          </Link>
                        ) : (
                          "-"
                        )}
                      </td>
                      <td className="px-4 py-3 text-[var(--muted)]">{entry.description ?? "-"}</td>
                      <td className="px-4 py-3 text-[var(--muted)]">{formatDate(entry.occurred_at)}</td>
                      <td className="px-4 py-3 text-[var(--muted)]">{entry.profiles?.name ?? "Sistema"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {items.length === 0 ? (
            <p className="border-t border-[var(--border)] p-5 text-sm text-[var(--muted)]">
              Nenhum lançamento de caixa encontrado.
            </p>
          ) : null}
        </section>
      </div>
    </AdminShell>
  );
}
