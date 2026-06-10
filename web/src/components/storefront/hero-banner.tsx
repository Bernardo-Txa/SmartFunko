import Image from "next/image";
import Link from "next/link";
import { MessageCircle, PackageCheck } from "lucide-react";
import { ProductMedia } from "@/components/product/product-card";
import type { Product } from "@/types/product";
import { createWhatsAppTextUrl } from "@/lib/whatsapp";

export function HeroBanner({ products }: { products: Product[] }) {
  const heroProduct = products[0];
  const secondaryProducts = products.slice(1, 3);

  return (
    <section className="relative overflow-hidden border-b border-[var(--border)]">
      <div className="smart-storefront-hero-bg absolute inset-0" />
      <div className="smart-storefront-hero-grid absolute inset-0" />

      <div className="relative mx-auto grid min-h-[calc(100svh-5rem)] max-w-7xl gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[0.92fr_1.08fr] lg:px-8">
        <div className="flex flex-col justify-center pb-10">
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
          <h1 className="mt-3 max-w-2xl text-4xl font-black leading-tight text-white sm:text-6xl">
            Sua colecao comeca aqui.
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

        <div className="relative min-h-[430px] pb-12 lg:pb-0">
          {heroProduct ? (
            <div className="absolute right-0 top-5 w-[68%] max-w-[430px] rotate-[2deg] rounded-2xl border border-yellow-300/42 bg-[#030816]/72 p-4 shadow-[0_34px_70px_rgba(2,6,23,0.56)] backdrop-blur">
              <ProductMedia
                product={heroProduct}
                priority
                sizes="(min-width: 1024px) 34vw, 80vw"
              />
              <div className="mt-4">
                <p className="text-xs font-black uppercase text-[var(--yellow)]">
                  Destaque Smart
                </p>
                <strong className="mt-1 line-clamp-2 block text-xl font-black text-white">
                  {heroProduct.name}
                </strong>
              </div>
            </div>
          ) : (
            <div className="absolute right-0 top-8 flex h-72 w-64 rotate-[2deg] flex-col justify-between rounded-2xl border border-yellow-300/42 bg-[#030816]/72 p-5 shadow-[0_34px_70px_rgba(2,6,23,0.56)]">
              <span className="inline-flex w-fit rounded-full bg-white px-4 py-2 text-3xl font-black leading-none text-slate-950">
                POP
              </span>
              <div>
                <p className="text-xs font-black uppercase tracking-[0.22em] text-cyan-100">
                  Smart selecao
                </p>
                <strong className="mt-2 block text-6xl font-black leading-none text-white">
                  #1607
                </strong>
              </div>
            </div>
          )}

          {secondaryProducts[0] ? (
            <Link
              href={`/produto/${secondaryProducts[0].slug}`}
              prefetch={false}
              className="absolute bottom-8 left-0 hidden w-44 rotate-[-5deg] rounded-xl border border-cyan-200/22 bg-slate-950/78 p-3 shadow-[0_22px_40px_rgba(2,6,23,0.46)] backdrop-blur sm:block"
            >
              <ProductMedia product={secondaryProducts[0]} sizes="180px" />
              <span className="mt-2 line-clamp-2 block text-xs font-black text-slate-100">
                {secondaryProducts[0].name}
              </span>
            </Link>
          ) : null}
          {secondaryProducts[1] ? (
            <Link
              href={`/produto/${secondaryProducts[1].slug}`}
              prefetch={false}
              className="absolute bottom-20 left-28 hidden w-44 rotate-[6deg] rounded-xl border border-cyan-200/22 bg-slate-950/78 p-3 shadow-[0_22px_40px_rgba(2,6,23,0.46)] backdrop-blur sm:block"
            >
              <ProductMedia product={secondaryProducts[1]} sizes="180px" />
              <span className="mt-2 line-clamp-2 block text-xs font-black text-slate-100">
                {secondaryProducts[1].name}
              </span>
            </Link>
          ) : null}
          <div className="absolute inset-x-12 bottom-0 h-20 rounded-full bg-cyan-300/20 blur-3xl" />
        </div>
      </div>
    </section>
  );
}
