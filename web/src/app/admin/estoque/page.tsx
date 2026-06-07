import type { Metadata } from "next";
import Link from "next/link";
import { AdminShell, MetricCard } from "@/components/admin/admin-shell";
import { InventoryCreateForm } from "@/components/admin/inventory-create-form";
import { InventoryStatusBadge } from "@/components/ui/status-badge";
import { formatCurrency, formatDate } from "@/lib/format";
import { inventoryStatusOptions } from "@/lib/status-labels";
import { requireAdminPage } from "@/server/auth/require-admin-page";
import { InventoryService } from "@/server/inventory/inventory-service";

export const metadata: Metadata = {
  title: "Estoque admin",
};

type InventoryListItem = {
  created_at: string;
  id: string;
  landed_cost: number | string | null;
  location: string | null;
  product_variant_id: string;
  purchase_cost: number | string | null;
  reserved_for_order_item_id: string | null;
  sku: string;
  status: string;
  product_variants?: {
    sku?: string;
    products?: {
      name?: string;
    } | null;
  } | null;
  reserved_order_item?: {
    orders?: {
      id?: string;
      order_number?: string;
    } | null;
  } | null;
};

type Props = {
  searchParams?: Promise<{
    location?: string;
    q?: string;
    status?: string;
  }>;
};

const statusCountKeys = ["available", "reserved", "sold", "in_transit", "damaged"] as const;

function getParam(value: string | undefined) {
  return value?.trim() ?? "";
}

function asMoney(value: number | string | null | undefined) {
  return Number(value ?? 0);
}

function itemStockValue(item: InventoryListItem) {
  return asMoney(item.landed_cost ?? item.purchase_cost);
}

function summarizeInventory(items: InventoryListItem[]) {
  const counts = Object.fromEntries(statusCountKeys.map((status) => [status, 0])) as Record<
    (typeof statusCountKeys)[number],
    number
  >;
  const availableByProduct = new Map<string, number>();
  const productsWithInventory = new Set<string>();
  let totalValue = 0;
  let availableValue = 0;

  for (const item of items) {
    const value = itemStockValue(item);
    const productName = item.product_variants?.products?.name ?? "Produto sem nome";

    productsWithInventory.add(productName);
    totalValue += value;

    if (item.status in counts) {
      counts[item.status as keyof typeof counts] += 1;
    }

    if (item.status === "available") {
      availableValue += value;
      availableByProduct.set(productName, (availableByProduct.get(productName) ?? 0) + 1);
    }
  }

  const topAvailableProducts = Array.from(availableByProduct.entries())
    .sort((first, second) => second[1] - first[1])
    .slice(0, 5);

  const productsWithoutAvailable = Array.from(productsWithInventory)
    .filter((name) => !availableByProduct.has(name))
    .sort()
    .slice(0, 8);

  const oldestItems = items
    .slice()
    .sort((first, second) => first.created_at.localeCompare(second.created_at))
    .slice(0, 5);

  return {
    availableValue,
    counts,
    oldestItems,
    productsWithoutAvailable,
    topAvailableProducts,
    totalValue,
  };
}

export default async function AdminInventoryPage({ searchParams }: Props) {
  const admin = await requireAdminPage();
  const params = await searchParams;
  const location = getParam(params?.location);
  const search = getParam(params?.q);
  const status = getParam(params?.status);
  const inventoryService = new InventoryService(undefined, admin.profile.id);
  const [allInventory, inventory] = await Promise.all([
    inventoryService.listInventory(),
    inventoryService.listInventory({
      location: location || undefined,
      search: search || undefined,
      status: status || undefined,
    }),
  ]);
  const allItems = allInventory as unknown as InventoryListItem[];
  const filteredItems = inventory as unknown as InventoryListItem[];
  const summary = summarizeInventory(allItems);

  return (
    <AdminShell title="Estoque 2.0" description="Rastreabilidade por unidade, custos, reserva e historico operacional.">
      <div className="grid gap-6">
        <div className="grid gap-4 md:grid-cols-4">
          <MetricCard label="Total de unidades" value={`${allItems.length}`} detail="Todas as unidades cadastradas" />
          <MetricCard label="Disponíveis" value={`${summary.counts.available}`} detail="Prontas para reserva" />
          <MetricCard label="Reservadas" value={`${summary.counts.reserved}`} detail="Vinculadas a pedido" />
          <MetricCard label="Vendidas" value={`${summary.counts.sold}`} detail="Baixadas do estoque" />
          <MetricCard label="Em trânsito" value={`${summary.counts.in_transit}`} detail="Aguardando recebimento" />
          <MetricCard label="Avariadas" value={`${summary.counts.damaged}`} detail="Fora da disponibilidade" />
          <MetricCard label="Valor em estoque" value={formatCurrency(summary.totalValue)} detail="Custo final ou compra" />
          <MetricCard label="Valor disponível" value={formatCurrency(summary.availableValue)} detail="Somente unidades disponíveis" />
        </div>

        <InventoryCreateForm />

        <form className="grid gap-3 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4 md:grid-cols-[minmax(180px,1fr)_170px_170px_auto] md:items-end">
          <label className="block">
            <span className="text-sm font-semibold text-[var(--foreground)]">Produto ou SKU</span>
            <input
              name="q"
              defaultValue={search}
              placeholder="Nome, SKU da variante ou unidade"
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
              {inventoryStatusOptions.map(({ label, value }) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-sm font-semibold text-[var(--foreground)]">Localização</span>
            <input
              name="location"
              defaultValue={location}
              placeholder="Prateleira, caixa..."
              className="mt-2 h-10 w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 text-sm outline-none focus:border-[var(--accent)]"
            />
          </label>
          <button className="h-10 rounded-md bg-[var(--accent)] px-4 text-sm font-black text-[#020617] hover:brightness-110">
            Filtrar
          </button>
        </form>

        <section className="overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--surface)]">
          <div className="border-b border-[var(--border)] p-5">
            <h2 className="text-lg font-bold text-[var(--foreground)]">Unidades</h2>
            <p className="mt-1 text-sm text-[var(--muted)]">{filteredItems.length} unidade(s) nos filtros atuais.</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1040px] text-left text-sm">
              <thead className="bg-[var(--surface-strong)] text-[var(--muted)]">
                <tr>
                  <th className="px-4 py-3">Produto</th>
                  <th className="px-4 py-3">SKU</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Localização</th>
                  <th className="px-4 py-3">Custo compra</th>
                  <th className="px-4 py-3">Custo final</th>
                  <th className="px-4 py-3">Pedido</th>
                  <th className="px-4 py-3">Criado em</th>
                  <th className="px-4 py-3">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {filteredItems.map((item) => (
                  <tr key={item.id}>
                    <td className="px-4 py-3 font-semibold text-[var(--foreground)]">
                      {item.product_variants?.products?.name ?? "Produto"}
                    </td>
                    <td className="px-4 py-3 text-[var(--muted)]">
                      <span className="block text-[var(--foreground)]">{item.sku}</span>
                      <span className="text-xs">{item.product_variants?.sku ?? "-"}</span>
                    </td>
                    <td className="px-4 py-3">
                      <InventoryStatusBadge status={item.status} />
                    </td>
                    <td className="px-4 py-3 text-[var(--muted)]">{item.location ?? "Sem local"}</td>
                    <td className="px-4 py-3 text-[var(--foreground)]">{formatCurrency(asMoney(item.purchase_cost))}</td>
                    <td className="px-4 py-3 text-[var(--foreground)]">{formatCurrency(asMoney(item.landed_cost))}</td>
                    <td className="px-4 py-3 text-[var(--muted)]">
                      {item.reserved_order_item?.orders?.id ? (
                        <Link
                          href={`/admin/pedidos/${item.reserved_order_item.orders.id}`}
                          className="font-semibold text-[var(--foreground)] hover:text-[var(--accent)]"
                        >
                          {item.reserved_order_item.orders.order_number ?? "Pedido"}
                        </Link>
                      ) : (
                        "-"
                      )}
                    </td>
                    <td className="px-4 py-3 text-[var(--muted)]">{formatDate(item.created_at)}</td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/admin/estoque/${item.id}`}
                        className="inline-flex h-9 items-center justify-center rounded-md border border-[var(--border)] px-3 text-sm font-semibold text-[var(--foreground)] hover:bg-[var(--surface-strong)]"
                      >
                        Detalhe
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-3">
          <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5">
            <h2 className="text-lg font-bold text-[var(--foreground)]">Mais disponíveis</h2>
            <div className="mt-4 grid gap-2 text-sm">
              {summary.topAvailableProducts.map(([name, quantity]) => (
                <div key={name} className="flex items-center justify-between gap-3">
                  <span className="text-[var(--muted)]">{name}</span>
                  <strong className="text-[var(--foreground)]">{quantity}</strong>
                </div>
              ))}
              {summary.topAvailableProducts.length === 0 ? (
                <p className="text-sm text-[var(--muted)]">Nenhum produto com estoque disponível.</p>
              ) : null}
            </div>
          </div>
          <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5">
            <h2 className="text-lg font-bold text-[var(--foreground)]">Sem disponível</h2>
            <div className="mt-4 grid gap-2 text-sm text-[var(--muted)]">
              {summary.productsWithoutAvailable.map((name) => (
                <span key={name}>{name}</span>
              ))}
              {summary.productsWithoutAvailable.length === 0 ? <span>Nenhum alerta simples.</span> : null}
            </div>
          </div>
          <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5">
            <h2 className="text-lg font-bold text-[var(--foreground)]">Mais antigos</h2>
            <div className="mt-4 grid gap-2 text-sm">
              {summary.oldestItems.map((item) => (
                <Link
                  key={item.id}
                  href={`/admin/estoque/${item.id}`}
                  className="flex items-center justify-between gap-3 text-[var(--muted)] hover:text-[var(--foreground)]"
                >
                  <span>{item.sku}</span>
                  <span>{formatDate(item.created_at)}</span>
                </Link>
              ))}
            </div>
          </div>
        </section>
      </div>
    </AdminShell>
  );
}
