import type { Metadata } from "next";
import { AdminShell } from "@/components/admin/admin-shell";
import { SupplierForm } from "@/components/admin/supplier-form";
import { requireAdminPage } from "@/server/auth/require-admin-page";

export const metadata: Metadata = {
  title: "Novo fornecedor",
};

export default async function NewSupplierPage() {
  await requireAdminPage();

  return (
    <AdminShell title="Novo fornecedor" description="Cadastro de fornecedor, marca ou coleção especial.">
      <SupplierForm mode="create" />
    </AdminShell>
  );
}
