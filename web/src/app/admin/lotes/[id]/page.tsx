import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AdminShell, MetricCard } from "@/components/admin/admin-shell";
import { PurchaseBatchDetailActions } from "@/components/admin/purchase-batch-detail-actions";
import { PurchaseBatchStatusBadge, PurchaseBatchTypeBadge } from "@/components/ui/status-badge";
import { formatCurrency, formatDate } from "@/lib/format";
import { requireAdminPage } from "@/server/auth/require-admin-page";
import { PurchaseBatchService } from "@/server/purchase-batches/purchase-batch-service";

type Props = {
  params: Promise<{ id: string }>;
};

type BatchDetail = {
  actual_total_cost: number | string | null;
  cancelled_at: string | null;
  closed_at: string | null;
  code: string;
  created_at: string;
  description: string | null;
  estimated_total_cost: number | string;
  id: string;
  in_transit_at?: string | null;
  name: string;
  notes: string | null;
  opened_at: string | null;
  purchased_at: string | null;
  received_at: string | null;
  shipped_at: string | null;
  status: string;
  type: string;
  purchase_batch_items?: Array<{
    actual_total_cost: number | string | null;
    actual_unit_cost: number | string | null;
    estimated_total_cost: number | string | null;
    estimated_unit_cost: number | string | null;
    id: string;
    order_item_id: string | null;
    quantity: number;
    status: string;
    order_items?: {
      total_price?: number | string | null;
      unit_price?: number | string | null;
    } | null;
    orders?: {
      id?: string;
      order_number?: string;
    } | null;
    product_variants?: {
      sku?: string | null;
      products?: {
        name?: string | null;
      } | null;
    } | null;
  }>;
  suppliers?: {
    name?: string | null;
  } | null;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  return {
    title: `Lote ${id}`,
  };
}

export default async function PurchaseBatchDetailPage({ params }: Props) {
  const { id } = await params;
  const admin = await requireAdminPage();

  let batch: BatchDetail;

  try {
    batch = (await new PurchaseBatchService(undefined, admin.profile.id).getPurchaseBatchById(id)) as unknown as BatchDetail;
  } catch {
    notFound();
  }

  const actualCost = batch.actual_total_cost === null ? null : Number(batch.actual_total_cost);
  const estimatedCost = Number(batch.estimated_total_cost ?? 0);

  return (
    <AdminShell title={`${batch.code} · ${batch.name}`} description="Detalhe do lote, custos, itens de pedido e recebimento.">
      <div className="grid gap-5">
        <section className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <PurchaseBatchStatusBadge status={batch.status} />
                <PurchaseBatchTypeBadge type={batch.type} />
                <span className="rounded-md bg-[var(--surface-strong)] px-2 py-1 text-xs font-semibold text-[var(--muted)]">
                  {batch.suppliers?.name ?? "Sem fornecedor"}
                </span>
              </div>
              <p className="mt-4 max-w-3xl text-sm leading-6 text-[var(--muted)]">
                {batch.description || "Sem descricao."}
              </p>
            </div>
            <div className="grid gap-1 text-sm lg:text-right">
              <span>Criado em {formatDate(batch.created_at)}</span>
              <span>Aberto {batch.opened_at ? formatDate(batch.opened_at) : "-"}</span>
              <span>Fechado {batch.closed_at ? formatDate(batch.closed_at) : "-"}</span>
              <span>Comprado {batch.purchased_at ? formatDate(batch.purchased_at) : "-"}</span>
              <span>Enviado {batch.shipped_at ? formatDate(batch.shipped_at) : "-"}</span>
              <span>Recebido {batch.received_at ? formatDate(batch.received_at) : "-"}</span>
            </div>
          </div>
        </section>

        <div className="grid gap-4 md:grid-cols-4">
          <MetricCard label="Itens" value={`${batch.purchase_batch_items?.length ?? 0}`} detail="Itens vinculados" />
          <MetricCard label="Custo estimado" value={formatCurrency(estimatedCost)} detail="Total informado no lote" />
          <MetricCard label="Custo real" value={actualCost === null ? "-" : formatCurrency(actualCost)} detail="Total confirmado" />
          <MetricCard label="Diferenca" value={actualCost === null ? "-" : formatCurrency(actualCost - estimatedCost)} detail="Real menos estimado" />
        </div>

        <PurchaseBatchDetailActions
          batchId={batch.id}
          items={batch.purchase_batch_items ?? []}
          status={batch.status}
        />

        <section className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5">
          <h2 className="text-lg font-bold text-[var(--foreground)]">Notas</h2>
          <p className="mt-3 text-sm leading-6 text-[var(--muted)]">{batch.notes || "Sem notas internas."}</p>
        </section>
      </div>
    </AdminShell>
  );
}
