import type { Metadata } from "next";
import { AdminShell } from "@/components/admin/admin-shell";
import { ProductCreateForm } from "@/components/admin/product-create-form";
import { requireAdminPage } from "@/server/auth/require-admin-page";
import { SupplierService } from "@/server/suppliers/supplier-service";

export const metadata: Metadata = {
  title: "Novo produto",
};

export default async function AdminNewProductPage() {
  const admin = await requireAdminPage();
  const suppliers = await new SupplierService(undefined, admin.profile.id).listSuppliers();

  return (
    <AdminShell title="Novo produto" description="Cadastro de produto, imagem principal e primeira variante.">
      <ProductCreateForm suppliers={suppliers} />
    </AdminShell>
  );
}
