"use client";

import Image from "next/image";
import { Loader2 } from "lucide-react";
import { clsx } from "clsx";

type LoadingProps = {
  className?: string;
  message?: string;
};

type ButtonLoadingProps = LoadingProps & {
  showMessage?: boolean;
};

export function SmartPageLoading({
  className,
  message = "Preparando sua experiência SmartFunko...",
}: LoadingProps) {
  return (
    <section
      role="status"
      aria-live="polite"
      className={clsx(
        "grid min-h-[360px] place-items-center px-4 py-12",
        className,
      )}
    >
      <div className="relative grid w-full max-w-sm place-items-center overflow-hidden rounded-xl border border-cyan-300/24 bg-[#020617]/92 px-6 py-8 text-center shadow-[0_28px_70px_rgba(14,165,233,0.18)]">
        <div className="absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-cyan-200/70 to-transparent" />
        <div className="absolute -top-16 h-32 w-32 rounded-full bg-cyan-300/16 blur-3xl" />
        <div className="relative grid place-items-center gap-4">
          <div className="relative grid h-20 w-20 place-items-center rounded-full border border-cyan-300/25 bg-cyan-300/10 shadow-[0_0_32px_rgba(34,211,238,0.18)]">
            <Image
              src="/brand/SmartFunkoIcone.png"
              alt=""
              width={48}
              height={48}
              className="h-12 w-12 object-contain drop-shadow-[0_0_16px_rgba(250,204,21,0.38)]"
            />
            <Loader2
              aria-hidden="true"
              className="absolute inset-0 m-auto h-20 w-20 animate-spin text-cyan-200/32"
              strokeWidth={1.4}
            />
          </div>
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-[var(--yellow)]">
              Smart Funko
            </p>
            <p className="mt-2 text-sm font-bold text-slate-100">{message}</p>
          </div>
        </div>
      </div>
    </section>
  );
}

export function SmartInlineLoading({
  className,
  message = "Carregando...",
}: LoadingProps) {
  return (
    <span
      role="status"
      aria-live="polite"
      className={clsx("inline-flex items-center gap-2 text-sm font-semibold text-cyan-100", className)}
    >
      <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin text-[var(--yellow)]" />
      <span>{message}</span>
    </span>
  );
}

export function SmartButtonLoading({
  className,
  message = "Carregando...",
  showMessage = true,
}: ButtonLoadingProps) {
  return (
    <span
      role="status"
      aria-live="polite"
      className={clsx("inline-flex items-center justify-center gap-2", className)}
    >
      <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />
      <span className={showMessage ? undefined : "sr-only"}>{message}</span>
    </span>
  );
}
