import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { clsx } from "clsx";
import { ArrowRight } from "lucide-react";
import { getCatalogSuppliers } from "@/lib/catalog";
import { getBrandCatalogProfile } from "@/lib/brand-catalog-profiles";

export const metadata: Metadata = {
  title: "Marcas",
  description: "Catalogos especiais por marca na Smart Funkos.",
};

export default async function BrandsPage() {
  const suppliers = await getCatalogSuppliers();

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <section className="mb-6 rounded-lg border border-cyan-300/25 bg-[linear-gradient(135deg,#051923_0%,#030816_55%,#201805_100%)] p-5 sm:p-7">
        <span className="inline-flex rounded-full bg-yellow-300 px-3 py-1 text-xs font-black uppercase text-slate-950">
          Catalogos especiais
        </span>
        <h1 className="mt-5 max-w-4xl text-4xl font-black leading-tight text-white sm:text-5xl">
          Marcas com vitrines proprias
        </h1>
        <p className="mt-4 max-w-3xl text-base font-semibold leading-7 text-cyan-100">
          Piticas, Copag, Panini e outras marcas entram em espacos separados, com curadoria, ritmo e criterios de compra diferentes do catalogo geral.
        </p>
      </section>

      <div className="grid gap-4 md:grid-cols-3">
        {suppliers.map((supplier) => {
          const profile = getBrandCatalogProfile(supplier);

          return (
            <article
              key={supplier.id}
              className={clsx("flex min-h-full flex-col rounded-lg border p-5", profile.theme.bandClassName)}
            >
              <div className="flex min-h-16 items-center gap-3">
                {supplier.logo_url ? (
                  <div className="relative h-14 w-14 overflow-hidden rounded-md border border-white/15 bg-white">
                    <Image
                      src={supplier.logo_url}
                      alt={supplier.name}
                      fill
                      sizes="56px"
                      className="object-contain p-2"
                    />
                  </div>
                ) : (
                  <div className="flex h-14 w-14 items-center justify-center rounded-md border border-white/15 bg-white/10 text-sm font-black text-white">
                    {supplier.name.slice(0, 2).toUpperCase()}
                  </div>
                )}
                <div>
                  <h2 className="text-xl font-black text-white">{profile.name}</h2>
                  <p className={clsx("text-xs font-bold uppercase", profile.theme.accentClassName)}>
                    Catalogo da marca
                  </p>
                </div>
              </div>

              <p className="mt-5 text-sm font-semibold leading-6 text-slate-200">
                {profile.headline}
              </p>

              <div className="mt-4 flex flex-wrap gap-2">
                {profile.highlights.map((highlight) => (
                  <span
                    key={highlight}
                    className="inline-flex h-7 items-center rounded-md border border-white/10 bg-[#030816]/70 px-2 text-[11px] font-bold text-slate-200"
                  >
                    {highlight}
                  </span>
                ))}
              </div>

              <Link
                href={`/marcas/${supplier.slug}`}
                prefetch={false}
                className={clsx(
                  "mt-auto inline-flex h-10 w-fit items-center gap-2 rounded-md px-3 text-sm font-black",
                  profile.theme.badgeClassName,
                )}
              >
                Abrir catalogo
                <ArrowRight size={16} aria-hidden="true" />
              </Link>
            </article>
          );
        })}
      </div>
    </div>
  );
}
