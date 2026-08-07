import type { Metadata } from "next";
import { AdminShell } from "@/components/admin/admin-shell";
import {
  ReceivingWorkbench,
  type ReceivingCompetenceOption,
  type ReceivingFilters,
  type ReceivingOrder,
} from "@/components/admin/receiving-workbench";
import { requireAdminPage } from "@/server/auth/require-admin-page";
import { OrderV2Service, type V2ReceivingFilters } from "@/server/orders-v2/order-v2-service";

export const metadata: Metadata = {
  title: "Recebimento admin",
};

type Props = {
  searchParams?: Promise<{
    competenceId?: string;
    number?: string;
    product?: string;
    status?: string;
  }>;
};

function getParam(value: string | undefined) {
  return value?.trim() ?? "";
}

function getStatus(value: string | undefined): V2ReceivingFilters["status"] {
  if (
    value === "aguardando_fechamento" ||
    value === "cancelado" ||
    value === "enviado" ||
    value === "recebido" ||
    value === "solicitado" ||
    value === "all"
  ) {
    return value;
  }

  return "all";
}

export default async function AdminReceivingPage({ searchParams }: Props) {
  const admin = await requireAdminPage("/admin/recebimento");
  const params = await searchParams;
  const product = getParam(params?.product);
  const funkoNumber = getParam(params?.number);
  const competenceId = getParam(params?.competenceId);
  const status = getStatus(params?.status);
  const service = new OrderV2Service(undefined, admin.profile.id);
  const [orders, competencies] = await Promise.all([
    service.listReceivingOrders({
      competenceId: competenceId || undefined,
      funkoNumber: funkoNumber || undefined,
      limit: 500,
      productSearch: product || undefined,
      status,
    }) as unknown as Promise<ReceivingOrder[]>,
    service.listCompetencies() as unknown as Promise<ReceivingCompetenceOption[]>,
  ]);
  const filters: ReceivingFilters = {
    competenceId,
    funkoNumber,
    product,
    status: status ?? "all",
  };

  return (
    <AdminShell
      title="Recebimento"
      description="Consulta da carga recebida por produto, numero do Funko ou SKU para separar clientes e marcar pedidos como recebidos."
    >
      <ReceivingWorkbench
        competencies={competencies}
        filters={filters}
        orders={orders}
      />
    </AdminShell>
  );
}
