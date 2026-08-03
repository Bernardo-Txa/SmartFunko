"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { clsx } from "clsx";

type HeaderNavLinkProps = {
  href: string;
  label: string;
};

function isActiveLink(pathname: string, href: string) {
  if (href.startsWith("/login")) {
    return false;
  }

  if (href === "/fornecedores") {
    return pathname.startsWith("/fornecedores") || pathname.startsWith("/collabs");
  }

  if (href === "/conta/pedidos" || href === "/conta/pedidos-v2") {
    return pathname.startsWith("/conta/pedidos");
  }

  if (href === "/acervo-raro") {
    return pathname.startsWith("/acervo-raro") || pathname.startsWith("/specials");
  }

  return href !== "/" && pathname === href;
}

export function HeaderNavLink({ href, label }: HeaderNavLinkProps) {
  const pathname = usePathname();
  const isActive = isActiveLink(pathname, href);

  return (
    <Link
      href={href}
      className={clsx(
        "inline-flex h-10 shrink-0 items-center justify-center whitespace-nowrap rounded-full px-3 text-sm font-bold leading-none transition 2xl:px-4",
        isActive
          ? "bg-cyan-300/14 text-white ring-1 ring-cyan-200/26"
          : "text-slate-200 hover:bg-cyan-400/12 hover:text-white",
      )}
      aria-current={isActive ? "page" : undefined}
    >
      {label}
    </Link>
  );
}
