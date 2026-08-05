import type { Metadata } from "next";
import { PreorderAdminPanel } from "@/components/admin/preorder-admin-panel";
import { AdminShell, MetricCard } from "@/components/admin/admin-shell";
import { formatCurrency } from "@/lib/format";
import { requireAdminPage } from "@/server/auth/require-admin-page";
import { PreorderService, type PreorderItem } from "@/server/preorders/preorder-service";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Pre-vendas admin",
};

type Props = {
  searchParams?: Promise<{
    q?: string;
    status?: string;
  }>;
};

function getParam(value: string | undefined) {
  return value?.trim() ?? "";
}

function getStats(items: PreorderItem[]) {
  return {
    approvedAmount: items.reduce((sum, item) => sum + item.stats.approvedAmount, 0),
    open: items.filter((item) => item.status === "open").length,
    pendingAmount: items.reduce((sum, item) => sum + item.stats.pendingAmount, 0),
    pendingQuantity: items.reduce((sum, item) => sum + item.stats.pendingQuantity, 0),
    requestedQuantity: items.reduce((sum, item) => sum + item.stats.requestedQuantity, 0),
    total: items.length,
  };
}

export default async function AdminPreordersPage({ searchParams }: Props) {
  const admin = await requireAdminPage("/admin/pre-vendas");
  const params = await searchParams;
  const q = getParam(params?.q);
  const status = getParam(params?.status);
  let items: PreorderItem[] = [];
  let loadError = "";

  try {
    items = await new PreorderService(undefined, admin.profile.id).listAdminPreorderItems({
      q: q || undefined,
      status: status || undefined,
    });
  } catch (error) {
    console.error("[AdminPreordersPage] failed to load preorders", error);
    loadError = "Nao foi possivel carregar pre-vendas. Confira se a migration do modulo foi aplicada.";
  }

  const stats = getStats(items);

  return (
    <AdminShell
      title="Pre-vendas"
      description="Cadastro temporario, reservas do cliente e pedidos V2 aguardando aprovacao."
    >
      <div className="grid gap-6">
        <div className="grid gap-4 md:grid-cols-4">
          <MetricCard label="Pre-vendas" value={`${stats.total}`} detail={`${stats.open} aberta(s)`} />
          <MetricCard label="Itens pedidos" value={`${stats.requestedQuantity}`} detail="Reservas criadas" />
          <MetricCard label="Aprovar" value={`${stats.pendingQuantity}`} detail={formatCurrency(stats.pendingAmount)} />
          <MetricCard label="Aprovado" value={formatCurrency(stats.approvedAmount)} detail="Ja entra no fechamento" />
        </div>

        <PreorderAdminPanel
          initialItems={items}
          initialQuery={q}
          initialStatus={status}
          loadError={loadError}
        />
      </div>
    </AdminShell>
  );
}
