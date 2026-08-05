import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowRight,
  BadgeCheck,
  Boxes,
  Crown,
  Gem,
  PackageCheck,
  ShieldCheck,
  Sparkles,
  Star,
  Timer,
  Truck,
  type LucideIcon,
} from "lucide-react";
import { ProductMedia } from "@/components/product/product-card";
import { ProductCarousel } from "@/components/storefront/product-carousel";
import { CommercialSection } from "@/components/storefront/commercial-section";
import { formatCurrency } from "@/lib/format";
import { getCatalogProducts } from "@/lib/catalog";
import { isPopFlixEnabled } from "@/lib/env";
import { POPFLIX_PLANS, type PopFlixPlanSlug } from "@/lib/popflix";
import { canonicalUrl, ogImages } from "@/lib/seo";
import type { Product } from "@/types/product";

export const metadata: Metadata = {
  title: {
    absolute: "PopFlix - Assinatura mensal de Funkos | Smart Funkos",
  },
  description:
    "PopFlix e a assinatura mensal da Smart Funkos para receber caixas surpresa com Funkos, exclusivos e linhas premium.",
  alternates: {
    canonical: "/popflix",
  },
  openGraph: {
    description:
      "Escolha entre Basico, Deluxe e Premium para receber todo mes uma curadoria Smart Funkos.",
    images: ogImages(),
    title: "PopFlix - Assinatura mensal de Funkos",
    type: "website",
    url: "/popflix",
  },
  twitter: {
    card: "summary_large_image",
    description:
      "Assinatura mensal da Smart Funkos com planos Basico, Deluxe e Premium.",
    images: ["/og/smart-funkos-og.png"],
    title: "PopFlix - Assinatura mensal de Funkos",
  },
};

const planIconBySlug: Record<PopFlixPlanSlug, LucideIcon> = {
  basic: Star,
  deluxe: Sparkles,
  premium: Crown,
};

const planAccentBySlug: Record<PopFlixPlanSlug, string> = {
  basic: "border-cyan-300/26 bg-cyan-400/8",
  deluxe: "border-yellow-300/40 bg-yellow-300/10 shadow-[0_18px_48px_rgba(250,204,21,0.12)]",
  premium: "border-pink-300/36 bg-pink-500/10",
};

const workflow = [
  {
    icon: Timer,
    label: "Escolha o plano",
    text: "A assinatura e registrada na sua conta Smart Funkos com o plano escolhido.",
  },
  {
    icon: Boxes,
    label: "Curadoria mensal",
    text: "A caixa e montada por tema, disponibilidade e nivel da assinatura ativa.",
  },
  {
    icon: PackageCheck,
    label: "Pagamento no sistema",
    text: "O status da assinatura fica no painel da conta, junto com cobrancas e historico.",
  },
  {
    icon: Truck,
    label: "Receba e acompanhe",
    text: "Cada ciclo vira uma experiencia acompanhavel pela Smart Funkos.",
  },
];

const premiumHighlights = [
  "Comic Cover",
  "Deluxe",
  "Moment",
  "Album",
  "Ride",
  "Chase",
  "Glow",
  "Special Edition",
];

function subscribeHref(planSlug?: PopFlixPlanSlug) {
  return planSlug ? `/popflix/assinar?plan=${planSlug}` : "/popflix/assinar";
}

function uniqueProducts(products: Product[]) {
  const seen = new Set<string>();

  return products.filter((product) => {
    if (seen.has(product.id)) {
      return false;
    }

    seen.add(product.id);
    return true;
  });
}

function getHeroProducts(products: Product[]) {
  const withImages = products.filter((product) => product.imageUrl);

  return (withImages.length >= 3 ? withImages : products).slice(0, 4);
}

export default async function PopFlixPage() {
  if (!isPopFlixEnabled()) {
    notFound();
  }

  const [specialProducts, readyProducts] = await Promise.all([
    getCatalogProducts({ filter: "specials", pageSize: 10, sort: "specials_first" }),
    getCatalogProducts({ filter: "ready", pageSize: 8, sort: "ready_first" }),
  ]);
  const featuredProducts = uniqueProducts([...specialProducts, ...readyProducts]);
  const heroProducts = getHeroProducts(featuredProducts);

  return (
    <div>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "OfferCatalog",
            description:
              "Assinatura mensal PopFlix da Smart Funkos com planos Basico, Deluxe e Premium.",
            itemListElement: POPFLIX_PLANS.map((plan) => ({
              "@type": "Offer",
              availability: "https://schema.org/PreOrder",
              name: `PopFlix ${plan.name}`,
              price: plan.price.toFixed(2),
              priceCurrency: "BRL",
              url: canonicalUrl(subscribeHref(plan.slug)),
            })),
            name: "PopFlix",
            url: canonicalUrl("/popflix"),
          }),
        }}
      />

      <section className="popflix-hero relative overflow-hidden border-b border-[var(--border)]">
        <div className="popflix-hero-grid absolute inset-0" />
        <div className="absolute inset-y-0 right-0 hidden w-[58%] lg:block" aria-hidden="true">
          <div className="relative h-full min-h-[34rem]">
            {heroProducts.length > 0 ? (
              heroProducts.map((product, index) => (
                <div
                  key={product.id}
                  className={[
                    "absolute w-44 overflow-hidden rounded-lg border border-[color:var(--popflix-hero-border)] bg-[var(--popflix-hero-card)] p-2 shadow-[0_24px_60px_rgba(0,0,0,0.22)] backdrop-blur-sm xl:w-52",
                    index === 0 ? "right-[18%] top-12 rotate-3" : "",
                    index === 1 ? "right-[44%] top-32 -rotate-6" : "",
                    index === 2 ? "right-[10%] bottom-20 -rotate-3" : "",
                    index === 3 ? "right-[36%] bottom-8 rotate-5" : "",
                  ].join(" ")}
                >
                  <ProductMedia
                    product={product}
                    sizes="(max-width: 1280px) 176px, 208px"
                  />
                  <p className="mt-2 line-clamp-1 text-[10px] font-black uppercase tracking-[0.12em] text-[var(--popflix-hero-muted)]">
                    {product.type} - {product.franchise}
                  </p>
                </div>
              ))
            ) : (
              <div className="absolute right-[18%] top-24 flex h-72 w-72 items-center justify-center rounded-lg border border-[color:var(--popflix-hero-border)] bg-[var(--popflix-hero-card)]">
                <Image
                  src="/brand/SmartFunkoIcone.png"
                  alt=""
                  width={180}
                  height={180}
                  className="h-44 w-44 object-contain"
                />
              </div>
            )}
          </div>
        </div>
        <div className="popflix-hero-shade absolute inset-0" />

        <div className="relative mx-auto grid max-w-7xl gap-8 px-4 py-14 sm:px-6 sm:py-16 lg:px-8 lg:py-20">
          <div className="min-w-0 max-w-2xl">
            <p className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.22em] text-[var(--yellow)]">
              <Gem size={15} aria-hidden="true" />
              Assinatura Smart Funkos
            </p>
            <h1 className="mt-4 text-5xl font-black leading-none text-[var(--popflix-hero-foreground)] sm:text-6xl lg:text-7xl">
              PopFlix
            </h1>
            <p className="mt-5 max-w-[calc(100vw-2rem)] text-base leading-7 text-[var(--popflix-hero-muted)] sm:max-w-xl sm:text-lg">
              Uma caixa mensal para colecionadores receberem Funkos com curadoria,
              surpresa e prioridade em pecas especiais. Voce escolhe o nivel e assina
              direto pelo sistema Smart Funkos.
            </p>

            <div className="mt-7 flex flex-wrap gap-3">
              <Link
                href={subscribeHref()}
                className="inline-flex h-12 items-center gap-2 rounded-full bg-[var(--yellow)] px-5 text-sm font-black text-[#020617] shadow-[0_16px_34px_rgba(250,204,21,0.18)] hover:brightness-110"
              >
                Assinar PopFlix
                <ArrowRight size={17} aria-hidden="true" />
              </Link>
              <Link
                href="#planos"
                className="inline-flex h-12 items-center gap-2 rounded-full border border-[color:var(--popflix-hero-border)] bg-[var(--popflix-hero-card)] px-5 text-sm font-black text-[var(--popflix-hero-foreground)] hover:bg-[var(--popflix-hero-card-strong)]"
              >
                Ver planos
                <ArrowRight size={17} aria-hidden="true" />
              </Link>
            </div>

            <div className="mt-8 grid max-w-[calc(100vw-2rem)] gap-3 sm:max-w-2xl sm:grid-cols-3">
              {[
                ["3 planos", "Basico, Deluxe e Premium"],
                ["Mensal", "Caixa nova todo mes"],
                ["Sistema", "Assinatura vinculada a sua conta"],
              ].map(([label, text]) => (
                <div
                  key={label}
                  className="rounded-lg border border-[color:var(--popflix-hero-border)] bg-[var(--popflix-hero-card)] p-3"
                >
                  <strong className="block text-sm font-black text-[var(--popflix-hero-foreground)]">
                    {label}
                  </strong>
                  <span className="mt-1 block text-xs leading-5 text-[var(--popflix-hero-muted)]">
                    {text}
                  </span>
                </div>
              ))}
            </div>

            <div className="mt-6 flex max-w-[calc(100vw-2rem)] gap-3 overflow-x-auto pb-2 lg:hidden">
              {heroProducts.length > 0 ? (
                heroProducts.slice(0, 3).map((product) => (
                  <div
                    key={product.id}
                    className="w-36 shrink-0 rounded-lg border border-[color:var(--popflix-hero-border)] bg-[var(--popflix-hero-card)] p-2"
                  >
                    <ProductMedia
                      product={product}
                      sizes="144px"
                    />
                    <p className="mt-2 line-clamp-1 text-[10px] font-black uppercase tracking-[0.12em] text-[var(--popflix-hero-muted)]">
                      {product.type}
                    </p>
                  </div>
                ))
              ) : (
                <div className="flex h-36 w-36 shrink-0 items-center justify-center rounded-lg border border-[color:var(--popflix-hero-border)] bg-[var(--popflix-hero-card)]">
                  <Image
                    src="/brand/SmartFunkoIcone.png"
                    alt=""
                    width={96}
                    height={96}
                    className="h-24 w-24 object-contain"
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      <CommercialSection
        eyebrow="PopFlix"
        title="A assinatura que vira ritual de colecionador"
        description="O produto nasce como uma experiencia mensal: tema surpresa, curadoria da Smart Funkos e registro dentro da conta do cliente."
      >
        <div className="grid gap-4 md:grid-cols-4">
          {workflow.map((item) => {
            const Icon = item.icon;

            return (
              <div
                key={item.label}
                className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5"
              >
                <Icon className="text-[var(--accent)]" size={24} aria-hidden="true" />
                <strong className="mt-4 block text-sm text-[var(--foreground)]">
                  {item.label}
                </strong>
                <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{item.text}</p>
              </div>
            );
          })}
        </div>
      </CommercialSection>

      <section id="planos" className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-5">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-[var(--yellow)]">
            Planos
          </p>
          <h2 className="mt-1 text-2xl font-black text-[var(--foreground)]">
            Escolha o tamanho da sua caixa
          </h2>
          <p className="mt-1 max-w-3xl text-sm leading-6 text-[var(--muted)]">
            Valores de lancamento a partir do plano escolhido. A assinatura fica no
            sistema e pode evoluir para cobranca recorrente.
          </p>
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          {POPFLIX_PLANS.map((plan) => {
            const Icon = planIconBySlug[plan.slug];

            return (
              <article
                key={plan.name}
                className={`relative flex flex-col rounded-lg border p-5 ${planAccentBySlug[plan.slug]}`}
              >
                {plan.badge ? (
                  <span className="absolute right-4 top-4 rounded-full bg-[var(--yellow)] px-3 py-1 text-[10px] font-black uppercase tracking-[0.1em] text-[#020617]">
                    {plan.badge}
                  </span>
                ) : null}
                <Icon className="text-[var(--yellow)]" size={28} aria-hidden="true" />
                <h3 className="mt-4 text-2xl font-black text-[var(--foreground)]">
                  {plan.name}
                </h3>
                <p className="mt-1 text-sm font-bold text-[var(--accent)]">{plan.short}</p>
                <p className="mt-4 text-sm leading-6 text-[var(--muted)]">
                  {plan.description}
                </p>
                <p className="mt-5 text-xs font-black uppercase tracking-[0.14em] text-[var(--yellow)]">
                  A partir de
                </p>
                <p className="mt-1 text-3xl font-black text-[var(--foreground)]">
                  {formatCurrency(plan.price)}
                  <span className="ml-1 text-sm font-semibold text-[var(--muted)]">/mes</span>
                </p>
                <ul className="mt-5 grid flex-1 gap-3 text-sm leading-6 text-[var(--muted)]">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex gap-2">
                      <BadgeCheck
                        className="mt-1 shrink-0 text-[var(--green)]"
                        size={16}
                        aria-hidden="true"
                      />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
                <Link
                  href={subscribeHref(plan.slug)}
                  className="mt-6 inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-[var(--green)] px-4 text-sm font-black text-[#052e16] hover:brightness-110"
                >
                  {plan.ctaLabel}
                  <ArrowRight size={16} aria-hidden="true" />
                </Link>
              </article>
            );
          })}
        </div>
      </section>

      <CommercialSection
        eyebrow="Premium"
        title="Linha top para quem quer pular o comum"
        description="O plano Premium concentra formatos maiores e pecas com apelo de vitrine. A curadoria pode variar por disponibilidade, mas a proposta e sempre fugir do basico."
      >
        <div className="grid gap-4 lg:grid-cols-[0.95fr_1.05fr]">
          <div className="rounded-lg border border-pink-300/28 bg-pink-500/10 p-5">
            <ShieldCheck className="text-[var(--pink)]" size={26} aria-hidden="true" />
            <h3 className="mt-4 text-xl font-black text-[var(--foreground)]">
              Sem caixa generica no Premium
            </h3>
            <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
              O assinante Premium entra na fila de pecas de maior impacto visual, como
              Comic Cover, Deluxe, Moment e outras linhas especiais. Se a curadoria do
              mes nao bater com o perfil, a Smart ajusta antes de fechar o ciclo.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {premiumHighlights.map((highlight) => (
              <div
                key={highlight}
                className="flex min-h-16 items-center gap-3 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-4"
              >
                <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--yellow)] text-[#020617]">
                  <Sparkles size={16} aria-hidden="true" />
                </span>
                <strong className="text-sm text-[var(--foreground)]">{highlight}</strong>
              </div>
            ))}
          </div>
        </div>
      </CommercialSection>

      <ProductCarousel
        title="Inspiração da curadoria"
        description="Produtos especiais e pronta-entrega ajudam a orientar as proximas caixas PopFlix."
        href="/catalogo"
        products={featuredProducts.slice(0, 10)}
      />
    </div>
  );
}
