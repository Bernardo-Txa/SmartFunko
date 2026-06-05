import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AdminShell } from "@/components/admin/admin-shell";
import { ProductEditForm, type AdminProductEditData } from "@/components/admin/product-edit-form";
import { requireAdminPage } from "@/server/auth/require-admin-page";
import { ProductService } from "@/server/products/product-service";
import { SupplierService } from "@/server/suppliers/supplier-service";

type Props = {
  params: Promise<{ id: string }>;
};

export const metadata: Metadata = {
  title: "Editar produto",
};

export default async function AdminProductDetailPage({ params }: Props) {
  const { id } = await params;
  const admin = await requireAdminPage();
  const productService = new ProductService(undefined, admin.profile.id);

  const { franchises, product, suppliers } = await (async () => {
    try {
    const [productResult, franchises, suppliers] = await Promise.all([
      productService.getAdminProductById(id),
      productService.listFranchiseOptions(),
      new SupplierService(undefined, admin.profile.id).listSuppliers(),
    ]);

      return {
        franchises,
        product: productResult as unknown as AdminProductEditData,
        suppliers,
      };
    } catch {
      notFound();
    }
  })();

  return (
    <AdminShell title={product.name} description="Manutencao do produto cadastrado e suas variantes.">
      <ProductEditForm
        franchises={franchises}
        product={product}
        suppliers={suppliers}
      />
    </AdminShell>
  );
}
