import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AdminShell } from "@/components/admin/admin-shell";
import { SupplierForm, type SupplierFormData } from "@/components/admin/supplier-form";
import { requireAdminPage } from "@/server/auth/require-admin-page";
import { SupplierService } from "@/server/suppliers/supplier-service";

type Props = {
  params: Promise<{ id: string }>;
};

export const metadata: Metadata = {
  title: "Editar fornecedor",
};

export default async function EditSupplierPage({ params }: Props) {
  const { id } = await params;
  const admin = await requireAdminPage();
  let supplier: SupplierFormData;

  try {
    supplier = (await new SupplierService(undefined, admin.profile.id).getSupplierById(id)) as SupplierFormData;
  } catch {
    notFound();
  }

  return (
    <AdminShell title={supplier.name} description="Edicao de fornecedor/marca.">
      <SupplierForm mode="edit" supplier={supplier} />
    </AdminShell>
  );
}
