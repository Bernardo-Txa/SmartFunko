import Link from "next/link";
import { ArrowRight } from "lucide-react";

export function CategoryTile({
  description,
  href,
  label,
}: {
  description?: string;
  href: string;
  label: string;
}) {
  return (
    <Link
      href={href}
      prefetch={false}
      className="group flex min-h-32 flex-col justify-between rounded-lg border border-cyan-300/18 bg-[#030816]/78 p-4 shadow-[0_16px_32px_rgba(2,6,23,0.22)] hover:border-cyan-300/45 hover:bg-cyan-400/10"
    >
      <div>
        <h3 className="text-lg font-black text-[var(--foreground)]">{label}</h3>
        {description ? (
          <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{description}</p>
        ) : null}
      </div>
      <span className="mt-4 inline-flex h-8 w-8 items-center justify-center rounded-full bg-[var(--surface-strong)] text-[var(--accent)] group-hover:bg-[var(--yellow)] group-hover:text-[#020617]">
        <ArrowRight size={16} aria-hidden="true" />
      </span>
    </Link>
  );
}

