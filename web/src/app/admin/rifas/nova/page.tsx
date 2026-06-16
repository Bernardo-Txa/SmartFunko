import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AdminShell } from "@/components/admin/admin-shell";
import { RaffleCampaignForm } from "@/components/admin/raffle-campaign-form";
import { isRafflesEnabled } from "@/lib/env";
import { requireAdminPage } from "@/server/auth/require-admin-page";

export const metadata: Metadata = {
  title: "Nova rifa",
};

export default async function AdminNewRafflePage() {
  if (!isRafflesEnabled()) {
    notFound();
  }

  await requireAdminPage("/admin/rifas/nova");

  return (
    <AdminShell title="Nova rifa" description="Cadastro inicial da campanha e geracao dos numeros.">
      <div className="grid gap-5">
        <RaffleCampaignForm />
      </div>
    </AdminShell>
  );
}
