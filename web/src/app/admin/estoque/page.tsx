import type { Metadata } from "next";
import { AdminShell, MetricCard } from "@/components/admin/admin-shell";
import { ReadyStockAdminForm } from "@/components/admin/ready-stock-admin-form";
import { formatCurrency } from "@/lib/format";
import { requireAdminPage } from "@/server/auth/require-admin-page";
import { ReadyStockService } from "@/server/ready-stock/ready-stock-service";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Pronta Entrega admin" };

export default async function AdminReadyStockPage({ searchParams }: { searchParams: Promise<{ q?: string; status?: string }> }) {
  const admin = await requireAdminPage("/admin/estoque");
  const params = await searchParams;
  const items = await new ReadyStockService(undefined, admin.profile.id).listAdminItems(params);
  const available = items.reduce((sum, item) => sum + item.availableQuantity, 0);
  const reserved = items.reduce((sum, item) => sum + item.reservedQuantity, 0);
  const stockValue = items.reduce((sum, item) => sum + item.quantity * item.price, 0);
  return <AdminShell title="Pronta Entrega" description="Produtos exclusivos, quantidade agregada e checkout imediato com reserva de 30 minutos.">
    <div className="grid gap-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><MetricCard label="Produtos" value={`${items.length}`} detail="Cadastros próprios" /><MetricCard label="Disponíveis" value={`${available}`} detail="Liberados para checkout" /><MetricCard label="Reservados" value={`${reserved}`} detail="Checkout em andamento" /><MetricCard label="Valor potencial" value={formatCurrency(stockValue)} detail="Quantidade total × preço" /></div>
      <ReadyStockAdminForm />
      <section className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5">
        <form className="mb-5 grid gap-3 sm:grid-cols-[1fr_180px_auto]"><input name="q" defaultValue={params.q ?? ""} placeholder="Buscar produto ou código" className="h-11 rounded-md border border-[var(--border)] bg-[var(--background)] px-3" /><select name="status" defaultValue={params.status ?? ""} className="h-11 rounded-md border border-[var(--border)] bg-[var(--background)] px-3"><option value="">Todos</option><option value="open">Publicado</option><option value="draft">Rascunho</option><option value="paused">Pausado</option><option value="archived">Arquivado</option></select><button className="h-11 rounded-md bg-[var(--accent)] px-5 text-sm font-black text-slate-950">Filtrar</button></form>
        <div className="overflow-x-auto"><table className="w-full min-w-[760px] text-sm"><thead><tr className="border-b border-[var(--border)] text-left text-[var(--muted)]"><th className="px-3 py-3">Produto</th><th className="px-3 py-3">Preço</th><th className="px-3 py-3">Total</th><th className="px-3 py-3">Reservado</th><th className="px-3 py-3">Disponível</th><th className="px-3 py-3">Status</th></tr></thead><tbody className="divide-y divide-[var(--border)]">{items.map((item) => <tr key={item.id}><td className="px-3 py-3"><strong className="block text-[var(--foreground)]">{item.title}</strong><span className="text-xs text-[var(--muted)]">{item.code}</span></td><td className="px-3 py-3">{formatCurrency(item.price)}</td><td className="px-3 py-3">{item.quantity}</td><td className="px-3 py-3 text-yellow-100">{item.reservedQuantity}</td><td className="px-3 py-3 text-emerald-200">{item.availableQuantity}</td><td className="px-3 py-3">{item.status}</td></tr>)}{items.length === 0 ? <tr><td colSpan={6} className="px-3 py-8 text-center text-[var(--muted)]">Nenhum produto cadastrado.</td></tr> : null}</tbody></table></div>
      </section>
    </div>
  </AdminShell>;
}
