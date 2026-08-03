import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Building2 } from "lucide-react";
import { AdminProductSearch } from "@/components/admin/admin-product-search";
import { AdminShell } from "@/components/admin/admin-shell";
import { ProductCreateForm } from "@/components/admin/product-create-form";
import { requireAdminPage } from "@/server/auth/require-admin-page";
import { SupplierService } from "@/server/suppliers/supplier-service";

export const metadata: Metadata = {
  title: "Produtos admin",
};

type Props = {
  searchParams?: Promise<{
    area?: string;
  }>;
};

export default async function AdminProductsPage({ searchParams }: Props) {
  const admin = await requireAdminPage();
  const params = await searchParams;
  const suppliers = await new SupplierService(undefined, admin.profile.id).listSuppliers();
  const area = params?.area?.trim() || "general";
  const selectedSupplier = area === "general"
    ? null
    : suppliers.find((supplier) => supplier.slug === area || supplier.id === area) ?? null;
  const selectedSupplierId = selectedSupplier?.id ?? null;
  const areaTitle = selectedSupplier ? selectedSupplier.name : "Produtos gerais";
  const baseCardClassName = "group flex h-44 min-w-0 flex-col overflow-hidden rounded-lg border bg-[var(--surface)] p-4 transition hover:-translate-y-0.5 hover:bg-[var(--surface-strong)]";
  const activeCardClassName = "border-[var(--accent)] bg-[var(--surface-strong)] shadow-[0_18px_44px_rgba(34,211,238,0.10)]";
  const inactiveCardClassName = "border-[var(--border)]";

  return (
    <AdminShell title="Produtos 2.0" description="Manutencao separada por catalogo geral e collabs.">
      <div className="grid min-w-0 gap-6">
        <section className="grid min-w-0 auto-rows-fr gap-4 md:grid-cols-2 xl:grid-cols-5">
          <Link
            href="/admin/produtos?area=general"
            scroll={false}
            className={[
              baseCardClassName,
              area === "general" ? activeCardClassName : inactiveCardClassName,
            ].join(" ")}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="relative flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-[var(--border)] bg-white p-2">
                <Image
                  src="/brand/SmartFunko.png"
                  alt="Smart Funkos"
                  width={96}
                  height={40}
                  className="h-auto max-h-12 w-auto object-contain"
                />
              </div>
              <span className="shrink-0 rounded-full bg-[var(--background)] px-2 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-[var(--muted)]">
                Geral
              </span>
            </div>
            <h2 className="mt-4 truncate font-black text-[var(--foreground)]">Produtos gerais</h2>
            <p className="mt-1 line-clamp-2 text-sm leading-6 text-[var(--muted)]">Catalogo principal da Smart Funkos.</p>
          </Link>
          {suppliers.map((supplier) => (
            <Link
              key={supplier.id}
              href={`/admin/produtos?area=${supplier.slug}`}
              scroll={false}
              className={[
                baseCardClassName,
                selectedSupplier?.id === supplier.id ? activeCardClassName : inactiveCardClassName,
              ].join(" ")}
              style={supplier.accent_color && selectedSupplier?.id !== supplier.id
                ? { borderColor: `${supplier.accent_color}66` }
                : undefined}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="relative flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-[var(--border)] bg-white p-2">
                  {supplier.logo_url ? (
                    <Image
                      src={supplier.logo_url}
                      alt={supplier.name}
                      width={96}
                      height={64}
                      className="h-full w-full object-contain"
                    />
                  ) : (
                    <Building2 size={24} aria-hidden="true" className="text-slate-700" />
                  )}
                </div>
                <span className="shrink-0 rounded-full bg-[var(--background)] px-2 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-[var(--muted)]">
                  Collab
                </span>
              </div>
              <h2 className="mt-4 truncate font-black text-[var(--foreground)]">{supplier.name}</h2>
              <p className="mt-1 line-clamp-2 text-sm leading-6 text-[var(--muted)]">Produtos exclusivos desta collab.</p>
            </Link>
          ))}
        </section>

        <section className="min-w-0">
          <div className="mb-3">
            <h2 className="text-xl font-black text-[var(--foreground)]">{areaTitle}</h2>
            <p className="mt-1 text-sm text-[var(--muted)]">
              {selectedSupplier
                ? "Produtos cadastrados aqui aparecem somente dentro da collab."
                : "Produtos sem collab aparecem no catalogo geral."}
            </p>
          </div>
          <ProductCreateForm
            defaultSupplierId={selectedSupplierId ?? ""}
            lockSupplier={Boolean(selectedSupplier)}
            selectedSupplier={selectedSupplier}
            suppliers={suppliers}
          />
        </section>

        <AdminProductSearch supplierId={selectedSupplierId} />
      </div>
    </AdminShell>
  );
}
