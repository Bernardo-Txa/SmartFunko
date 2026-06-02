import type { Metadata } from "next";
import { AdminShell } from "@/components/admin/admin-shell";
import { InventoryCreateForm } from "@/components/admin/inventory-create-form";
import { requireAdminPage } from "@/server/auth/require-admin-page";
import { InventoryService } from "@/server/inventory/inventory-service";
import { ProductService } from "@/server/products/product-service";

export const metadata: Metadata = {
  title: "Estoque admin",
};

type InventoryListItem = {
  id: string;
  location: string | null;
  sku: string;
  status: string;
  product_variants?: {
    products?: {
      name?: string;
    } | null;
  } | null;
};

type ProductOption = {
  id: string;
  name: string;
  product_variants?: Array<{
    id: string;
    sale_price: number;
    sku: string;
  }>;
};

export default async function AdminInventoryPage() {
  const admin = await requireAdminPage();
  const [inventory, products] = await Promise.all([
    new InventoryService(undefined, admin.profile.id).listInventory(),
    new ProductService(undefined, admin.profile.id).listAdminProducts({ limit: 150 }),
  ]);

  return (
    <AdminShell title="Estoque" description="Controle inicial por unidade e reserva.">
      <div className="mb-5">
        <InventoryCreateForm products={products as unknown as ProductOption[]} />
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {(inventory as unknown as InventoryListItem[]).map((item) => (
          <article
            key={item.id}
            className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5"
          >
            <span className="text-xs font-semibold text-[var(--muted)]">
              Unidade {item.sku}
            </span>
            <strong className="mt-2 block text-sm text-[var(--foreground)]">
              {item.product_variants?.products?.name ?? "Produto"}
            </strong>
            <div className="mt-4 flex items-center justify-between gap-3 text-sm">
              <span className="text-[var(--muted)]">{item.location ?? "Sem local"}</span>
              <span className="rounded-md bg-[var(--surface-strong)] px-2 py-1 font-semibold text-[var(--foreground)]">
                {item.status}
              </span>
            </div>
          </article>
        ))}
      </div>
    </AdminShell>
  );
}
