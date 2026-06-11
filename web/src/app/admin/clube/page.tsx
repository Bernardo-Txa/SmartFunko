import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { AdminShell } from "@/components/admin/admin-shell";
import { isRewardsEnabled } from "@/lib/env";
import { requireAdminPage } from "@/server/auth/require-admin-page";
import { RewardsService } from "@/server/rewards/rewards-service";

export const metadata: Metadata = {
  title: "Clube admin",
};

type RewardProfile = {
  current_points: number;
  currentLevel: { label: string };
  customer_id: string;
  lifetime_points: number;
  customers?: {
    name?: string | null;
    email?: string | null;
  } | null;
};

export default async function AdminClubPage() {
  const admin = await requireAdminPage("/admin/clube");

  if (!isRewardsEnabled()) {
    return (
      <AdminShell title="Clube" description="Módulo de gamificação desativado neste ambiente.">
        <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5 text-sm text-[var(--muted)]">
          Ative `NEXT_PUBLIC_ENABLE_REWARDS=true` para liberar o Clube Smart Funkos.
        </div>
      </AdminShell>
    );
  }

  const dashboard = await new RewardsService(undefined, admin.profile.id).getAdminDashboard();
  const profiles = dashboard.profiles as RewardProfile[];

  return (
    <AdminShell title="Clube Smart Funkos" description="Pontos, níveis longos e acompanhamento de clientes.">
      <div className="grid gap-5">
        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5">
            <span className="text-sm font-semibold text-[var(--muted)]">Perfis no clube</span>
            <strong className="mt-3 block text-2xl text-[var(--foreground)]">{profiles.length}</strong>
          </div>
          <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5">
            <span className="text-sm font-semibold text-[var(--muted)]">Pontos vitalícios</span>
            <strong className="mt-3 block text-2xl text-[var(--foreground)]">
              {profiles.reduce((sum, profile) => sum + profile.lifetime_points, 0).toLocaleString("pt-BR")}
            </strong>
          </div>
          <Link href="/admin/clube/ranking" className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5 hover:bg-[var(--surface-strong)]">
            <span className="text-sm font-semibold text-[var(--muted)]">Ranking mensal</span>
            <strong className="mt-3 flex items-center gap-2 text-lg text-[var(--foreground)]">
              Ver Top 3 pedidos <ArrowRight size={16} aria-hidden="true" />
            </strong>
          </Link>
        </div>

        <section className="overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--surface)]">
          <div className="border-b border-[var(--border)] p-5">
            <h2 className="text-lg font-bold text-[var(--foreground)]">Clientes</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="text-xs uppercase text-[var(--muted)]">
                <tr>
                  <th className="px-4 py-3">Cliente</th>
                  <th className="px-4 py-3">Nível</th>
                  <th className="px-4 py-3">Pontos atuais</th>
                  <th className="px-4 py-3">Lifetime</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {profiles.map((profile) => (
                  <tr key={profile.customer_id}>
                    <td className="px-4 py-3">
                      <strong className="text-[var(--foreground)]">{profile.customers?.name ?? "Cliente"}</strong>
                      <p className="text-xs text-[var(--muted)]">{profile.customers?.email ?? "-"}</p>
                    </td>
                    <td className="px-4 py-3 text-[var(--foreground)]">{profile.currentLevel.label}</td>
                    <td className="px-4 py-3 text-[var(--muted)]">{profile.current_points.toLocaleString("pt-BR")}</td>
                    <td className="px-4 py-3 text-[var(--muted)]">{profile.lifetime_points.toLocaleString("pt-BR")}</td>
                  </tr>
                ))}
                {profiles.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-6 text-center text-[var(--muted)]">Nenhum perfil de rewards ainda.</td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </AdminShell>
  );
}
