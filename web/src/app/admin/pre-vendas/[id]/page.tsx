import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AdminShell } from "@/components/admin/admin-shell";
import { PreorderEditForm } from "@/components/admin/preorder-edit-form";
import { requireAdminPage } from "@/server/auth/require-admin-page";
import { HttpError } from "@/server/http/errors";
import { PreorderService } from "@/server/preorders/preorder-service";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Editar pre-venda",
};

type Props = {
  params: Promise<{
    id: string;
  }>;
};

export default async function AdminPreorderEditPage({ params }: Props) {
  const admin = await requireAdminPage("/admin/pre-vendas");
  const { id } = await params;
  let item;

  try {
    item = await new PreorderService(undefined, admin.profile.id).getAdminPreorderItemById(id);
  } catch (error) {
    if (error instanceof HttpError && error.status === 404) {
      notFound();
    }

    throw error;
  }

  return (
    <AdminShell
      title={item.title}
      description="Edicao da pre-venda temporaria e dos textos exibidos para o cliente."
    >
      <PreorderEditForm item={item} />
    </AdminShell>
  );
}
