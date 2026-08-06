import Link from "next/link";
import {
  BadgePercent,
  BarChart3,
  CalendarClock,
  Clapperboard,
  Gem,
  LayoutDashboard,
  Package,
  ReceiptText,
  Ticket,
  Users,
} from "lucide-react";
import { isPopFlixEnabled, isRafflesEnabled } from "@/lib/env";

function getNavItems() {
  return [
    { href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/admin/clientes", label: "Clientes", icon: Users },
    { href: "/admin/produtos", label: "Produtos", icon: Package },
    { href: "/admin/pre-vendas", label: "Pre-vendas", icon: CalendarClock },
    { href: "/admin/acervo-raro", label: "Acervo Raro", icon: Gem },
    { href: "/admin/v2/pedidos", label: "Pedidos", icon: ReceiptText },
    ...(isPopFlixEnabled() ? [{ href: "/admin/popflix", label: "PopFlix", icon: Clapperboard }] : []),
    { href: "/admin/cupons", label: "Cupons", icon: BadgePercent },
    ...(isRafflesEnabled() ? [{ href: "/admin/rifas", label: "Rifas", icon: Ticket }] : []),
    { href: "/admin/relatorios/fechamento", label: "Relatorios", icon: BarChart3 },
  ];
}

export function AdminShell({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto grid w-full max-w-[1600px] min-w-0 gap-5 px-4 py-6 sm:px-6 lg:px-8 lg:py-8 xl:grid-cols-[240px_minmax(0,1fr)] xl:gap-6">
      <aside className="min-w-0 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-2 xl:self-start xl:p-3">
        <nav className="flex gap-2 overflow-x-auto pb-1 xl:grid xl:gap-1 xl:overflow-visible xl:pb-0" aria-label="Admin">
          {getNavItems().map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex h-11 min-w-0 shrink-0 items-center gap-2 rounded-md px-3 text-sm font-semibold text-[var(--muted)] hover:bg-[var(--surface-strong)] hover:text-[var(--foreground)] xl:h-10 xl:shrink"
              >
                <Icon size={16} aria-hidden="true" className="shrink-0" />
                <span className="truncate">{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </aside>

      <section className="min-w-0">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-[var(--foreground)] sm:text-3xl">{title}</h1>
          <p className="mt-2 text-sm text-[var(--muted)]">{description}</p>
        </div>
        <div className="min-w-0">{children}</div>
      </section>
    </div>
  );
}

export function MetricCard({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="min-w-0 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5">
      <span className="text-sm font-semibold text-[var(--muted)]">{label}</span>
      <strong className="mt-3 block break-words text-xl leading-tight text-[var(--foreground)] sm:text-2xl">{value}</strong>
      <span className="mt-1 block text-sm text-[var(--muted)]">{detail}</span>
    </div>
  );
}
