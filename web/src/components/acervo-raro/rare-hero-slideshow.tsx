"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Gem, ShieldCheck } from "lucide-react";
import { RareImageFallback } from "@/components/acervo-raro/rare-image-fallback";
import { SafeProductImage } from "@/components/product/safe-product-image";
import { formatCurrency } from "@/lib/format";

export type RareHeroSlide = {
  category: string;
  coverImageUrl?: string | null;
  description?: string | null;
  id: string;
  isFeatured: boolean;
  name: string;
  price: number;
  shortTitle?: string | null;
  signerName?: string | null;
  slug: string;
  story?: string | null;
};

type Props = {
  slides: RareHeroSlide[];
  totalVisible: number;
};

function cleanSlideText(item?: RareHeroSlide) {
  const source = item?.story || item?.description;

  if (!source) {
    return "Peça selecionada pela curadoria Smart Funkos, com disponibilidade limitada e negociação individual.";
  }

  const text = source.replace(/\s+/g, " ").trim();
  return text.length > 190 ? `${text.slice(0, 187).trim()}...` : text;
}

function getInstallmentText(price: number) {
  return `10x de ${formatCurrency(price / 10)}`;
}

export function RareHeroSlideshow({ slides, totalVisible }: Props) {
  const orderedSlides = useMemo(
    () =>
      slides
        .slice()
        .sort((first, second) => Number(second.isFeatured) - Number(first.isFeatured)),
    [slides],
  );
  const [activeIndex, setActiveIndex] = useState(0);
  const activeSlide = orderedSlides[activeIndex];
  const hasSlides = orderedSlides.length > 0;
  const hasMultipleSlides = orderedSlides.length > 1;

  useEffect(() => {
    if (!hasMultipleSlides) {
      return;
    }

    const intervalId = window.setInterval(() => {
      setActiveIndex((currentIndex) => (currentIndex + 1) % orderedSlides.length);
    }, 6500);

    return () => window.clearInterval(intervalId);
  }, [hasMultipleSlides, orderedSlides.length]);

  function goToPrevious() {
    setActiveIndex((currentIndex) =>
      currentIndex === 0 ? orderedSlides.length - 1 : currentIndex - 1,
    );
  }

  function goToNext() {
    setActiveIndex((currentIndex) => (currentIndex + 1) % orderedSlides.length);
  }

  return (
    <section className="relative overflow-hidden border-b border-amber-200/12 bg-[#050b14]">
      <div className="absolute inset-0 bg-[linear-gradient(120deg,rgba(8,47,73,0.52),rgba(2,6,23,0.26)_48%,rgba(120,53,15,0.24))]" />
      <div className="absolute inset-0 opacity-[0.18] [background-image:linear-gradient(rgba(255,255,255,0.06)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.06)_1px,transparent_1px)] [background-size:46px_46px]" />

      <div className="relative mx-auto grid min-h-[calc(100svh-5rem)] max-w-7xl gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[0.95fr_1.05fr] lg:items-start lg:px-8 lg:py-14">
        <div className="max-w-2xl lg:pt-2 xl:pt-5">
          <p className="inline-flex items-center gap-2 rounded-full border border-amber-200/28 bg-amber-200/10 px-3 py-1 text-xs font-black uppercase tracking-[0.18em] text-amber-100">
            <Gem size={14} aria-hidden="true" />
            Acervo Raro
          </p>
          <h1 className="mt-5 text-5xl font-black leading-[0.95] text-white sm:text-6xl lg:text-7xl">
            Peças únicas. Histórias eternizadas.
          </h1>
          <p className="mt-5 max-w-xl text-base leading-7 text-slate-300 sm:text-lg">
            Uma seleção exclusiva de itens autênticos, autografados e colecionáveis, com procedência registrada e disponibilidade limitada.
          </p>

          <div className="mt-6 rounded-lg border border-amber-200/16 bg-slate-950/46 p-4 shadow-[0_24px_70px_rgba(2,6,23,0.24)]">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-amber-100">
              {activeSlide?.signerName ? "Autógrafo no slideshow" : "Peça no slideshow"}
            </p>
            <h2 className="mt-2 text-xl font-black leading-snug text-white">
              {activeSlide?.shortTitle || activeSlide?.name || "Nova peça rara em breve"}
            </h2>
            <p className="mt-3 text-sm leading-6 text-slate-300">
              {hasSlides
                ? cleanSlideText(activeSlide)
                : "Novas peças raras entram aqui assim que forem publicadas no acervo."}
            </p>
            {activeSlide ? (
              <div className="mt-4 flex flex-wrap gap-2 text-xs font-bold text-slate-300">
                <span className="rounded-full border border-white/10 bg-white/6 px-2.5 py-1">
                  {activeSlide.category}
                </span>
                {activeSlide.signerName ? (
                  <span className="rounded-full border border-amber-200/22 bg-amber-200/8 px-2.5 py-1 text-amber-100">
                    {activeSlide.signerName}
                  </span>
                ) : null}
                <span className="rounded-full border border-white/10 bg-white/6 px-2.5 py-1">
                  {formatCurrency(activeSlide.price)}
                </span>
              </div>
            ) : null}
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="#acervo"
              className="inline-flex h-12 items-center justify-center rounded-md bg-amber-200 px-5 text-sm font-black text-slate-950 shadow-[0_18px_40px_rgba(245,158,11,0.18)] hover:bg-amber-100"
            >
              Explorar o acervo
            </Link>
            <span className="inline-flex h-12 items-center gap-2 rounded-md border border-white/14 bg-white/6 px-4 text-sm font-black text-slate-100">
              <ShieldCheck size={17} aria-hidden="true" className="text-amber-100" />
              Certificação e procedência
            </span>
          </div>

          <div className="mt-7 grid max-w-xl gap-3 sm:grid-cols-3">
            <div className="rounded-md border border-white/10 bg-white/5 p-3">
              <span className="text-xs font-black uppercase tracking-[0.12em] text-slate-400">Itens</span>
              <strong className="mt-2 block text-2xl text-white">{totalVisible}</strong>
            </div>
            <div className="rounded-md border border-white/10 bg-white/5 p-3">
              <span className="text-xs font-black uppercase tracking-[0.12em] text-slate-400">Controle</span>
              <strong className="mt-2 block text-sm text-white">Peça única</strong>
            </div>
            <div className="rounded-md border border-white/10 bg-white/5 p-3">
              <span className="text-xs font-black uppercase tracking-[0.12em] text-slate-400">Status</span>
              <strong className="mt-2 block text-sm text-white">Limitado</strong>
            </div>
          </div>
        </div>

        <div className="relative mx-auto w-full max-w-xl lg:max-w-none lg:pt-2">
          {activeSlide ? (
            <div className="relative">
              <Link
                href={`/acervo-raro/${activeSlide.slug}`}
                className="group block rotate-[-1.5deg] rounded-lg border border-amber-200/24 bg-slate-950/70 p-3 shadow-[0_34px_100px_rgba(2,6,23,0.38)] transition hover:rotate-0 hover:border-amber-100/46"
              >
                {activeSlide.coverImageUrl ? (
                  <SafeProductImage
                    src={activeSlide.coverImageUrl}
                    alt={activeSlide.name}
                    fallback={<RareImageFallback label={activeSlide.category} />}
                    priority
                    sizes="(min-width: 1024px) 44vw, 100vw"
                    imageClassName="p-6 transition duration-500 group-hover:scale-[1.035]"
                  />
                ) : (
                  <RareImageFallback label={activeSlide.category} />
                )}
                <div className="grid gap-2 p-3">
                  <span className="text-xs font-black uppercase tracking-[0.16em] text-amber-100">
                    Slide do acervo
                  </span>
                  <h2 className="text-2xl font-black leading-tight text-white">
                    {activeSlide.shortTitle || activeSlide.name}
                  </h2>
                  <div className="flex flex-wrap items-center gap-2 text-sm text-slate-300">
                    <span>{activeSlide.category}</span>
                    {activeSlide.signerName ? <span>· {activeSlide.signerName}</span> : null}
                    <span>· {formatCurrency(activeSlide.price)}</span>
                    <span>· {getInstallmentText(activeSlide.price)}</span>
                  </div>
                </div>
              </Link>

              {hasMultipleSlides ? (
                <div className="absolute inset-x-4 top-1/2 flex -translate-y-1/2 justify-between">
                  <button
                    type="button"
                    onClick={goToPrevious}
                    className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/14 bg-slate-950/72 text-white shadow-[0_14px_34px_rgba(2,6,23,0.32)] backdrop-blur hover:bg-slate-900"
                    aria-label="Peça anterior"
                  >
                    <ChevronLeft size={18} aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    onClick={goToNext}
                    className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/14 bg-slate-950/72 text-white shadow-[0_14px_34px_rgba(2,6,23,0.32)] backdrop-blur hover:bg-slate-900"
                    aria-label="Próxima peça"
                  >
                    <ChevronRight size={18} aria-hidden="true" />
                  </button>
                </div>
              ) : null}
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-amber-200/20 bg-slate-950/50 p-4">
              <RareImageFallback label="Acervo Raro" />
              <p className="mt-4 text-sm text-slate-400">
                Nenhuma peça publicada no Acervo Raro ainda.
              </p>
            </div>
          )}

          {hasMultipleSlides ? (
            <div className="mt-5 flex items-center justify-center gap-2">
              {orderedSlides.map((slide, index) => (
                <button
                  key={slide.id}
                  type="button"
                  onClick={() => setActiveIndex(index)}
                  className={`h-2.5 rounded-full transition-all ${
                    index === activeIndex
                      ? "w-8 bg-amber-200"
                      : "w-2.5 bg-white/24 hover:bg-white/42"
                  }`}
                  aria-label={`Ir para ${slide.shortTitle || slide.name}`}
                />
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
