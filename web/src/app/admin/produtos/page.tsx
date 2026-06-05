import type { Metadata } from "next";
import { AdminProductSearch } from "@/components/admin/admin-product-search";
import { AdminShell } from "@/components/admin/admin-shell";
import { ProductCreateForm } from "@/components/admin/product-create-form";
import { requireAdminPage } from "@/server/auth/require-admin-page";
import { SupplierService } from "@/server/suppliers/supplier-service";

export const metadata: Metadata = {
  title: "Produtos admin",
};

export default async function AdminProductsPage() {
  const admin = await requireAdminPage();
  const suppliers = await new SupplierService(undefined, admin.profile.id).listSuppliers();

  return (
    <AdminShell title="Produtos" description="Cadastro, variantes e publicacao no catalogo.">
      <div className="mb-5">
        <ProductCreateForm suppliers={suppliers} />
      </div>
      <AdminProductSearch />
    </AdminShell>
  );
}
