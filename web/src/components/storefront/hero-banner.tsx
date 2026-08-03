import Image from "next/image";
import Link from "next/link";
import { MessageCircle, PackageCheck } from "lucide-react";
import { HomeHeroSlideshow, type HomeHeroSlide } from "@/components/storefront/home-hero-slideshow";
import { createWhatsAppTextUrl } from "@/lib/whatsapp";
import type { Product } from "@/types/product";

function productToSlide(product: Product): HomeHeroSlide {
  return {
    badge: product.specialLabel ?? product.source ?? product.type,
    buttonText: "Ver produto",
    description: product.description,
    id: product.variantId ?? product.id,
    imageUrl: product.imageUrl ?? null,
    linkUrl: `/produto/${product.slug}`,
    openInNewTab: false,
    price: product.price,
    title: product.name,
  };
}

export function HeroBanner({
  products,
}: {
  products: Product[];
}) {
  const slideshowSlides = products.slice(0, 6).map(productToSlide);

  return (
    <section className="relative overflow-hidden border-b border-[var(--border)]">
      <div className="smart-storefront-hero-bg absolute inset-0" />
      <div className="smart-storefront-hero-grid absolute inset-0" />

      <div className="relative mx-auto grid max-w-7xl gap-8 px-4 py-8 sm:px-6 sm:py-10 lg:min-h-[560px] lg:grid-cols-[0.92fr_1.08fr] lg:px-8">
        <div className="flex flex-col justify-center lg:pb-8">
          <Image
            src="/brand/SmartFunko.png"
            alt="Smart Funkos"
            width={300}
            height={105}
            preload
            className="mb-5 h-auto w-56 drop-shadow-[0_0_26px_rgba(34,211,238,0.42)] sm:w-72"
          />
          <p className="text-sm font-black uppercase tracking-[0.22em] text-[var(--yellow)]">
            Loja e comunidade de colecionaveis
          </p>
          <h1 className="mt-3 max-w-2xl text-3xl font-black leading-tight text-white sm:text-5xl lg:text-6xl">
            Sua coleção começa aqui.
          </h1>
          <p className="mt-4 max-w-xl text-base leading-7 text-slate-300">
            Funkos, colecionaveis, pre-vendas e encomendas selecionadas para
            colecionadores, com atendimento proximo e acompanhamento pela conta.
          </p>
          <div className="mt-7 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/catalogo"
              prefetch={false}
              className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-[var(--yellow)] px-6 text-sm font-black text-[#020617] shadow-[0_0_26px_rgba(250,204,21,0.28)] hover:brightness-110"
            >
              <PackageCheck size={18} aria-hidden="true" />
              Ver catalogo
            </Link>
            <a
              href={createWhatsAppTextUrl("Ola! Quero falar com a Smart Funkos sobre produtos, pre-vendas ou encomendas.")}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-12 items-center justify-center gap-2 rounded-full border border-[var(--border)] bg-slate-950/38 px-6 text-sm font-bold text-white backdrop-blur hover:bg-cyan-400/15"
            >
              <MessageCircle size={18} aria-hidden="true" />
              Falar no WhatsApp
            </a>
          </div>
        </div>

        <div className="relative flex min-h-[300px] items-center justify-center pb-4 sm:min-h-[360px] lg:pb-0">
          <HomeHeroSlideshow slides={slideshowSlides} />
        </div>
      </div>
    </section>
  );
}
