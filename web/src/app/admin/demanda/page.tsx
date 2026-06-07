import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Bell, PackagePlus } from "lucide-react";
import { CopyInterestedButton } from "@/components/admin/copy-interested-button";
import { AdminShell, MetricCard } from "@/components/admin/admin-shell";
import { formatCurrency } from "@/lib/format";
import { requireOwnerPage } from "@/server/auth/require-admin-page";
import { WishlistService } from "@/server/wishlist/wishlist-service";

export const metadata: Metadata = {
  title: "Demanda admin",
};

function formatAverage(value: number | null) {
  return value === null ? "-" : value.toFixed(1);
}

function interestedText(product: {
  customers: Array<{
    email: string | null;
    name: string;
    phone: string | null;
    priority: string;
  }>;
  productName: string;
}) {
  return [
    `Interessados em ${product.productName}:`,
    ...product.customers.map(
      (customer) =>
        `${customer.name} | ${customer.email ?? "sem e-mail"} | ${customer.phone ?? "sem telefone"} | prioridade ${customer.priority}`,
    ),
  ].join("\n");
}

export default async function AdminDemandPage() {
  await requireOwnerPage("/admin/demanda");
  const dashboard = await new WishlistService().getDemandDashboard();
  const rankingSections = [
    { rows: dashboard.franchises, title: "Franquias" },
    { rows: dashboard.suppliers, title: "Fornecedores" },
    { rows: dashboard.categories, title: "Categorias" },
  ];

  return (
    <AdminShell
      title="Demanda e wishlist"
      description="Ranking real de interesses para compra, importacao e divulgacao manual."
    >
      <div className="grid gap-4 md:grid-cols-4">
        <MetricCard label="Favoritos" value={`${dashboard.totalItems}`} detail="Itens salvos por clientes" />
        <MetricCard label="Clientes" value={`${dashboard.totalCustomers}`} detail="Clientes interessados" />
        <MetricCard label="Produtos" value={`${dashboard.products.length}`} detail="Produtos com demanda" />
        <MetricCard label="Top produto" value={dashboard.products[0]?.total ? `${dashboard.products[0].total}` : "0"} detail={dashboard.products[0]?.productName ?? "Sem dados"} />
      </div>

      <section className="mt-6 grid gap-4 lg:grid-cols-3">
        {rankingSections.map(({ rows, title }) => (
          <div key={title} className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5">
            <h2 className="text-lg font-black text-[var(--foreground)]">{title}</h2>
            <div className="mt-4 grid gap-2">
              {rows.slice(0, 8).map((row) => (
                <div key={row.label} className="flex items-center justify-between gap-3 text-sm">
                  <span className="text-[var(--muted)]">{row.label}</span>
                  <strong className="text-[var(--foreground)]">{row.total}</strong>
                </div>
              ))}
              {rows.length === 0 ? (
                <p className="text-sm text-[var(--muted)]">Sem dados de wishlist ainda.</p>
              ) : null}
            </div>
          </div>
        ))}
      </section>

      <section className="mt-6 overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--surface)]">
        <div className="border-b border-[var(--border)] p-5">
          <h2 className="text-lg font-black text-[var(--foreground)]">Produtos mais desejados</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] text-left text-sm">
            <thead className="bg-[var(--surface-strong)] text-[var(--muted)]">
              <tr>
                <th className="px-4 py-3">Produto</th>
                <th className="px-4 py-3">Interesse</th>
                <th className="px-4 py-3">Franquia</th>
                <th className="px-4 py-3">Fornecedor</th>
                <th className="px-4 py-3">Categoria</th>
                <th className="px-4 py-3">Preço desejado médio</th>
                <th className="px-4 py-3">Prioridade média</th>
                <th className="px-4 py-3">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {dashboard.products.map((product) => (
                <tr key={product.productId}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {product.imageUrl ? (
                        <div className="relative h-12 w-12 overflow-hidden rounded-md border border-[var(--border)] bg-white">
                          <Image
                            src={product.imageUrl}
                            alt={product.productName}
                            fill
                            sizes="48px"
                            className="object-contain p-1"
                          />
                        </div>
                      ) : null}
                      <div>
                        <Link
                          href={`/produto/${product.productSlug}`}
                          className="font-semibold text-[var(--foreground)] hover:text-[var(--accent)]"
                        >
                          {product.productName}
                        </Link>
                        <p className="text-xs text-[var(--muted)]">{product.productSlug}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 font-black text-[var(--foreground)]">{product.total}</td>
                  <td className="px-4 py-3 text-[var(--muted)]">{product.franchise}</td>
                  <td className="px-4 py-3 text-[var(--muted)]">{product.supplier}</td>
                  <td className="px-4 py-3 text-[var(--muted)]">{product.category}</td>
                  <td className="px-4 py-3 text-[var(--muted)]">
                    {product.desiredPriceAverage === null
                      ? "-"
                      : formatCurrency(product.desiredPriceAverage)}
                  </td>
                  <td className="px-4 py-3 text-[var(--muted)]">
                    {formatAverage(product.priorityAverage)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-2">
                      <CopyInterestedButton text={interestedText(product)} />
                      <button
                        type="button"
                        className="inline-flex h-9 cursor-not-allowed items-center gap-2 rounded-md border border-[var(--border)] px-3 text-xs font-bold text-[var(--muted)]"
                        title="Placeholder manual por enquanto"
                      >
                        <Bell size={14} aria-hidden="true" />
                        Avisar
                      </button>
                      <button
                        type="button"
                        className="inline-flex h-9 cursor-not-allowed items-center gap-2 rounded-md border border-[var(--border)] px-3 text-xs font-bold text-[var(--muted)]"
                        title="Criar pedido/encomenda manual sem reservar estoque automaticamente"
                      >
                        <PackagePlus size={14} aria-hidden="true" />
                        Criar pedido
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {dashboard.products.length === 0 ? (
          <p className="p-5 text-sm text-[var(--muted)]">
            Nenhum produto foi favoritado por clientes ainda.
          </p>
        ) : null}
      </section>
    </AdminShell>
  );
}
