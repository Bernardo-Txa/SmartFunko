import type { Metadata } from "next";
import { AdminShell } from "@/components/admin/admin-shell";
import { PurchaseBatchCreateForm } from "@/components/admin/purchase-batch-create-form";
import { requireAdminPage } from "@/server/auth/require-admin-page";
import { SupplierService } from "@/server/suppliers/supplier-service";

export const metadata: Metadata = {
  title: "Novo lote",
};

export default async function NewPurchaseBatchPage() {
  const admin = await requireAdminPage();
  const suppliers = await new SupplierService(undefined, admin.profile.id).listSuppliers();

  return (
    <AdminShell title="Novo lote" description="Crie um lote para compras nacionais, importacoes, collabs ou outros agrupamentos.">
      <PurchaseBatchCreateForm suppliers={suppliers.map((supplier) => ({ id: supplier.id, name: supplier.name }))} />
    </AdminShell>
  );
}
