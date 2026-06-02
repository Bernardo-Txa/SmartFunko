import type { Metadata } from "next";
import { AdminShell } from "@/components/admin/admin-shell";
import { ProductStatusBadge } from "@/components/ui/status-badge";
import { formatCurrency } from "@/lib/format";
import { products } from "@/lib/mock-data";

export const metadata: Metadata = {
  title: "Produtos admin",
};

export default function AdminProductsPage() {
  return (
    <AdminShell title="Produtos" description="Cadastro, variantes e publicacao no catalogo.">
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
            {products.map((product) => (
              <tr key={product.id}>
                <td className="px-4 py-3 font-semibold text-[var(--foreground)]">
                  {product.name}
                </td>
                <td className="px-4 py-3 text-[var(--muted)]">{product.sku}</td>
                <td className="px-4 py-3 text-[var(--muted)]">{product.franchise}</td>
                <td className="px-4 py-3 text-[var(--foreground)]">
                  {formatCurrency(product.price)}
                </td>
                <td className="px-4 py-3">
                  <ProductStatusBadge status={product.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AdminShell>
  );
}
