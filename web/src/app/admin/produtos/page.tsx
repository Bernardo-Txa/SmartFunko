import type { Metadata } from "next";
import { AdminProductSearch } from "@/components/admin/admin-product-search";
import { AdminShell } from "@/components/admin/admin-shell";
import { ProductCreateForm } from "@/components/admin/product-create-form";
import { requireAdminPage } from "@/server/auth/require-admin-page";

export const metadata: Metadata = {
  title: "Produtos admin",
};

export default async function AdminProductsPage() {
  await requireAdminPage();

  return (
    <AdminShell title="Produtos" description="Cadastro, variantes e publicacao no catalogo.">
      <div className="mb-5">
        <ProductCreateForm />
      </div>
      <AdminProductSearch />
    </AdminShell>
  );
}
