import Link from "next/link";
import { ArrowRight } from "lucide-react";

export function CommercialSection({
  children,
  ctaHref,
  ctaLabel = "Ver tudo",
  description,
  eyebrow,
  title,
}: {
  children: React.ReactNode;
  ctaHref?: string;
  ctaLabel?: string;
  description?: string;
  eyebrow?: string;
  title: string;
}) {
  return (
    <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          {eyebrow ? (
            <p className="text-xs font-black uppercase tracking-[0.2em] text-[var(--yellow)]">
              {eyebrow}
            </p>
          ) : null}
          <h2 className="mt-1 text-2xl font-black text-[var(--foreground)]">{title}</h2>
          {description ? (
            <p className="mt-1 max-w-3xl text-sm leading-6 text-[var(--muted)]">
              {description}
            </p>
          ) : null}
        </div>
        {ctaHref ? (
          <Link
            href={ctaHref}
            prefetch={false}
            className="inline-flex h-10 w-fit items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface)] px-4 text-sm font-bold text-[var(--foreground)] hover:bg-cyan-400/15"
          >
            {ctaLabel}
            <ArrowRight size={16} aria-hidden="true" />
          </Link>
        ) : null}
      </div>
      {children}
    </section>
  );
}

