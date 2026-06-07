import Link from "next/link";
import {
  Boxes,
  ChartNoAxesColumn,
  CreditCard,
  Handshake,
  HeartPulse,
  LayoutDashboard,
  Package,
  ReceiptText,
  Users,
} from "lucide-react";

const navItems = [
  { href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/demanda", label: "Demanda", icon: HeartPulse },
  { href: "/admin/produtos", label: "Produtos", icon: Package },
  { href: "/admin/fornecedores", label: "Fornecedores", icon: Handshake },
  { href: "/admin/clientes", label: "Clientes", icon: Users },
  { href: "/admin/pedidos", label: "Pedidos", icon: ReceiptText },
  { href: "/admin/estoque", label: "Estoque", icon: Boxes },
  { href: "/admin/pagamentos", label: "Pagamentos", icon: CreditCard },
  { href: "/admin/caixa", label: "Caixa", icon: ChartNoAxesColumn },
];

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
    <div className="mx-auto grid max-w-7xl gap-6 px-4 py-8 sm:px-6 lg:grid-cols-[240px_1fr] lg:px-8">
      <aside className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3 lg:self-start">
        <nav className="grid gap-1" aria-label="Admin">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex h-10 items-center gap-2 rounded-md px-3 text-sm font-semibold text-[var(--muted)] hover:bg-[var(--surface-strong)] hover:text-[var(--foreground)]"
              >
                <Icon size={16} aria-hidden="true" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>

      <section>
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-[var(--foreground)]">{title}</h1>
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
