import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminShell, MetricCard } from "@/components/admin/admin-shell";
import { ProductEditForm, type AdminProductEditData } from "@/components/admin/product-edit-form";
import { formatCurrency } from "@/lib/format";
import { requireAdminPage } from "@/server/auth/require-admin-page";
import { InventoryService } from "@/server/inventory/inventory-service";
import { ProductService } from "@/server/products/product-service";
import { SupplierService } from "@/server/suppliers/supplier-service";

type Props = {
  params: Promise<{ id: string }>;
};

export const metadata: Metadata = {
  title: "Editar produto",
};

type ProductInventoryItem = {
  landed_cost: number | string | null;
  purchase_cost: number | string | null;
  status: string;
};

function productInventorySummary(items: ProductInventoryItem[]) {
  return items.reduce(
    (summary, item) => {
      summary.total += 1;
      summary.value += Number(item.landed_cost ?? item.purchase_cost ?? 0);

      if (item.status === "available") {
        summary.available += 1;
      }

      if (item.status === "reserved") {
        summary.reserved += 1;
      }

      if (item.status === "sold") {
        summary.sold += 1;
      }

      if (item.status === "damaged") {
        summary.damaged += 1;
      }

      return summary;
    },
    {
      available: 0,
      damaged: 0,
      reserved: 0,
      sold: 0,
      total: 0,
      value: 0,
    },
  );
}

export default async function AdminProductDetailPage({ params }: Props) {
  const { id } = await params;
  const admin = await requireAdminPage();
  const productService = new ProductService(undefined, admin.profile.id);
  const inventoryService = new InventoryService(undefined, admin.profile.id);

  const { franchises, inventory, product, suppliers } = await (async () => {
    try {
      const [productResult, franchises, suppliers, inventory] = await Promise.all([
        productService.getAdminProductById(id),
        productService.listFranchiseOptions(),
        new SupplierService(undefined, admin.profile.id).listSuppliers(),
        inventoryService.listInventoryForProduct(id),
      ]);

      return {
        franchises,
        inventory: inventory as unknown as ProductInventoryItem[],
        product: productResult as unknown as AdminProductEditData,
        suppliers,
      };
    } catch {
      notFound();
    }
  })();
  const inventorySummary = productInventorySummary(inventory);

  return (
    <AdminShell title={product.name} description="Manutencao do produto cadastrado e suas variantes.">
      <section className="mb-6 grid gap-4">
        <div className="grid gap-4 md:grid-cols-5">
          <MetricCard label="Disponíveis" value={`${inventorySummary.available}`} detail="Unidades prontas" />
          <MetricCard label="Reservadas" value={`${inventorySummary.reserved}`} detail="Vinculadas a pedido" />
          <MetricCard label="Vendidas" value={`${inventorySummary.sold}`} detail="Baixadas" />
          <MetricCard label="Avariadas" value={`${inventorySummary.damaged}`} detail="Fora de venda" />
          <MetricCard label="Valor estoque" value={formatCurrency(inventorySummary.value)} detail={`${inventorySummary.total} unidade(s)`} />
        </div>
        <div className="flex flex-wrap gap-3">
          <Link
            href={`/admin/estoque?q=${encodeURIComponent(product.name)}`}
            className="inline-flex h-10 items-center justify-center rounded-md border border-[var(--border)] px-3 text-sm font-semibold text-[var(--foreground)] hover:bg-[var(--surface-strong)]"
          >
            Ver estoque
          </Link>
          <Link
            href="/admin/estoque"
            className="inline-flex h-10 items-center justify-center rounded-md border border-[var(--border)] px-3 text-sm font-semibold text-[var(--foreground)] hover:bg-[var(--surface-strong)]"
          >
            Adicionar unidade
          </Link>
        </div>
      </section>
      <ProductEditForm
        franchises={franchises}
        product={product}
        suppliers={suppliers}
      />
    </AdminShell>
  );
}
