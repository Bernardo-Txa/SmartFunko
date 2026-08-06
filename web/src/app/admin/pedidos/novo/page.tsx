import type { Metadata } from "next";
import { AdminShell } from "@/components/admin/admin-shell";
import { OrderCreateForm } from "@/components/admin/order-create-form";
import { requireAdminPage } from "@/server/auth/require-admin-page";
import { CustomerService } from "@/server/customers/customer-service";

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

export default async function NewAdminOrderPage() {
  const admin = await requireAdminPage();
  const customers = await new CustomerService(undefined, admin.profile.id).listCustomers();

  return (
    <AdminShell
      title="Novo pedido"
      description="Crie pedido manual vindo do WhatsApp."
    >
      <OrderCreateForm
        customers={customers as unknown as CustomerOption[]}
      />
    </AdminShell>
  );
}
