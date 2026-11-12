import type { Metadata } from "next";
import { BadgeCheck, PackageCheck, ShieldCheck, Timer, Truck } from "lucide-react";
import { ReadyStockSelectionPanel } from "@/components/ready-stock/ready-stock-selection-panel";
import { readyStockCampaign } from "@/lib/ready-stock-campaign";
import { getCurrentUser } from "@/server/auth/get-current-user";
import { ReadyStockService } from "@/server/ready-stock/ready-stock-service";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: readyStockCampaign.pageTitle,
  description: readyStockCampaign.description,
};

export default async function ReadyStockPage({ searchParams }: { searchParams: Promise<{ category?: string; franchise?: string; q?: string }> }) {
  const params = await searchParams;
  const [currentUser, items] = await Promise.all([getCurrentUser(), new ReadyStockService().listPublicItems(params)]);
  return <div>
    <section className="relative overflow-hidden border-b border-rose-500/30 bg-[radial-gradient(circle_at_top_left,rgba(225,29,72,0.28),transparent_38%),linear-gradient(135deg,#050505_0%,#16030a_55%,#050505_100%)]">
      <div aria-hidden="true" className="absolute -right-20 -top-32 h-80 w-80 rounded-full bg-rose-500/15 blur-3xl" />
      <div className="relative mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:px-6 lg:grid-cols-[1fr_360px] lg:px-8 lg:py-16">
        <div>
          <p className="inline-flex rounded-full border border-rose-400/50 bg-rose-500/15 px-3 py-1 text-xs font-black uppercase tracking-[0.18em] text-rose-100">{readyStockCampaign.badge}</p>
          <p className="mt-5 text-xs font-bold uppercase tracking-[0.2em] text-amber-300">Campanha de novembro · enquanto durarem os estoques</p>
          <h1 className="mt-3 max-w-3xl text-4xl font-black text-white sm:text-5xl lg:text-6xl">{readyStockCampaign.headline}</h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-zinc-300">{readyStockCampaign.description}</p>
        </div>
        <aside className="rounded-xl border border-rose-400/25 bg-black/45 p-5 shadow-2xl shadow-rose-950/30 backdrop-blur-sm">
          <PackageCheck size={28} className="text-amber-300" />
          <div className="mt-4 grid gap-3 text-sm text-zinc-300">
            <p className="flex gap-2"><ShieldCheck size={17} className="shrink-0 text-rose-300" />Estoque reservado ao abrir o pagamento.</p>
            <p className="flex gap-2"><Timer size={17} className="shrink-0 text-rose-300" />Você tem 30 minutos para concluir.</p>
            <p className="flex gap-2"><PackageCheck size={17} className="shrink-0 text-rose-300" />Pagamento confirmado gera o pedido na hora.</p>
            <p className="flex gap-2"><BadgeCheck size={17} className="shrink-0 text-rose-300" />Entrega garantida após a confirmação do pedido.</p>
            <p className="flex gap-2"><Truck size={17} className="shrink-0 text-rose-300" />Frete calculado e cobrado à parte.</p>
          </div>
        </aside>
      </div>
    </section>
    <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <form className="mb-6 grid gap-3 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4 sm:grid-cols-[1fr_180px_auto]"><input name="q" defaultValue={params.q ?? ""} placeholder="Buscar produto ou código" className="h-11 rounded-md border border-[var(--border)] bg-[var(--background)] px-3 text-sm outline-none focus:border-[var(--accent)]" /><input name="franchise" defaultValue={params.franchise ?? ""} placeholder="Franquia" className="h-11 rounded-md border border-[var(--border)] bg-[var(--background)] px-3 text-sm outline-none focus:border-[var(--accent)]" /><button className="h-11 rounded-md bg-[var(--accent)] px-5 text-sm font-black text-slate-950">Filtrar</button></form>
      {items.length ? <ReadyStockSelectionPanel canBuy={Boolean(currentUser?.customer)} items={items} loginHref={`/login?next=${encodeURIComponent("/pronta-entrega")}`} /> : <p className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-6 text-center text-[var(--muted)]">Nenhum produto disponível no momento.</p>}
    </section>
  </div>;
}
