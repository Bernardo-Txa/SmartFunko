"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, ExternalLink } from "lucide-react";
import type { HomeBanner } from "@/server/home-banners/home-banner-service";

type Props = {
  banners: HomeBanner[];
};

function isExternalLink(link: string) {
  return /^https?:\/\//i.test(link);
}

export function HomeBannerCarousel({ banners }: Props) {
  const visibleBanners = useMemo(
    () => banners.filter((banner) => banner.status === "active" && banner.imageUrl).slice(0, 8),
    [banners],
  );
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(
    () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  const normalizedActiveIndex = activeIndex <= visibleBanners.length - 1 ? activeIndex : 0;
  const activeBanner = visibleBanners[normalizedActiveIndex] ?? visibleBanners[0];
  const hasMultipleBanners = visibleBanners.length > 1;

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");

    function onChange() {
      setPrefersReducedMotion(mediaQuery.matches);
    }

    mediaQuery.addEventListener("change", onChange);
    return () => mediaQuery.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    if (!hasMultipleBanners || isPaused || prefersReducedMotion) {
      return;
    }

    const intervalId = window.setInterval(() => {
      setActiveIndex((currentIndex) => (currentIndex + 1) % visibleBanners.length);
    }, 7000);

    return () => window.clearInterval(intervalId);
  }, [hasMultipleBanners, isPaused, prefersReducedMotion, visibleBanners.length]);

  function goToPrevious() {
    if (!hasMultipleBanners) {
      return;
    }

    setActiveIndex((currentIndex) => (currentIndex === 0 ? visibleBanners.length - 1 : currentIndex - 1));
  }

  function goToNext() {
    if (!hasMultipleBanners) {
      return;
    }

    setActiveIndex((currentIndex) => (currentIndex + 1) % visibleBanners.length);
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLElement>) {
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

  if (!activeBanner) {
    return null;
  }

  const shouldOpenNewTab = activeBanner.openInNewTab || (activeBanner.linkUrl ? isExternalLink(activeBanner.linkUrl) : false);
  const hasOverlayCopy = Boolean(activeBanner.eyebrow || activeBanner.subtitle || activeBanner.buttonLabel);
  const image = (
    <picture className="block h-full w-full">
      {activeBanner.mobileImageUrl ? (
        <source media="(max-width: 640px)" srcSet={activeBanner.mobileImageUrl} />
      ) : null}
      <img
        key={activeBanner.id}
        src={activeBanner.imageUrl}
        alt={activeBanner.title}
        className="block h-full w-full object-cover transition duration-500"
        loading={normalizedActiveIndex === 0 ? "eager" : "lazy"}
      />
    </picture>
  );

  const content = (
    <div className="relative aspect-[48/13] overflow-hidden bg-slate-950">
      {image}
      {hasOverlayCopy ? (
        <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950/86 via-slate-950/28 to-transparent p-4 sm:p-6 lg:p-8">
          <div className="mx-auto flex max-w-7xl items-end justify-between gap-4">
            <div className="min-w-0">
              {activeBanner.eyebrow ? (
                <span className="inline-flex rounded-full border border-yellow-300/42 bg-slate-950/54 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-yellow-100 backdrop-blur">
                  {activeBanner.eyebrow}
                </span>
              ) : null}
              {activeBanner.subtitle ? (
                <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-white sm:text-base">
                  {activeBanner.subtitle}
                </p>
              ) : null}
            </div>
            {activeBanner.buttonLabel ? (
              <span className="hidden h-10 shrink-0 items-center gap-2 rounded-full bg-[var(--yellow)] px-4 text-sm font-black text-slate-950 shadow-[0_18px_40px_rgba(250,204,21,0.18)] sm:inline-flex">
                {activeBanner.buttonLabel}
                {shouldOpenNewTab ? <ExternalLink size={15} aria-hidden="true" /> : null}
              </span>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );

  return (
    <section
      tabIndex={0}
      role="region"
      aria-label="Banners promocionais"
      onKeyDown={onKeyDown}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onFocus={() => setIsPaused(true)}
      onBlur={() => setIsPaused(false)}
      onTouchStart={(event) => setTouchStartX(event.touches[0]?.clientX ?? null)}
      onTouchEnd={(event) => onTouchEnd(event.changedTouches[0]?.clientX ?? 0)}
      className="group relative isolate border-b border-[var(--border)] bg-[#020617] outline-none"
    >
      {activeBanner.linkUrl ? (
        <Link
          href={activeBanner.linkUrl}
          target={shouldOpenNewTab ? "_blank" : undefined}
          rel={shouldOpenNewTab ? "noreferrer" : undefined}
          prefetch={!shouldOpenNewTab}
          aria-label={activeBanner.title}
          className="block"
        >
          {content}
        </Link>
      ) : (
        content
      )}

      {hasMultipleBanners ? (
        <div className="pointer-events-none absolute inset-x-0 bottom-3 z-10 mx-auto flex max-w-7xl items-center justify-between px-4 sm:bottom-5 sm:px-6 lg:px-8">
          <div className="pointer-events-auto flex gap-2 opacity-90 transition group-hover:opacity-100">
            <button
              type="button"
              onClick={goToPrevious}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/18 bg-slate-950/58 text-white backdrop-blur hover:bg-white/14"
              aria-label="Banner anterior"
            >
              <ChevronLeft size={18} aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={goToNext}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/18 bg-slate-950/58 text-white backdrop-blur hover:bg-white/14"
              aria-label="Proximo banner"
            >
              <ChevronRight size={18} aria-hidden="true" />
            </button>
          </div>

          <div className="pointer-events-auto flex items-center gap-2 rounded-full border border-white/12 bg-slate-950/44 px-2 py-1.5 backdrop-blur">
            {visibleBanners.map((banner, index) => (
              <button
                key={banner.id}
                type="button"
                onClick={() => setActiveIndex(index)}
                className={`h-2.5 rounded-full transition-all ${
                  index === normalizedActiveIndex
                    ? "w-8 bg-[var(--yellow)]"
                    : "w-2.5 bg-white/32 hover:bg-white/60"
                }`}
                aria-label={`Ir para ${banner.title}`}
              />
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}
