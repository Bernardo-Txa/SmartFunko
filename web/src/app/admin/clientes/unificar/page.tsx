import type { Metadata } from "next";
import { AdminShell } from "@/components/admin/admin-shell";
import { CustomerAdminTabs } from "@/components/admin/customer-admin-tabs";
import { TemporaryCustomerMergePanel } from "@/components/admin/temporary-customer-merge-panel";
import { requireAdminPage } from "@/server/auth/require-admin-page";
import { CustomerService } from "@/server/customers/customer-service";
import { TemporaryCustomerService } from "@/server/customers/temporary-customer-service";

export const metadata: Metadata = {
  title: "Unificar clientes admin",
};

export default async function AdminCustomerMergePage() {
  const admin = await requireAdminPage();
  const [customers, candidates] = await Promise.all([
    new CustomerService(undefined, admin.profile.id).listCustomers(),
    new TemporaryCustomerService(undefined, admin.profile.id).listMergeCandidates(),
  ]);

  const customerOptions = customers.map((customer) => ({
    email: customer.email,
    id: customer.id,
    name: customer.name,
    phone: customer.phone,
    status: customer.status,
  }));

  return (
    <AdminShell title="Clientes" description="Unifique clientes temporarios com o cadastro padrao quando o cliente criar conta.">
      <CustomerAdminTabs active="merge" />
      <TemporaryCustomerMergePanel candidates={candidates} customers={customerOptions} />
    </AdminShell>
  );
}
