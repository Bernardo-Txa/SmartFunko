import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";
import { AdminShell, MetricCard } from "@/components/admin/admin-shell";
import { PurchaseBatchStatusBadge, PurchaseBatchTypeBadge } from "@/components/ui/status-badge";
import { formatCurrency, formatDate } from "@/lib/format";
import { purchaseBatchStatusOptions, purchaseBatchTypeOptions } from "@/lib/status-labels";
import { requireAdminPage } from "@/server/auth/require-admin-page";
import { PurchaseBatchService } from "@/server/purchase-batches/purchase-batch-service";
import { SupplierService } from "@/server/suppliers/supplier-service";

export const metadata: Metadata = {
  title: "Lotes admin",
};

type Props = {
  searchParams?: Promise<{
    q?: string;
    status?: string;
    supplierId?: string;
    type?: string;
  }>;
};

type BatchListItem = {
  actual_total_cost: number | string | null;
  code: string;
  created_at: string;
  estimated_total_cost: number | string;
  id: string;
  name: string;
  received_at: string | null;
  status: string;
  type: string;
  purchase_batch_items?: Array<{
    id: string;
    quantity: number;
  }>;
  suppliers?: {
    name?: string | null;
  } | null;
};

function getParam(value: string | undefined) {
  return value?.trim() ?? "";
}

function startOfMonth() {
  const date = new Date();
  date.setDate(1);
  date.setHours(0, 0, 0, 0);
  return date.getTime();
}

export default async function AdminPurchaseBatchesPage({ searchParams }: Props) {
  const admin = await requireAdminPage();
  const params = await searchParams;
  const q = getParam(params?.q);
  const status = getParam(params?.status);
  const type = getParam(params?.type);
  const supplierId = getParam(params?.supplierId);
  const [rawBatches, suppliers] = await Promise.all([
    new PurchaseBatchService(undefined, admin.profile.id).listPurchaseBatches({
      q: q || undefined,
      status: status || undefined,
      supplierId: supplierId || undefined,
      type: type || undefined,
    }),
    new SupplierService(undefined, admin.profile.id).listSuppliers(),
  ]);
  const batches = rawBatches as unknown as BatchListItem[];

  const openBatches = batches.filter((batch) => batch.status === "open").length;
  const inTransit = batches.filter((batch) => batch.status === "in_transit").length;
  const receivedThisMonth = batches.filter((batch) => {
    if (!batch.received_at) {
      return false;
    }

    return new Date(batch.received_at).getTime() >= startOfMonth();
  }).length;
  const estimatedOpenCost = batches
    .filter((batch) => ["draft", "open", "closed", "purchased", "in_transit"].includes(batch.status))
    .reduce((sum, batch) => sum + Number(batch.estimated_total_cost ?? 0), 0);

  return (
    <AdminShell title="Lotes" description="Compras nacionais, importacoes e encomendas agrupadas por lote.">
      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <form className="grid gap-3 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4 md:grid-cols-[minmax(180px,1fr)_150px_150px_180px_auto] md:items-end">
          <label className="block">
            <span className="text-sm font-semibold text-[var(--foreground)]">Busca</span>
            <input
              name="q"
              defaultValue={q}
              placeholder="Codigo ou nome"
              className="mt-2 h-10 w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 text-sm outline-none focus:border-[var(--accent)]"
            />
          </label>
          <label className="block">
            <span className="text-sm font-semibold text-[var(--foreground)]">Status</span>
            <select name="status" defaultValue={status} className="mt-2 h-10 w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 text-sm outline-none focus:border-[var(--accent)]">
              <option value="">Todos</option>
              {purchaseBatchStatusOptions.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-sm font-semibold text-[var(--foreground)]">Tipo</span>
            <select name="type" defaultValue={type} className="mt-2 h-10 w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 text-sm outline-none focus:border-[var(--accent)]">
              <option value="">Todos</option>
              {purchaseBatchTypeOptions.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-sm font-semibold text-[var(--foreground)]">Fornecedor</span>
            <select name="supplierId" defaultValue={supplierId} className="mt-2 h-10 w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 text-sm outline-none focus:border-[var(--accent)]">
              <option value="">Todos</option>
              {suppliers.map((supplier) => (
                <option key={supplier.id} value={supplier.id}>{supplier.name}</option>
              ))}
            </select>
          </label>
          <button className="h-10 rounded-md bg-[var(--accent)] px-4 text-sm font-black text-[#020617] hover:brightness-110">
            Filtrar
          </button>
        </form>
        <Link href="/admin/lotes/novo" className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-md bg-[var(--accent)] px-4 text-sm font-black text-[#020617] hover:brightness-110">
          <Plus size={16} />
          Novo lote
        </Link>
      </div>

      <div className="mb-5 grid gap-4 md:grid-cols-4">
        <MetricCard label="Abertos" value={`${openBatches}`} detail="Lotes em aberto" />
        <MetricCard label="Em transito" value={`${inTransit}`} detail="Compras a caminho" />
        <MetricCard label="Recebidos no mes" value={`${receivedThisMonth}`} detail="Lotes concluidos" />
        <MetricCard label="Custo em aberto" value={formatCurrency(estimatedOpenCost)} detail="Estimativa operacional" />
      </div>

      <div className="overflow-x-auto rounded-lg border border-[var(--border)] bg-[var(--surface)]">
        <table className="w-full min-w-[980px] text-left text-sm">
          <thead className="bg-[var(--surface-strong)] text-[var(--muted)]">
            <tr>
              <th className="px-4 py-3">Codigo</th>
              <th className="px-4 py-3">Nome</th>
              <th className="px-4 py-3">Tipo</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Fornecedor</th>
              <th className="px-4 py-3">Itens</th>
              <th className="px-4 py-3">Estimado</th>
              <th className="px-4 py-3">Real</th>
              <th className="px-4 py-3">Criado em</th>
              <th className="px-4 py-3">Acao</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border)]">
            {batches.map((batch) => (
              <tr key={batch.id}>
                <td className="px-4 py-3 font-semibold text-[var(--foreground)]">{batch.code}</td>
                <td className="px-4 py-3 text-[var(--foreground)]">{batch.name}</td>
                <td className="px-4 py-3"><PurchaseBatchTypeBadge type={batch.type} /></td>
                <td className="px-4 py-3"><PurchaseBatchStatusBadge status={batch.status} /></td>
                <td className="px-4 py-3 text-[var(--muted)]">{batch.suppliers?.name ?? "-"}</td>
                <td className="px-4 py-3 text-[var(--muted)]">{batch.purchase_batch_items?.length ?? 0}</td>
                <td className="px-4 py-3 text-[var(--foreground)]">{formatCurrency(Number(batch.estimated_total_cost))}</td>
                <td className="px-4 py-3 text-[var(--foreground)]">{batch.actual_total_cost === null ? "-" : formatCurrency(Number(batch.actual_total_cost))}</td>
                <td className="px-4 py-3 text-[var(--muted)]">{formatDate(batch.created_at)}</td>
                <td className="px-4 py-3">
                  <Link href={`/admin/lotes/${batch.id}`} className="font-semibold text-[var(--accent)] hover:brightness-110">
                    Abrir
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {batches.length === 0 ? (
        <p className="mt-4 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4 text-sm text-[var(--muted)]">
          Nenhum lote encontrado com os filtros atuais.
        </p>
      ) : null}
    </AdminShell>
  );
}
