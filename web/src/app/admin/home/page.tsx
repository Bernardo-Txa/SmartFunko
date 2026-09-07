import type { Metadata } from "next";
import { AdminShell, MetricCard } from "@/components/admin/admin-shell";
import { HomeBannerAdminPanel } from "@/components/admin/home-banner-admin-panel";
import { requireAdminPage } from "@/server/auth/require-admin-page";
import {
  HomeBannerService,
  type HomeBanner,
} from "@/server/home-banners/home-banner-service";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Home admin",
};

function countActiveBanners(banners: HomeBanner[]) {
  return banners.filter((banner) => banner.status === "active").length;
}

function countLinkedBanners(banners: HomeBanner[]) {
  return banners.filter((banner) => Boolean(banner.linkUrl)).length;
}

export default async function AdminHomePage() {
  const admin = await requireAdminPage("/admin/home");
  let banners: HomeBanner[] = [];
  let loadError = "";

  try {
    banners = await new HomeBannerService(undefined, admin.profile.id).listAdminHomeBanners("all");
  } catch (error) {
    console.error("[AdminHomePage] failed to load home banners", error);
    loadError = "Nao foi possivel carregar banners. Aplique a migration do modulo de banners da home.";
  }

  return (
    <AdminShell
      title="Home"
      description="Banners largos da vitrine inicial, com link e ordem de exibicao."
    >
      <div className="grid gap-6">
        <div className="grid gap-4 sm:grid-cols-3">
          <MetricCard label="Banners" value={`${banners.length}`} detail="Na fila da home" />
          <MetricCard label="Ativos" value={`${countActiveBanners(banners)}`} detail="Aparecem no site" />
          <MetricCard label="Com link" value={`${countLinkedBanners(banners)}`} detail="Levam para catalogo, produto ou campanha" />
        </div>

        <HomeBannerAdminPanel initialBanners={banners} loadError={loadError} />
      </div>
    </AdminShell>
  );
}
