import type { Metadata } from "next";
import { AdminShell } from "@/components/admin/admin-shell";
import { OrderCreateForm } from "@/components/admin/order-create-form";
import { requireAdminPage } from "@/server/auth/require-admin-page";
import { CustomerService } from "@/server/customers/customer-service";
import { InventoryService } from "@/server/inventory/inventory-service";

export const metadata: Metadata = {
  title: "Novo pedido admin",
};

type CustomerOption = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  status: string;
};

type InventoryOption = {
  id: string;
  location: string | null;
  product_variant_id: string;
  sku: string;
  status: string;
};

export default async function NewAdminOrderPage() {
  const admin = await requireAdminPage();
  const [customers, inventory] = await Promise.all([
    new CustomerService(undefined, admin.profile.id).listCustomers(),
    new InventoryService(undefined, admin.profile.id).listInventory(),
  ]);

  return (
    <AdminShell
      title="Novo pedido"
      description="Crie pedido manual vindo do WhatsApp, com reserva de estoque quando aplicavel."
    >
      <OrderCreateForm
        customers={customers as unknown as CustomerOption[]}
        inventory={inventory as unknown as InventoryOption[]}
      />
    </AdminShell>
  );
}
