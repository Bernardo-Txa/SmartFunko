import type { Metadata } from "next";
import { AdminShell } from "@/components/admin/admin-shell";
import { requireAdminPage } from "@/server/auth/require-admin-page";
import { CustomerService } from "@/server/customers/customer-service";

export const metadata: Metadata = {
  title: "Clientes admin",
};

const customerStatusLabels: Record<string, string> = {
  active: "Ativo",
  blocked: "Bloqueado",
  vip: "VIP",
};

export default async function AdminCustomersPage() {
  const admin = await requireAdminPage();
  const customers = await new CustomerService(undefined, admin.profile.id).listCustomers();

  return (
    <AdminShell title="Clientes" description="Cadastro e vinculo com pedidos do WhatsApp.">
      <div className="overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--surface)]">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="bg-[var(--surface-strong)] text-[var(--muted)]">
            <tr>
              <th className="px-4 py-3">Nome</th>
              <th className="px-4 py-3">E-mail</th>
              <th className="px-4 py-3">Telefone</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border)]">
            {customers.map((customer) => (
              <tr key={customer.email}>
                <td className="px-4 py-3 font-semibold text-[var(--foreground)]">
                  {customer.name}
                </td>
                <td className="px-4 py-3 text-[var(--muted)]">{customer.email ?? "-"}</td>
                <td className="px-4 py-3 text-[var(--muted)]">{customer.phone ?? "-"}</td>
                <td className="px-4 py-3 text-[var(--foreground)]">
                  {customerStatusLabels[customer.status] ?? customer.status}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AdminShell>
  );
}
