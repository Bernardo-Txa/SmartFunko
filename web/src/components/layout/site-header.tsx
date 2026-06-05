import Image from "next/image";
import Link from "next/link";
import { ChevronDown, LayoutDashboard, LogOut, Package, User } from "lucide-react";
import { getCurrentUser } from "@/server/auth/get-current-user";

export async function SiteHeader() {
  const currentUser = await getCurrentUser();
  const isOwner = currentUser?.profile.role === "owner";
  const accountLabel = currentUser?.profile.name || currentUser?.profile.email || currentUser?.authUser.email;
  const ordersHref = currentUser ? "/conta/pedidos" : "/login?next=/conta/pedidos";
  const links: Array<{ href: string; label: string }> = [
    { href: "/catalogo", label: "Catalogo" },
    { href: "/fornecedores", label: "Fornecedores" },
    { href: ordersHref, label: "Meus pedidos" },
  ];

  if (currentUser) {
    links.push({ href: "/conta", label: "Minha conta" });
  }

  return (
    <header className="sticky top-0 z-50 border-b border-[var(--border)] bg-[#020617]/78 backdrop-blur-xl">
      <div className="mx-auto flex min-h-20 max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-3 text-[var(--foreground)]">
          <Image
            src="/brand/SmartFunko.png"
            alt="Smart Funkos"
            width={160}
            height={56}
            preload
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
          {currentUser ? (
            <details className="group relative">
              <summary className="inline-flex h-10 cursor-pointer list-none items-center gap-2 rounded-full border border-[var(--border)] bg-[#020617]/42 px-4 text-sm font-bold text-[var(--foreground)] hover:bg-cyan-400/15 [&::-webkit-details-marker]:hidden">
                <User size={16} aria-hidden="true" />
                <span className="max-w-32 truncate sm:max-w-44">{accountLabel}</span>
                <ChevronDown
                  size={15}
                  aria-hidden="true"
                  className="transition group-open:rotate-180"
                />
              </summary>
              <div className="absolute right-0 mt-2 w-56 overflow-hidden rounded-lg border border-[var(--border)] bg-[#020617] p-2 shadow-[0_20px_54px_rgba(2,6,23,0.45)]">
                <div className="border-b border-[var(--border)] px-3 py-2">
                  <p className="truncate text-sm font-bold text-[var(--foreground)]">{accountLabel}</p>
                  <p className="truncate text-xs text-[var(--muted)]">{currentUser.profile.email}</p>
                </div>
                <Link
                  href="/conta/pedidos"
                  className="mt-2 flex h-10 items-center gap-2 rounded-md px-3 text-sm font-semibold text-[var(--foreground)] hover:bg-cyan-400/12"
                >
                  <Package size={16} aria-hidden="true" />
                  Meus pedidos
                </Link>
                {isOwner ? (
                  <Link
                    href="/admin/dashboard"
                    className="flex h-10 items-center gap-2 rounded-md px-3 text-sm font-semibold text-[var(--foreground)] hover:bg-cyan-400/12"
                  >
                    <LayoutDashboard size={16} aria-hidden="true" />
                    Painel
                  </Link>
                ) : null}
                <Link
                  href="/conta"
                  className="flex h-10 items-center gap-2 rounded-md px-3 text-sm font-semibold text-[var(--foreground)] hover:bg-cyan-400/12"
                >
                  <User size={16} aria-hidden="true" />
                  Minha conta
                </Link>
                <form action="/api/v1/auth/logout" method="post">
                  <button className="flex h-10 w-full items-center gap-2 rounded-md px-3 text-left text-sm font-semibold text-[var(--foreground)] hover:bg-cyan-400/12">
                    <LogOut size={16} aria-hidden="true" />
                    Sair
                  </button>
                </form>
              </div>
            </details>
          ) : (
            <Link
              href="/login"
              className="inline-flex h-10 items-center gap-2 rounded-full border border-[var(--border)] bg-[#020617]/42 px-4 text-sm font-bold text-[var(--foreground)] hover:bg-cyan-400/15"
            >
              <User size={16} aria-hidden="true" />
              Entrar
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
