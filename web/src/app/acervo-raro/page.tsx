import type { Metadata } from "next";
import { Award, Fingerprint, Gem, LockKeyhole, PackageCheck, ShieldCheck, Sparkles } from "lucide-react";
import { RareCollectibleCard } from "@/components/acervo-raro/rare-collectible-card";
import { RareFilterBar } from "@/components/acervo-raro/rare-filter-bar";
import { RareHeroSlideshow } from "@/components/acervo-raro/rare-hero-slideshow";
import { canonicalUrl, DEFAULT_OG_IMAGE_PATH } from "@/lib/seo";
import {
  RareCollectibleService,
  type RareCollectibleFilter,
  type RareCollectibleStatus,
} from "@/server/rare-collectibles/rare-collectible-service";

type SearchParams = {
  category?: string;
  q?: string;
  sort?: RareCollectibleFilter["sort"];
  status?: RareCollectibleStatus | "all";
};

type Props = {
  searchParams?: Promise<SearchParams>;
};

export const metadata: Metadata = {
  title: {
    absolute: "Acervo Raro — Smart Funkos",
  },
  description: "Peças únicas, autênticas, autografadas e colecionáveis em uma curadoria premium da Smart Funkos.",
  alternates: {
    canonical: "/acervo-raro",
  },
  openGraph: {
    description: "Peças únicas. Histórias eternizadas.",
    images: [{ url: canonicalUrl(DEFAULT_OG_IMAGE_PATH), width: 1200, height: 630 }],
    title: "Acervo Raro — Smart Funkos",
    type: "website",
    url: "/acervo-raro",
  },
};

function normalizeSearchParams(params?: SearchParams): Required<Pick<SearchParams, "category" | "q" | "sort" | "status">> {
  return {
    category: params?.category || "todos",
    q: params?.q || "",
    sort: params?.sort || "featured",
    status: params?.status || "all",
  };
}

export default async function AcervoRaroPage({ searchParams }: Props) {
  const params = normalizeSearchParams(await searchParams);
  const rareService = new RareCollectibleService();
  const result = await rareService.listPublicRareCollectibles({
    category: params.category,
    query: params.q,
    sort: params.sort,
    status: params.status,
  });
  const slideshowItems = result.active.filter((item) => item.isFeatured);
  const heroSlides = slideshowItems.length > 0 ? slideshowItems : result.active.length > 0 ? result.active : result.archive;
  const totalVisible = result.active.length + result.archive.length;

  return (
    <main>
      <RareHeroSlideshow slides={heroSlides} totalVisible={totalVisible} />

      <section id="acervo" className="relative overflow-hidden border-y border-amber-200/12 bg-[linear-gradient(180deg,rgba(15,23,42,0.30),rgba(2,6,23,0.68))]">
        <div className="absolute inset-0 opacity-[0.16] [background-image:linear-gradient(rgba(245,158,11,0.10)_1px,transparent_1px),linear-gradient(90deg,rgba(34,211,238,0.08)_1px,transparent_1px)] [background-size:54px_54px]" />
        <div className="relative mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="mb-7 grid gap-5 lg:grid-cols-[1fr_auto] lg:items-end">
            <div>
              <p className="inline-flex items-center gap-2 rounded-full border border-amber-200/26 bg-amber-200/10 px-3 py-1 text-xs font-black uppercase tracking-[0.18em] text-amber-100">
                <Sparkles size={14} aria-hidden="true" />
                Acervo ativo
              </p>
              <h2 className="mt-3 max-w-3xl text-4xl font-black leading-tight text-[var(--foreground)] sm:text-5xl">
                Peças raras disponíveis agora
              </h2>
              <p className="mt-3 max-w-2xl text-base leading-7 text-[var(--muted)]">
                Cada card concentra foto, história, assinatura, preço e atalho direto para atendimento da peça.
              </p>
            </div>
            <div className="grid gap-2 sm:grid-cols-3 lg:min-w-[430px]">
              <div className="rounded-md border border-white/10 bg-slate-950/46 p-3">
                <span className="text-xs font-black uppercase tracking-[0.12em] text-slate-400">Disponíveis</span>
                <strong className="mt-1 block text-2xl text-white">{result.active.length}</strong>
              </div>
              <div className="rounded-md border border-white/10 bg-slate-950/46 p-3">
                <span className="text-xs font-black uppercase tracking-[0.12em] text-slate-400">Curadoria</span>
                <strong className="mt-1 flex items-center gap-2 text-sm text-white">
                  <Gem size={16} aria-hidden="true" className="text-amber-100" />
                  Premium
                </strong>
              </div>
              <div className="rounded-md border border-white/10 bg-slate-950/46 p-3">
                <span className="text-xs font-black uppercase tracking-[0.12em] text-slate-400">Compra</span>
                <strong className="mt-1 block text-sm text-white">Atendimento direto</strong>
              </div>
            </div>
          </div>

          <RareFilterBar
            category={params.category}
            query={params.q}
            sort={params.sort}
            status={params.status}
          />

          {result.active.length > 0 ? (
            <div className="mt-8 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
              {result.active.map((item) => (
                <RareCollectibleCard key={item.id} item={item} />
              ))}
            </div>
          ) : (
            <div className="mt-8 rounded-lg border border-dashed border-amber-200/22 bg-slate-950/42 p-8 text-center">
              <Award className="mx-auto text-amber-100" size={34} aria-hidden="true" />
              <h2 className="mt-4 text-xl font-black text-[var(--foreground)]">Nenhuma peça encontrada</h2>
              <p className="mx-auto mt-2 max-w-lg text-sm text-[var(--muted)]">
                Ajuste os filtros ou aguarde novos itens publicados pelo painel do Acervo Raro.
              </p>
            </div>
          )}
        </div>
      </section>

      <section className="border-y border-amber-200/10 bg-slate-950/38">
        <div className="mx-auto grid max-w-7xl gap-5 px-4 py-10 sm:px-6 md:grid-cols-2 lg:grid-cols-4 lg:px-8">
          {[
            {
              icon: ShieldCheck,
              title: "Análise antes do cadastro",
              text: "Cada peça passa por conferência visual e registro interno antes de aparecer no site.",
            },
            {
              icon: Fingerprint,
              title: "Códigos conferidos",
              text: "Certificados, números de série e códigos verificáveis ficam registrados na peça.",
            },
            {
              icon: LockKeyhole,
              title: "Procedência documentada",
              text: "Origem, contexto do autógrafo e dados de autenticidade acompanham o cadastro.",
            },
            {
              icon: PackageCheck,
              title: "Proteção no manuseio",
              text: "Itens raros são separados e preparados com cuidado extra para conservação.",
            },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <article key={item.title} className="rounded-lg border border-white/10 bg-slate-950/36 p-4">
                <Icon size={22} aria-hidden="true" className="text-amber-100" />
                <h3 className="mt-3 font-black text-[var(--foreground)]">{item.title}</h3>
                <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{item.text}</p>
              </article>
            );
          })}
        </div>
      </section>

      {result.archive.length > 0 ? (
        <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
          <div className="mb-5">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-amber-100">
              Histórico
            </p>
            <h2 className="mt-2 text-2xl font-black text-[var(--foreground)]">
              Peças que já fizeram parte do acervo
            </h2>
            <p className="mt-2 text-sm text-[var(--muted)]">
              Itens vendidos mantidos como registro de curadoria e autoridade.
            </p>
          </div>
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {result.archive.map((item) => (
              <RareCollectibleCard key={item.id} item={item} />
            ))}
          </div>
        </section>
      ) : null}
    </main>
  );
}
