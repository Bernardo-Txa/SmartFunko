import Image from "next/image";
import Link from "next/link";
import { ShieldCheck, User } from "lucide-react";

const links = [
  { href: "/catalogo", label: "Catalogo" },
  { href: "/conta/pedidos", label: "Meus pedidos" },
  { href: "/admin/dashboard", label: "Admin" },
];

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-[var(--border)] bg-[#020617]/78 backdrop-blur-xl">
      <div className="mx-auto flex min-h-20 max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-3 text-[var(--foreground)]">
          <Image
            src="/brand/SmartFunko.png"
            alt="Smart Funkos"
            width={160}
            height={56}
            priority
            className="h-12 w-auto drop-shadow-[0_0_18px_rgba(34,211,238,0.42)]"
          />
        </Link>

        <nav
          className="hidden items-center gap-1 rounded-full border border-[var(--border)] bg-[#020617]/45 p-1 shadow-[0_0_22px_rgba(14,165,233,0.12)] md:flex"
          aria-label="Principal"
        >
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-full px-4 py-2 text-sm font-bold text-[var(--foreground)] hover:bg-cyan-400/15 hover:text-white"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <Link
            href="/login"
            className="inline-flex h-10 items-center gap-2 rounded-full border border-[var(--border)] bg-[#020617]/42 px-4 text-sm font-bold text-[var(--foreground)] hover:bg-cyan-400/15"
          >
            <User size={16} aria-hidden="true" />
            Entrar
          </Link>
          <Link
            href="/admin/login"
            className="hidden h-10 items-center gap-2 rounded-full bg-[var(--yellow)] px-4 text-sm font-bold text-[#020617] shadow-[0_0_18px_rgba(250,204,21,0.28)] hover:brightness-110 sm:inline-flex"
          >
            <ShieldCheck size={16} aria-hidden="true" />
            Painel
          </Link>
        </div>
      </div>
    </header>
  );
}
