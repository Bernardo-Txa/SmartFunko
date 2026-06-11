import Link from "next/link";
import {
  Boxes,
  BadgePercent,
  ChartNoAxesColumn,
  CreditCard,
  Gem,
  Handshake,
  HeartPulse,
  LayoutDashboard,
  PackageSearch,
  Package,
  ReceiptText,
  Ticket,
  Users,
} from "lucide-react";
import { isRafflesEnabled, isRewardsEnabled } from "@/lib/env";

function getNavItems() {
  return [
    { href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/admin/demanda", label: "Demanda", icon: HeartPulse },
    { href: "/admin/produtos", label: "Produtos", icon: Package },
    { href: "/admin/fornecedores", label: "Fornecedores", icon: Handshake },
    { href: "/admin/clientes", label: "Clientes", icon: Users },
    { href: "/admin/pedidos", label: "Pedidos", icon: ReceiptText },
    { href: "/admin/cupons", label: "Cupons", icon: BadgePercent },
    ...(isRewardsEnabled() ? [{ href: "/admin/clube", label: "Smart Clube", icon: Gem }] : []),
    ...(isRafflesEnabled() ? [{ href: "/admin/rifas", label: "Rifas", icon: Ticket }] : []),
    { href: "/admin/lotes", label: "Lotes", icon: PackageSearch },
    { href: "/admin/estoque", label: "Estoque", icon: Boxes },
    { href: "/admin/pagamentos", label: "Pagamentos", icon: CreditCard },
    { href: "/admin/caixa", label: "Caixa", icon: ChartNoAxesColumn },
    { href: "/admin/bi", label: "BI / Relatorios", icon: ChartNoAxesColumn },
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
    <div className="mx-auto grid max-w-7xl gap-5 px-4 py-6 sm:px-6 lg:grid-cols-[240px_minmax(0,1fr)] lg:gap-6 lg:px-8 lg:py-8">
      <aside className="min-w-0 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-2 lg:self-start lg:p-3">
        <nav className="flex gap-2 overflow-x-auto pb-1 lg:grid lg:gap-1 lg:overflow-visible lg:pb-0" aria-label="Admin">
          {getNavItems().map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex h-11 shrink-0 items-center gap-2 rounded-md px-3 text-sm font-semibold text-[var(--muted)] hover:bg-[var(--surface-strong)] hover:text-[var(--foreground)] lg:h-10 lg:shrink"
              >
                <Icon size={16} aria-hidden="true" />
                {item.label}
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
        {children}
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
    <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5">
      <span className="text-sm font-semibold text-[var(--muted)]">{label}</span>
      <strong className="mt-3 block text-2xl text-[var(--foreground)]">{value}</strong>
      <span className="mt-1 block text-sm text-[var(--muted)]">{detail}</span>
    </div>
  );
}
