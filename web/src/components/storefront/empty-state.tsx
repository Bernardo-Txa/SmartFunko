import Link from "next/link";
import { SearchX } from "lucide-react";

export function EmptyState({
  actionHref,
  actionLabel,
  description,
  title,
}: {
  actionHref?: string;
  actionLabel?: string;
  description: string;
  title: string;
}) {
  return (
    <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-6 text-center">
      <SearchX className="mx-auto text-[var(--accent)]" size={28} aria-hidden="true" />
      <h2 className="mt-4 text-lg font-black text-[var(--foreground)]">{title}</h2>
      <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-[var(--muted)]">
        {description}
      </p>
      {actionHref && actionLabel ? (
        <Link
          href={actionHref}
          prefetch={false}
          className="mt-5 inline-flex h-10 items-center justify-center rounded-full bg-[var(--yellow)] px-4 text-sm font-black text-[#020617] hover:brightness-110"
        >
          {actionLabel}
        </Link>
      ) : null}
    </div>
  );
}

