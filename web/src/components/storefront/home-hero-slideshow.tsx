"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, ImageIcon, Sparkles } from "lucide-react";
import { SafeProductImage } from "@/components/product/safe-product-image";
import { formatCurrency } from "@/lib/format";

export type HomeHeroSlide = {
  badge?: string | null;
  buttonText?: string | null;
  description?: string | null;
  id: string;
  imageUrl?: string | null;
  linkUrl?: string | null;
  openInNewTab?: boolean;
  price?: number | null;
  title: string;
};

type Props = {
  slides: HomeHeroSlide[];
};

function SlideFallback() {
  return (
    <div className="grid aspect-[4/3] w-full place-items-center rounded-lg border border-dashed border-cyan-200/20 bg-slate-950/72 text-cyan-100">
      <div className="text-center">
        <ImageIcon className="mx-auto" size={36} aria-hidden="true" />
        <span className="mt-2 block text-xs font-black uppercase tracking-[0.12em]">Smart Funkos</span>
      </div>
    </div>
  );
}

function isExternalLink(link: string) {
  return /^https?:\/\//i.test(link);
}

export function HomeHeroSlideshow({ slides }: Props) {
  const visibleSlides = useMemo(
    () => slides.filter((slide) => slide.title && slide.linkUrl).slice(0, 8),
    [slides],
  );
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(
    () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  const activeSlide = visibleSlides[activeIndex] ?? visibleSlides[0];
  const hasMultipleSlides = visibleSlides.length > 1;

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");

    function onChange() {
      setPrefersReducedMotion(mediaQuery.matches);
    }

    mediaQuery.addEventListener("change", onChange);
    return () => mediaQuery.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    if (!hasMultipleSlides || isPaused || prefersReducedMotion) {
      return;
    }

    const intervalId = window.setInterval(() => {
      setActiveIndex((currentIndex) => (currentIndex + 1) % visibleSlides.length);
    }, 6000);

    return () => window.clearInterval(intervalId);
  }, [hasMultipleSlides, isPaused, prefersReducedMotion, visibleSlides.length]);

  function goToPrevious() {
    if (!hasMultipleSlides) {
      return;
    }

    setActiveIndex((currentIndex) => (currentIndex === 0 ? visibleSlides.length - 1 : currentIndex - 1));
  }

  function goToNext() {
    if (!hasMultipleSlides) {
      return;
    }

    setActiveIndex((currentIndex) => (currentIndex + 1) % visibleSlides.length);
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      goToPrevious();
    }

    if (event.key === "ArrowRight") {
      event.preventDefault();
      goToNext();
    }
  }

  function onTouchEnd(clientX: number) {
    if (touchStartX === null) {
      return;
    }

    const delta = clientX - touchStartX;
    setTouchStartX(null);

    if (Math.abs(delta) < 42) {
      return;
    }

    if (delta > 0) {
      goToPrevious();
    } else {
      goToNext();
    }
  }

  if (!activeSlide) {
    return (
      <div className="w-full max-w-md rounded-lg border border-dashed border-yellow-300/24 bg-[#030816]/72 p-4 shadow-[0_28px_60px_rgba(2,6,23,0.38)]">
        <SlideFallback />
        <p className="mt-4 text-xs font-black uppercase tracking-[0.18em] text-cyan-100">Smart seleção</p>
        <strong className="mt-2 block text-2xl font-black leading-tight text-white">Novos destaques em breve</strong>
      </div>
    );
  }

  const buttonText = activeSlide.buttonText || (activeSlide.linkUrl ? "Ver destaque" : "");
  const shouldOpenNewTab = activeSlide.openInNewTab || (activeSlide.linkUrl ? isExternalLink(activeSlide.linkUrl) : false);

  return (
    <div
      tabIndex={0}
      role="region"
      aria-label="Slideshow principal da Smart Funkos"
      onKeyDown={onKeyDown}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onFocus={() => setIsPaused(true)}
      onBlur={() => setIsPaused(false)}
      onTouchStart={(event) => setTouchStartX(event.touches[0]?.clientX ?? null)}
      onTouchEnd={(event) => onTouchEnd(event.changedTouches[0]?.clientX ?? 0)}
      className="group relative w-full max-w-[402px] outline-none"
    >
      <div
        key={activeSlide.id}
        className="relative grid min-h-[510px] grid-rows-[auto_1fr] overflow-hidden rounded-lg border border-yellow-300/28 bg-[linear-gradient(150deg,rgba(3,7,18,0.98),rgba(8,47,73,0.74)_48%,rgba(113,63,18,0.32))] p-3 shadow-[0_28px_80px_rgba(2,6,23,0.5)] transition-opacity duration-500 sm:min-h-[520px]"
      >
        <div className="pointer-events-none absolute -right-16 -top-16 h-36 w-36 rounded-full bg-yellow-300/14 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 left-8 h-40 w-40 rounded-full bg-cyan-300/12 blur-3xl" />

        <div className="relative overflow-hidden rounded-lg border border-white/12 bg-white shadow-[0_20px_54px_rgba(2,6,23,0.36)]">
          {activeSlide.imageUrl ? (
            <SafeProductImage
              src={activeSlide.imageUrl}
              alt={activeSlide.title}
              fallback={<SlideFallback />}
              priority={activeIndex === 0}
              sizes="(min-width: 1024px) 360px, 90vw"
              aspectClassName="aspect-[4/3]"
              imageClassName="p-4 sm:p-5"
            />
          ) : (
            <SlideFallback />
          )}
        </div>

        <div className="relative flex min-h-0 flex-col px-1 py-4">
          <div className="flex min-h-7 flex-wrap items-start gap-2 overflow-hidden">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-yellow-300/24 bg-yellow-300/12 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-yellow-100">
              <Sparkles size={12} aria-hidden="true" />
              Destaque Smart
            </span>
            {activeSlide.badge ? (
              <span className="max-w-[150px] truncate rounded-full border border-cyan-200/18 bg-cyan-300/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-cyan-100">
                {activeSlide.badge}
              </span>
            ) : null}
          </div>

          <h2 className="mt-3 min-h-[56px] line-clamp-2 text-xl font-black leading-tight text-white sm:min-h-[64px] sm:text-2xl">
            {activeSlide.title}
          </h2>
          <p className="mt-2 min-h-12 line-clamp-2 text-sm leading-6 text-slate-300">
            {activeSlide.description || "Produto Smart Funkos com atendimento pelo WhatsApp."}
          </p>

          <div className="mt-auto flex items-end justify-between gap-3 pt-4">
            <div className="min-w-0">
              <span className="block text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">
                A partir de
              </span>
              <strong className="mt-1 block truncate text-xl font-black text-white">
                {activeSlide.price ? formatCurrency(activeSlide.price) : "Sob consulta"}
              </strong>
            </div>
            {activeSlide.linkUrl && buttonText ? (
              <Link
                href={activeSlide.linkUrl}
                target={shouldOpenNewTab ? "_blank" : undefined}
                rel={shouldOpenNewTab ? "noreferrer" : undefined}
                prefetch={!shouldOpenNewTab}
                className="inline-flex h-10 shrink-0 items-center justify-center rounded-md bg-[var(--yellow)] px-4 text-sm font-black text-slate-950 shadow-[0_12px_30px_rgba(250,204,21,0.18)] hover:brightness-105"
              >
                {buttonText}
              </Link>
            ) : null}
          </div>
        </div>
      </div>

      {hasMultipleSlides ? (
        <div className="mt-3 flex items-center justify-between gap-3 px-1">
          <div className="flex gap-2 opacity-90 transition group-hover:opacity-100">
            <button
              type="button"
              onClick={goToPrevious}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/12 bg-slate-950/42 text-white backdrop-blur hover:bg-white/12"
              aria-label="Slide anterior"
            >
              <ChevronLeft size={18} aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={goToNext}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/12 bg-slate-950/42 text-white backdrop-blur hover:bg-white/12"
              aria-label="Próximo slide"
            >
              <ChevronRight size={18} aria-hidden="true" />
            </button>
          </div>

          <div className="flex items-center gap-2">
            {visibleSlides.map((slide, index) => (
              <button
                key={slide.id}
                type="button"
                onClick={() => setActiveIndex(index)}
                className={`h-2.5 rounded-full transition-all ${
                  index === activeIndex
                    ? "w-8 bg-[var(--yellow)]"
                    : "w-2.5 bg-white/24 hover:bg-white/42"
                }`}
                aria-label={`Ir para ${slide.title}`}
              />
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
