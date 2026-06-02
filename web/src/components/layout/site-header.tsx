import Link from "next/link";
import { PackageSearch, ShieldCheck, User } from "lucide-react";

const links = [
  { href: "/catalogo", label: "Catalogo" },
  { href: "/conta/pedidos", label: "Meus pedidos" },
  { href: "/admin/dashboard", label: "Admin" },
];

export function SiteHeader() {
  return (
    <header className="border-b border-[var(--border)] bg-white">
      <div className="mx-auto flex min-h-16 max-w-7xl items-center justify-between gap-6 px-4 py-3 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-3 text-[var(--foreground)]">
          <span className="flex size-10 items-center justify-center rounded-lg bg-[var(--foreground)] text-white">
            <PackageSearch size={20} aria-hidden="true" />
          </span>
          <span className="flex flex-col leading-none">
            <strong className="text-base font-semibold">Smart Funkos</strong>
            <span className="text-xs text-[var(--muted)]">Catalogo e pedidos</span>
          </span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex" aria-label="Principal">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-md px-3 py-2 text-sm font-medium text-[var(--muted)] hover:bg-[var(--surface-strong)] hover:text-[var(--foreground)]"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <Link
            href="/login"
            className="inline-flex h-10 items-center gap-2 rounded-md border border-[var(--border)] bg-white px-3 text-sm font-medium text-[var(--foreground)] hover:bg-[var(--surface-strong)]"
          >
            <User size={16} aria-hidden="true" />
            Entrar
          </Link>
          <Link
            href="/admin/login"
            className="hidden h-10 items-center gap-2 rounded-md bg-[var(--accent)] px-3 text-sm font-medium text-white hover:bg-[var(--accent-strong)] sm:inline-flex"
          >
            <ShieldCheck size={16} aria-hidden="true" />
            Painel
          </Link>
        </div>
      </div>
    </header>
  );
}
