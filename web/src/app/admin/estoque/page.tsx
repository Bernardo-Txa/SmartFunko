import type { Metadata } from "next";
import { AdminShell } from "@/components/admin/admin-shell";
import { products } from "@/lib/mock-data";

export const metadata: Metadata = {
  title: "Estoque admin",
};

export default function AdminInventoryPage() {
  return (
    <AdminShell title="Estoque" description="Controle inicial por unidade e reserva.">
      <div className="grid gap-4 md:grid-cols-2">
        {products.map((product, index) => (
          <article
            key={product.id}
            className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5"
          >
            <span className="text-xs font-semibold text-[var(--muted)]">
              Unidade INV-{String(index + 1).padStart(4, "0")}
            </span>
            <strong className="mt-2 block text-sm text-[var(--foreground)]">
              {product.name}
            </strong>
            <div className="mt-4 flex items-center justify-between gap-3 text-sm">
              <span className="text-[var(--muted)]">{product.sku}</span>
              <span className="rounded-md bg-[var(--surface-strong)] px-2 py-1 font-semibold text-[var(--foreground)]">
                {product.status === "available" ? "available" : "unavailable"}
              </span>
            </div>
          </article>
        ))}
      </div>
    </AdminShell>
  );
}
