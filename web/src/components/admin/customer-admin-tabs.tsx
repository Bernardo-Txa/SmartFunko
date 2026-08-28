import Link from "next/link";
import { ArrowRightLeft, Users } from "lucide-react";

const tabs = [
  { href: "/admin/clientes", icon: Users, key: "customers", label: "Clientes" },
  { href: "/admin/clientes/unificar", icon: ArrowRightLeft, key: "merge", label: "Unificar temporarios" },
] as const;

type CustomerAdminTab = (typeof tabs)[number]["key"];

export function CustomerAdminTabs({ active }: { active: CustomerAdminTab }) {
  return (
    <nav
      aria-label="Clientes"
      className="mb-5 flex min-w-0 gap-2 overflow-x-auto rounded-lg border border-[var(--border)] bg-[var(--surface)] p-2"
    >
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = active === tab.key;

        return (
          <Link
            key={tab.key}
            href={tab.href}
            className={
              isActive
                ? "inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-md bg-[var(--accent)] px-3 text-sm font-black text-black"
                : "inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-md px-3 text-sm font-semibold text-[var(--muted)] hover:bg-[var(--surface-strong)] hover:text-[var(--foreground)]"
            }
          >
            <Icon size={16} aria-hidden="true" />
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
