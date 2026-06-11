"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, Heart, LayoutDashboard, LogOut, Menu, Package, User } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { clsx } from "clsx";
import type { Dispatch, RefObject, SetStateAction } from "react";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { CartNavButton } from "@/components/storefront/cart-button";
import { MobileMegaMenu, type FranchiseOption } from "@/components/storefront/mega-menu";
import type { CatalogCategory } from "@/lib/catalog";

type HeaderLink = {
  href: string;
  label: string;
};

type AccountSummary = {
  accountLabel: string;
  email: string;
  isOwner: boolean;
} | null;

type HeaderActionsProps = {
  account: AccountSummary;
  categories: CatalogCategory[];
  franchises: FranchiseOption[];
  links: HeaderLink[];
};

function useCloseMenu(
  isOpen: boolean,
  setIsOpen: Dispatch<SetStateAction<boolean>>,
  menuRef: RefObject<HTMLDivElement | null>,
) {
  useEffect(() => {
    if (!isOpen) {
      return;
    }

    function onPointerDown(event: PointerEvent) {
      if (!menuRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [isOpen, menuRef, setIsOpen]);
}

export function HeaderActions({ account, categories, franchises, links }: HeaderActionsProps) {
  const accountMenuRef = useRef<HTMLDivElement>(null);
  const mobileMenuRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const [isAccountOpen, setIsAccountOpen] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  useCloseMenu(isAccountOpen, setIsAccountOpen, accountMenuRef);
  useCloseMenu(isMobileOpen, setIsMobileOpen, mobileMenuRef);

  function closeAccountMenu() {
    setIsAccountOpen(false);
  }

  function closeMobileMenu() {
    setIsMobileOpen(false);
  }

  function isMobileLinkActive(href: string) {
    const normalizedHref = href.split("?")[0];

    if (normalizedHref === "/fornecedores") {
      return pathname.startsWith("/fornecedores") || pathname.startsWith("/collabs");
    }

    return pathname.startsWith(normalizedHref);
  }

  return (
    <div className="flex items-center gap-2">
      <ThemeToggle />
      <CartNavButton className="hidden sm:inline-flex" />
      {account ? (
        <div ref={accountMenuRef} className="relative hidden sm:block">
          <button
            type="button"
            aria-expanded={isAccountOpen}
            className="inline-flex h-11 cursor-pointer list-none items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface)] px-4 text-sm font-bold text-[var(--foreground)] hover:bg-[var(--surface-strong)]"
            onClick={() => setIsAccountOpen((current) => !current)}
          >
            <User size={16} aria-hidden="true" />
            <span className="max-w-32 truncate sm:max-w-44">{account.accountLabel}</span>
            <ChevronDown
              size={15}
              aria-hidden="true"
              className={`transition ${isAccountOpen ? "rotate-180" : ""}`}
            />
          </button>
          {isAccountOpen ? (
            <div className="absolute right-0 mt-2 w-56 overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--surface)] p-2 shadow-[0_20px_54px_rgba(2,6,23,0.24)]">
              <div className="border-b border-[var(--border)] px-3 py-2">
                <p className="truncate text-sm font-bold text-[var(--foreground)]">
                  {account.accountLabel}
                </p>
                <p className="truncate text-xs text-[var(--muted)]">{account.email}</p>
              </div>
              <Link
                href="/conta/pedidos"
                onClick={closeAccountMenu}
                className="mt-2 flex h-10 items-center gap-2 rounded-md px-3 text-sm font-semibold text-[var(--foreground)] hover:bg-[var(--surface-strong)]"
              >
                <Package size={16} aria-hidden="true" />
                Meus pedidos
              </Link>
              <Link
                href="/conta/wishlist"
                onClick={closeAccountMenu}
                className="flex h-10 items-center gap-2 rounded-md px-3 text-sm font-semibold text-[var(--foreground)] hover:bg-[var(--surface-strong)]"
              >
                <Heart size={16} aria-hidden="true" />
                Favoritos
              </Link>
              {account.isOwner ? (
                <Link
                  href="/admin/dashboard"
                  onClick={closeAccountMenu}
                  className="flex h-10 items-center gap-2 rounded-md px-3 text-sm font-semibold text-[var(--foreground)] hover:bg-[var(--surface-strong)]"
                >
                  <LayoutDashboard size={16} aria-hidden="true" />
                  Painel
                </Link>
              ) : null}
              <Link
                href="/conta"
                onClick={closeAccountMenu}
                className="flex h-10 items-center gap-2 rounded-md px-3 text-sm font-semibold text-[var(--foreground)] hover:bg-[var(--surface-strong)]"
              >
                <User size={16} aria-hidden="true" />
                Minha conta
              </Link>
              <form action="/api/v1/auth/logout" method="post">
                <button
                  className="flex h-10 w-full items-center gap-2 rounded-md px-3 text-left text-sm font-semibold text-[var(--foreground)] hover:bg-[var(--surface-strong)]"
                  onClick={closeAccountMenu}
                >
                  <LogOut size={16} aria-hidden="true" />
                  Sair
                </button>
              </form>
            </div>
          ) : null}
        </div>
      ) : (
        <Link
          href="/login"
          className="hidden h-11 items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface)] px-4 text-sm font-bold text-[var(--foreground)] hover:bg-[var(--surface-strong)] sm:inline-flex"
        >
          <User size={16} aria-hidden="true" />
          Entrar
        </Link>
      )}

      <div ref={mobileMenuRef} className="relative lg:hidden">
        <button
          type="button"
          aria-expanded={isMobileOpen}
          className="inline-flex h-11 w-11 cursor-pointer list-none items-center justify-center rounded-full border border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)] hover:bg-[var(--surface-strong)]"
          onClick={() => setIsMobileOpen((current) => !current)}
        >
          <Menu size={18} aria-hidden="true" />
          <span className="sr-only">Abrir menu</span>
        </button>
        {isMobileOpen ? (
          <div className="absolute right-0 mt-2 max-h-[calc(100svh-6rem)] w-[min(22rem,calc(100vw-2rem))] overflow-y-auto rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3 shadow-[0_24px_64px_rgba(2,6,23,0.24)]">
            <div className="grid gap-2">
              <MobileMegaMenu
                categories={categories}
                franchises={franchises}
                onNavigate={closeMobileMenu}
              />
              {links.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  prefetch={false}
                  onClick={closeMobileMenu}
                  className={clsx(
                    "flex min-h-11 items-center rounded-lg px-3 py-2 text-sm font-bold hover:bg-[var(--surface-strong)]",
                    isMobileLinkActive(link.href)
                      ? "bg-[var(--surface-strong)] text-[var(--foreground)]"
                      : "text-[var(--foreground)]",
                  )}
                >
                  {link.label}
                </Link>
              ))}
              {account?.isOwner ? (
                <Link
                  href="/admin/dashboard"
                  prefetch={false}
                  onClick={closeMobileMenu}
                  className="flex min-h-11 items-center gap-2 rounded-lg px-3 py-2 text-sm font-bold text-[var(--foreground)] hover:bg-[var(--surface-strong)]"
                >
                  <LayoutDashboard size={16} aria-hidden="true" />
                  Painel
                </Link>
              ) : null}
              {!account ? (
                <Link
                  href="/login"
                  prefetch={false}
                  onClick={closeMobileMenu}
                  className="flex min-h-11 items-center gap-2 rounded-lg px-3 py-2 text-sm font-bold text-[var(--foreground)] hover:bg-[var(--surface-strong)]"
                >
                  <User size={16} aria-hidden="true" />
                  Entrar
                </Link>
              ) : (
                <form action="/api/v1/auth/logout" method="post">
                  <button
                    className="flex min-h-11 w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-bold text-[var(--foreground)] hover:bg-[var(--surface-strong)]"
                    onClick={closeMobileMenu}
                  >
                    <LogOut size={16} aria-hidden="true" />
                    Sair
                  </button>
                </form>
              )}
              <CartNavButton className="mt-1 w-full justify-center" onClick={closeMobileMenu} />
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
