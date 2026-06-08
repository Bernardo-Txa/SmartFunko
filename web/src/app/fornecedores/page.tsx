import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";
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
      <section className="mb-7 rounded-2xl border border-cyan-300/18 bg-slate-950/44 p-5 shadow-[0_22px_58px_rgba(2,6,23,0.20)] sm:p-7">
        <span className="inline-flex items-center gap-2 rounded-full border border-yellow-200/30 bg-yellow-300/12 px-3 py-1 text-xs font-black uppercase tracking-[0.16em] text-[var(--yellow)]">
          <Sparkles size={14} aria-hidden="true" />
          Parcerias oficiais
        </span>
        <h1 className="mt-4 text-3xl font-black text-[var(--foreground)] sm:text-4xl">
          Collabs e fornecedores
        </h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--muted)]">
          Catálogos separados para Piticas, Copag, Panini e outras collabs ativas, com curadoria própria dentro da Smart Funkos.
        </p>
      </section>

      <div className="grid gap-5 md:grid-cols-3">
        {suppliers.map((supplier) => (
          <article
            key={supplier.id}
            className="group flex min-h-full flex-col overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[0_18px_44px_rgba(2,6,23,0.16)] transition hover:-translate-y-0.5 hover:border-cyan-200/36 hover:shadow-[0_24px_58px_rgba(2,6,23,0.28)]"
            style={
              supplier.accent_color
                ? { borderColor: `${supplier.accent_color}66` }
                : undefined
            }
          >
            <div className="flex items-center gap-3">
              {supplier.logo_url ? (
                <div className="relative h-16 w-16 overflow-hidden rounded-xl border border-[var(--border)] bg-white shadow-[0_12px_26px_rgba(2,6,23,0.16)]">
                  <Image
                    src={supplier.logo_url}
                    alt={supplier.name}
                    fill
                    sizes="56px"
                    className="object-contain p-2"
                  />
                </div>
              ) : (
                <div className="flex h-16 w-16 items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--surface-strong)] text-sm font-black text-[var(--foreground)]">
                  {supplier.name.slice(0, 2).toUpperCase()}
                </div>
              )}
              <div>
                <h2 className="text-xl font-black text-[var(--foreground)]">{supplier.name}</h2>
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--muted)]">
                  Collab
                </p>
              </div>
            </div>

            <p className="mt-4 min-h-16 text-sm leading-6 text-[var(--muted)]">
              {supplier.description ?? "Coleção especial com catálogo próprio na Smart Funkos."}
            </p>

            <Link
              href={`/fornecedores/${supplier.slug}`}
              prefetch={false}
              className="mt-auto inline-flex h-10 w-fit items-center gap-2 rounded-full border border-cyan-200/30 bg-cyan-300 px-4 text-sm font-black text-[#020617] shadow-[0_12px_26px_rgba(34,211,238,0.14)] hover:bg-cyan-200"
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
