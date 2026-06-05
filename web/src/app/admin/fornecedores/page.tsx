import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";
import { AdminShell } from "@/components/admin/admin-shell";
import { requireAdminPage } from "@/server/auth/require-admin-page";
import { SupplierService } from "@/server/suppliers/supplier-service";

export const metadata: Metadata = {
  title: "Fornecedores admin",
};

const supplierStatusLabels: Record<string, string> = {
  active: "Ativo",
  hidden: "Oculto",
  inactive: "Inativo",
};

export default async function AdminSuppliersPage() {
  const admin = await requireAdminPage();
  const suppliers = await new SupplierService(undefined, admin.profile.id).listSuppliers();

  return (
    <AdminShell title="Fornecedores" description="Marcas, parceiros e colecoes especiais do catalogo.">
      <div className="mb-4 flex justify-end">
        <Link
          href="/admin/fornecedores/novo"
          className="inline-flex h-10 items-center gap-2 rounded-md bg-[var(--accent)] px-4 text-sm font-black text-[#020617] hover:brightness-110"
        >
          <Plus size={16} aria-hidden="true" />
          Novo fornecedor
        </Link>
      </div>
      <div className="overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--surface)]">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="bg-[var(--surface-strong)] text-[var(--muted)]">
            <tr>
              <th className="px-4 py-3">Nome</th>
              <th className="px-4 py-3">Slug</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Ordem</th>
              <th className="px-4 py-3">Publico</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border)]">
            {suppliers.map((supplier) => (
              <tr key={supplier.id}>
                <td className="px-4 py-3 font-semibold text-[var(--foreground)]">
                  <Link href={`/admin/fornecedores/${supplier.id}`} className="hover:text-[var(--accent)]">
                    {supplier.name}
                  </Link>
                </td>
                <td className="px-4 py-3 text-[var(--muted)]">{supplier.slug}</td>
                <td className="px-4 py-3 text-[var(--muted)]">{supplierStatusLabels[supplier.status] ?? supplier.status}</td>
                <td className="px-4 py-3 text-[var(--muted)]">{supplier.sort_order}</td>
                <td className="px-4 py-3">
                  <Link
                    href={`/fornecedores/${supplier.slug}`}
                    className="font-semibold text-[var(--accent)] hover:brightness-110"
                  >
                    Abrir
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AdminShell>
  );
}
