import Image from "next/image";
import Link from "next/link";
import { HeaderActions } from "@/components/layout/header-actions";
import { HeaderNavLink } from "@/components/layout/header-nav-link";
import { MegaMenu } from "@/components/storefront/mega-menu";
import { getCatalogCategories, getCatalogFranchises } from "@/lib/catalog";
import { getCurrentUser } from "@/server/auth/get-current-user";

export async function SiteHeader() {
  const [currentUser, categories, franchises] = await Promise.all([
    getCurrentUser(),
    getCatalogCategories(),
    getCatalogFranchises(),
  ]);
  const isOwner = currentUser?.profile.role === "owner";
  const accountLabel = currentUser
    ? currentUser.profile.name || currentUser.profile.email || currentUser.authUser.email || "Minha conta"
    : "";
  const ordersHref = currentUser ? "/conta/pedidos" : "/login?next=/conta/pedidos";
  const links: Array<{ href: string; label: string }> = [
    { href: "/fornecedores", label: "Collabs" },
    { href: "/#como-funciona", label: "Como funciona" },
    { href: ordersHref, label: "Meus pedidos" },
  ];

  if (currentUser) {
    links.push({ href: "/conta", label: "Minha conta" });
  }
  const account = currentUser
    ? {
        accountLabel,
        email: currentUser.profile.email || currentUser.authUser.email || "",
        isOwner,
      }
    : null;

  return (
    <header className="sticky top-0 z-50 border-b border-cyan-200/14 bg-[#020617]/82 backdrop-blur-xl shadow-[0_14px_34px_rgba(2,6,23,0.22)]">
      <div className="mx-auto flex min-h-20 max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-3 rounded-full text-[var(--foreground)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200/70">
          <Image
            src="/brand/SmartFunko.png"
            alt="Smart Funkos"
            width={160}
            height={56}
            preload
            className="h-12 w-auto drop-shadow-[0_0_18px_rgba(34,211,238,0.36)]"
          />
        </Link>

        <nav
          className="hidden items-center gap-1 rounded-full border border-cyan-300/18 bg-[#020617]/50 p-1 shadow-[0_0_22px_rgba(14,165,233,0.10)] lg:flex"
          aria-label="Principal"
        >
          <MegaMenu categories={categories} franchises={franchises} />
          {links.map((link) => (
            <HeaderNavLink key={link.href} href={link.href} label={link.label} />
          ))}
        </nav>

        <HeaderActions
          account={account}
          categories={categories}
          franchises={franchises}
          links={links}
        />
      </div>
    </header>
  );
}
