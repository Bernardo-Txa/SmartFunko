import Link from "next/link";
import type { ReactNode } from "react";
import { BarChart3, FileText, WalletCards } from "lucide-react";

type ReportTab = {
  href: string;
  icon: typeof BarChart3;
  id: "bi" | "closing" | "finance";
  label: string;
};

const reportTabs: ReportTab[] = [
  { href: "/admin/relatorios/fechamento", icon: FileText, id: "closing", label: "Fechamento mensal" },
  { href: "/admin/relatorios", icon: BarChart3, id: "bi", label: "BI" },
  { href: "/admin/relatorios/financeiro", icon: WalletCards, id: "finance", label: "Financeiro" },
];

const toneClasses = {
  accent: "border-cyan-300/40 bg-cyan-300/10 text-cyan-100",
  danger: "border-red-300/40 bg-red-300/10 text-red-100",
  emerald: "border-emerald-300/40 bg-emerald-300/10 text-emerald-100",
  muted: "border-[var(--border)] bg-[var(--surface-strong)] text-[var(--muted)]",
  violet: "border-violet-300/40 bg-violet-300/10 text-violet-100",
  warning: "border-yellow-300/40 bg-yellow-300/10 text-yellow-100",
} as const;

type Tone = keyof typeof toneClasses;

export function ReportNavigation({ active }: { active: ReportTab["id"] }) {
  return (
    <nav
      aria-label="Relatorios"
      className="flex flex-wrap gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-2"
    >
      {reportTabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = tab.id === active;

        return (
          <Link
            key={tab.id}
            href={tab.href}
            aria-current={isActive ? "page" : undefined}
            className={[
              "inline-flex h-10 items-center justify-center gap-2 rounded-md px-3 text-sm font-semibold transition",
              isActive
                ? "bg-[var(--accent)] text-slate-950"
                : "border border-transparent text-[var(--foreground)] hover:border-[var(--border)] hover:bg-[var(--surface-strong)]",
            ].join(" ")}
          >
            <Icon size={16} aria-hidden="true" />
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function ReportHero({
  actions,
  children,
  description,
  eyebrow,
  title,
}: {
  actions?: ReactNode;
  children?: ReactNode;
  description: string;
  eyebrow: string;
  title: string;
}) {
  return (
    <section className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5">
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-start">
        <div>
          <span className="text-xs font-black uppercase tracking-[0.14em] text-[var(--yellow)]">{eyebrow}</span>
          <h2 className="mt-2 text-2xl font-black text-[var(--foreground)] sm:text-3xl">{title}</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--muted)]">{description}</p>
        </div>
        {actions ? <div className="flex flex-wrap gap-2 xl:justify-end">{actions}</div> : null}
      </div>
      {children ? <div className="mt-5">{children}</div> : null}
    </section>
  );
}

export function ReportKpiCard({
  detail,
  label,
  tone = "muted",
  value,
}: {
  detail: string;
  label: string;
  tone?: Tone;
  value: string;
}) {
  return (
    <div className={["rounded-lg border p-4", toneClasses[tone]].join(" ")}>
      <span className="text-xs font-black uppercase tracking-[0.12em] opacity-80">{label}</span>
      <strong className="mt-2 block text-2xl text-[var(--foreground)]">{value}</strong>
      <span className="mt-1 block text-sm opacity-80">{detail}</span>
    </div>
  );
}

export function ReportTableSection({
  action,
  children,
  description,
  title,
}: {
  action?: ReactNode;
  children: ReactNode;
  description?: string;
  title: string;
}) {
  return (
    <section className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg font-bold text-[var(--foreground)]">{title}</h2>
          {description ? <p className="mt-1 text-sm text-[var(--muted)]">{description}</p> : null}
        </div>
        {action}
      </div>
      <div className="mt-4 overflow-x-auto">{children}</div>
    </section>
  );
}

export function ReportProgressBar({ tone = "accent", value }: { tone?: Tone; value: number }) {
  const safeValue = Math.max(0, Math.min(100, value));
  const barClassName = {
    accent: "bg-cyan-300",
    danger: "bg-red-300",
    emerald: "bg-emerald-300",
    muted: "bg-slate-400",
    violet: "bg-violet-300",
    warning: "bg-yellow-300",
  }[tone];

  return (
    <div className="h-2 overflow-hidden rounded-full bg-[var(--surface-strong)]">
      <div className={["h-full rounded-full", barClassName].join(" ")} style={{ width: `${safeValue}%` }} />
    </div>
  );
}
