import Image from "next/image";
import Link from "next/link";
import { HeaderActions } from "@/components/layout/header-actions";
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
          className="hidden items-center gap-1 rounded-full border border-[var(--border)] bg-[#020617]/45 p-1 shadow-[0_0_22px_rgba(14,165,233,0.12)] lg:flex"
          aria-label="Principal"
        >
          <MegaMenu categories={categories} franchises={franchises} />
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
