import type { Metadata } from "next";
import { AdminShell } from "@/components/admin/admin-shell";
import { ProductCreateForm } from "@/components/admin/product-create-form";
import { ProductStatusBadge } from "@/components/ui/status-badge";
import { formatCurrency } from "@/lib/format";
import type { ProductStatus } from "@/lib/mock-data";
import { requireAdminPage } from "@/server/auth/require-admin-page";
import { ProductService } from "@/server/products/product-service";

export const metadata: Metadata = {
  title: "Produtos admin",
};

type AdminProduct = {
  id: string;
  name: string;
  franchises?: {
    name?: string;
  } | null;
  product_variants?: Array<{
    sale_price: number;
    sku: string;
    status: "available" | "order_only" | "preorder" | "sold_out" | "hidden";
  }>;
};

type AdminVariantStatus = NonNullable<AdminProduct["product_variants"]>[number]["status"];

function toProductStatus(status: AdminVariantStatus | undefined): ProductStatus {
  return status === "hidden" ? "sold_out" : status ?? "sold_out";
}

export default async function AdminProductsPage() {
  const admin = await requireAdminPage();
  const products = (await new ProductService(
    undefined,
    admin.profile.id,
  ).listAdminProducts({ limit: 150 })) as unknown as AdminProduct[];

  return (
    <AdminShell title="Produtos" description="Cadastro, variantes e publicacao no catalogo.">
      <div className="mb-5">
        <ProductCreateForm />
      </div>
      <p className="mb-3 text-sm text-[var(--muted)]">
        Mostrando os 150 produtos mais recentes. Use a API com `q` para buscar no catalogo completo.
      </p>
      <div className="overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--surface)]">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="bg-[var(--surface-strong)] text-[var(--muted)]">
            <tr>
              <th className="px-4 py-3">Produto</th>
              <th className="px-4 py-3">SKU</th>
              <th className="px-4 py-3">Franquia</th>
              <th className="px-4 py-3">Preco</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border)]">
            {products.map((product) => {
              const variant = product.product_variants?.[0];

              return (
              <tr key={product.id}>
                <td className="px-4 py-3 font-semibold text-[var(--foreground)]">
                  {product.name}
                </td>
                <td className="px-4 py-3 text-[var(--muted)]">{variant?.sku ?? "-"}</td>
                <td className="px-4 py-3 text-[var(--muted)]">{product.franchises?.name ?? "-"}</td>
                <td className="px-4 py-3 text-[var(--foreground)]">
                  {variant ? formatCurrency(variant.sale_price) : "-"}
                </td>
                <td className="px-4 py-3">
                  <ProductStatusBadge status={toProductStatus(variant?.status)} />
                </td>
              </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </AdminShell>
  );
}
