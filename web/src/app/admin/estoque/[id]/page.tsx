import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminShell, MetricCard } from "@/components/admin/admin-shell";
import { InventoryAdjustForm } from "@/components/admin/inventory-adjust-form";
import { InventoryStatusBadge } from "@/components/ui/status-badge";
import { formatCurrency, formatDate } from "@/lib/format";
import { getInventoryMovementTypeMeta, getInventoryStatusMeta } from "@/lib/status-labels";
import { requireAdminPage } from "@/server/auth/require-admin-page";
import { InventoryService } from "@/server/inventory/inventory-service";

type Props = {
  params: Promise<{ id: string }>;
};

type InventoryMovement = {
  created_at: string;
  id: string;
  new_landed_cost: number | string | null;
  new_location: string | null;
  new_purchase_cost: number | string | null;
  new_status: string | null;
  notes: string | null;
  previous_landed_cost: number | string | null;
  previous_location: string | null;
  previous_purchase_cost: number | string | null;
  previous_status: string | null;
  type: string;
  orders?: {
    id?: string;
    order_number?: string;
  } | null;
  profiles?: {
    name?: string;
  } | null;
};

type InventoryDetail = {
  created_at: string;
  id: string;
  inventory_movements?: InventoryMovement[];
  landed_cost: number | string | null;
  location: string | null;
  notes: string | null;
  product_variant_id: string;
  purchase_cost: number | string | null;
  reserved_for_order_item_id: string | null;
  sku: string;
  status: string;
  updated_at: string;
  product_variants?: {
    sku?: string;
    products?: {
      name?: string;
      slug?: string;
    } | null;
  } | null;
  reserved_order_item?: {
    orders?: {
      id?: string;
      order_number?: string;
      status?: string;
    } | null;
  } | null;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  return {
    title: `Estoque ${id}`,
  };
}

function asMoney(value: number | string | null | undefined) {
  return Number(value ?? 0);
}

function costLabel(value: number | string | null) {
  return value === null ? "-" : formatCurrency(asMoney(value));
}

function statusLabel(status: string | null) {
  return status ? getInventoryStatusMeta(status).label : "-";
}

function movementChanges(movement: InventoryMovement) {
  const changes: string[] = [];

  if (movement.previous_status !== movement.new_status) {
    changes.push(`${statusLabel(movement.previous_status)} -> ${statusLabel(movement.new_status)}`);
  }

  if (movement.previous_location !== movement.new_location) {
    changes.push(`${movement.previous_location ?? "Sem local"} -> ${movement.new_location ?? "Sem local"}`);
  }

  if (movement.previous_purchase_cost !== movement.new_purchase_cost) {
    changes.push(`Compra ${costLabel(movement.previous_purchase_cost)} -> ${costLabel(movement.new_purchase_cost)}`);
  }

  if (movement.previous_landed_cost !== movement.new_landed_cost) {
    changes.push(`Final ${costLabel(movement.previous_landed_cost)} -> ${costLabel(movement.new_landed_cost)}`);
  }

  return changes.length > 0 ? changes : ["Registro operacional"];
}

export default async function AdminInventoryDetailPage({ params }: Props) {
  const { id } = await params;
  const admin = await requireAdminPage();
  let item: InventoryDetail;

  try {
    item = (await new InventoryService(
      undefined,
      admin.profile.id,
    ).getInventoryItemWithMovements(id)) as unknown as InventoryDetail;
  } catch {
    notFound();
  }

  const product = item.product_variants?.products;
  const reservedOrder = item.reserved_order_item?.orders;

  return (
    <AdminShell title={`Unidade ${item.sku}`} description="Detalhe da unidade fisica e rastreabilidade de estoque.">
      <div className="grid gap-6">
        <div className="flex flex-wrap gap-3">
          <Link
            href="/admin/estoque"
            className="inline-flex h-10 items-center justify-center rounded-md border border-[var(--border)] px-3 text-sm font-semibold text-[var(--foreground)] hover:bg-[var(--surface-strong)]"
          >
            Voltar ao estoque
          </Link>
          {reservedOrder?.id ? (
            <Link
              href={`/admin/pedidos/${reservedOrder.id}`}
              className="inline-flex h-10 items-center justify-center rounded-md border border-[var(--border)] px-3 text-sm font-semibold text-[var(--foreground)] hover:bg-[var(--surface-strong)]"
            >
              Ver pedido {reservedOrder.order_number}
            </Link>
          ) : null}
        </div>

        <section className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <InventoryStatusBadge status={item.status} />
              <h2 className="mt-4 text-xl font-bold text-[var(--foreground)]">
                {product?.name ?? "Produto"}
              </h2>
              <p className="mt-1 text-sm text-[var(--muted)]">
                Variante {item.product_variants?.sku ?? "-"} · Unidade {item.sku}
              </p>
            </div>
            <div className="grid gap-1 text-sm md:text-right">
              <span>Criado em {formatDate(item.created_at)}</span>
              <span>Atualizado em {formatDate(item.updated_at)}</span>
            </div>
          </div>
        </section>

        <div className="grid gap-4 md:grid-cols-4">
          <MetricCard label="Status atual" value={getInventoryStatusMeta(item.status).label} detail="Estado operacional" />
          <MetricCard label="Localização" value={item.location ?? "-"} detail="Posição física" />
          <MetricCard label="Custo compra" value={costLabel(item.purchase_cost)} detail="Custo base" />
          <MetricCard label="Custo final" value={costLabel(item.landed_cost)} detail="Compra + custos" />
        </div>

        <section className="grid gap-4 md:grid-cols-2">
          <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5">
            <h2 className="text-lg font-bold text-[var(--foreground)]">Vínculos</h2>
            <div className="mt-4 grid gap-2 text-sm text-[var(--muted)]">
              <span>Produto: {product?.name ?? "-"}</span>
              <span>SKU variante: {item.product_variants?.sku ?? "-"}</span>
              <span>Pedido reservado: {reservedOrder?.order_number ?? "-"}</span>
              <span>Notas: {item.notes ?? "-"}</span>
            </div>
          </div>
          <InventoryAdjustForm item={item} />
        </section>

        <section className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5">
          <h2 className="text-lg font-bold text-[var(--foreground)]">Histórico de movimentos</h2>
          <div className="mt-4 grid gap-3">
            {(item.inventory_movements ?? []).map((movement) => {
              const meta = getInventoryMovementTypeMeta(movement.type);

              return (
                <article key={movement.id} className="rounded-lg border border-[var(--border)] p-4 text-sm">
                  <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                    <div>
                      <strong className="text-[var(--foreground)]">{meta.label}</strong>
                      <div className="mt-2 flex flex-wrap gap-2 text-[var(--muted)]">
                        {movementChanges(movement).map((change) => (
                          <span key={change} className="rounded-md bg-[var(--surface-strong)] px-2 py-1">
                            {change}
                          </span>
                        ))}
                      </div>
                    </div>
                    <span className="text-[var(--muted)]">{formatDate(movement.created_at)}</span>
                  </div>
                  <p className="mt-3 text-[var(--muted)]">
                    {movement.profiles?.name ?? "Sistema"}
                    {movement.orders?.order_number ? ` · Pedido ${movement.orders.order_number}` : ""}
                  </p>
                  {movement.notes ? <p className="mt-2 text-[var(--muted)]">{movement.notes}</p> : null}
                </article>
              );
            })}
            {(item.inventory_movements ?? []).length === 0 ? (
              <p className="text-sm text-[var(--muted)]">Nenhum movimento registrado para esta unidade.</p>
            ) : null}
          </div>
        </section>
      </div>
    </AdminShell>
  );
}
