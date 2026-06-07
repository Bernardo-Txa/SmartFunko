import Image from "next/image";
import Link from "next/link";
import type { CatalogSupplier } from "@/lib/catalog";

export function SupplierTile({ supplier }: { supplier: CatalogSupplier }) {
  return (
    <Link
      href={`/fornecedores/${supplier.slug}`}
      prefetch={false}
      className="flex min-h-36 flex-col rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4 hover:bg-cyan-400/10"
    >
      <div className="flex items-center gap-3">
        {supplier.logo_url ? (
          <div className="relative h-12 w-12 overflow-hidden rounded-md border border-[var(--border)] bg-white">
            <Image
              src={supplier.logo_url}
              alt={supplier.name}
              fill
              sizes="48px"
              className="object-contain p-2"
            />
          </div>
        ) : (
          <div className="flex h-12 w-12 items-center justify-center rounded-md border border-[var(--border)] bg-[var(--surface-strong)] text-sm font-black text-[var(--foreground)]">
            {supplier.name.slice(0, 2).toUpperCase()}
          </div>
        )}
        <div>
          <h3 className="font-black text-[var(--foreground)]">{supplier.name}</h3>
          <p className="text-xs font-bold uppercase text-[var(--muted)]">Collab</p>
        </div>
      </div>
      <p className="mt-4 line-clamp-3 text-sm leading-6 text-[var(--muted)]">
        {supplier.description ?? "Colecao ativa no catalogo Smart Funkos."}
      </p>
    </Link>
  );
}

