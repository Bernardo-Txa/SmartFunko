import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { getCatalogSuppliers } from "@/lib/catalog";

export const metadata: Metadata = {
  title: "Fornecedores",
  description: "Fornecedores, collabs e colecoes especiais da Smart Funkos.",
  alternates: {
    canonical: "/fornecedores",
  },
  openGraph: {
    title: "Fornecedores | Smart Funkos",
    description: "Fornecedores, collabs e coleções especiais da Smart Funkos.",
    images: ["/brand/SmartFunko.png"],
  },
};

export default async function SuppliersPage() {
  const suppliers = await getCatalogSuppliers();

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <section className="mb-6">
        <h1 className="text-3xl font-black text-[var(--foreground)]">Collabs e fornecedores</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--muted)]">
          Catálogos separados para Piticas, Copag, Panini e outras collabs ativas da Smart Funkos.
        </p>
      </section>

      <div className="grid gap-4 md:grid-cols-3">
        {suppliers.map((supplier) => (
          <article
            key={supplier.id}
            className="flex min-h-full flex-col rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5"
          >
            <div className="flex items-center gap-3">
              {supplier.logo_url ? (
                <div className="relative h-14 w-14 overflow-hidden rounded-md border border-[var(--border)] bg-white">
                  <Image
                    src={supplier.logo_url}
                    alt={supplier.name}
                    fill
                    sizes="56px"
                    className="object-contain p-2"
                  />
                </div>
              ) : (
                <div className="flex h-14 w-14 items-center justify-center rounded-md border border-[var(--border)] bg-[var(--surface-strong)] text-sm font-black text-[var(--foreground)]">
                  {supplier.name.slice(0, 2).toUpperCase()}
                </div>
              )}
              <div>
                <h2 className="text-xl font-black text-[var(--foreground)]">{supplier.name}</h2>
                <p className="text-xs font-bold uppercase text-[var(--muted)]">Collab</p>
              </div>
            </div>

            <p className="mt-4 min-h-16 text-sm leading-6 text-[var(--muted)]">
              {supplier.description ?? "Coleção especial com catálogo próprio na Smart Funkos."}
            </p>

            <Link
              href={`/fornecedores/${supplier.slug}`}
              prefetch={false}
              className="mt-auto inline-flex h-10 w-fit items-center gap-2 rounded-md bg-[var(--accent)] px-3 text-sm font-black text-[#020617] hover:brightness-110"
            >
              Ver catálogo
              <ArrowRight size={16} aria-hidden="true" />
            </Link>
          </article>
        ))}
      </div>
    </div>
  );
}
