import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminShell } from "@/components/admin/admin-shell";
import { RareCollectibleForm } from "@/components/admin/rare-collectible-form";
import { requireAdminPage } from "@/server/auth/require-admin-page";
import { ProductService } from "@/server/products/product-service";
import { RareCollectibleService } from "@/server/rare-collectibles/rare-collectible-service";

type Props = {
  params: Promise<{ id: string }>;
};

export const metadata: Metadata = {
  title: "Editar Acervo Raro",
};

export default async function AdminRareCollectibleDetailPage({ params }: Props) {
  const { id } = await params;
  const admin = await requireAdminPage();
  const productService = new ProductService(undefined, admin.profile.id);
  const rareService = new RareCollectibleService(undefined, admin.profile.id);

  const { franchises, item } = await (async () => {
    try {
      const [franchises, item] = await Promise.all([
        productService.listFranchiseOptions(),
        rareService.getAdminRareCollectibleById(id),
      ]);

      return { franchises, item };
    } catch {
      notFound();
    }
  })();

  return (
    <AdminShell
      title={item.name}
      description="Manutenção completa da peça rara: autenticidade, documentos, preço e apresentação pública."
    >
      <div className="grid gap-4">
        <div className="flex flex-wrap gap-2">
          <Link
            href="/admin/acervo-raro"
            className="inline-flex h-10 items-center justify-center rounded-md border border-[var(--border)] px-4 text-sm font-bold text-[var(--foreground)] hover:bg-[var(--surface-strong)]"
          >
            Voltar
          </Link>
          <Link
            href={`/acervo-raro/${item.slug}`}
            target="_blank"
            className="inline-flex h-10 items-center justify-center rounded-md border border-amber-200/24 px-4 text-sm font-bold text-amber-100 hover:bg-amber-200/8"
          >
            Ver página pública
          </Link>
        </div>
        <RareCollectibleForm franchises={franchises} item={item} />
      </div>
    </AdminShell>
  );
}
