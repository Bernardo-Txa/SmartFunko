import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, CalendarClock } from "lucide-react";
import { PreorderSelectionPanel } from "@/components/preorders/preorder-selection-panel";
import { ogImages } from "@/lib/seo";
import { getCurrentUser } from "@/server/auth/get-current-user";
import { PreorderService, type PreorderItem } from "@/server/preorders/preorder-service";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: {
    absolute: "Pre-vendas Smart Funkos",
  },
  description: "Selecione itens temporarios de pre-venda e acompanhe o pedido pela sua conta Smart Funkos.",
  alternates: {
    canonical: "/pre-vendas",
  },
  openGraph: {
    description: "Selecione itens temporarios de pre-venda e acompanhe o pedido pela sua conta Smart Funkos.",
    images: ogImages(),
    title: "Pre-vendas Smart Funkos",
    type: "website",
    url: "/pre-vendas",
  },
  twitter: {
    card: "summary_large_image",
    description: "Selecione itens temporarios de pre-venda e acompanhe o pedido pela sua conta Smart Funkos.",
    images: ["/og/smart-funkos-og.png"],
    title: "Pre-vendas Smart Funkos",
  },
};

export default async function PreordersPage() {
  const [currentUser, itemsResult] = await Promise.allSettled([
    getCurrentUser(),
    new PreorderService().listPublicPreorderItems(),
  ]);
  const current = currentUser.status === "fulfilled" ? currentUser.value : null;
  const items = itemsResult.status === "fulfilled" ? itemsResult.value : [] as PreorderItem[];
  const loadError = itemsResult.status === "rejected";
  const canRequest = Boolean(current?.customer);
  const loginHref = `/login?next=${encodeURIComponent("/pre-vendas")}`;

  if (loadError) {
    console.error("[PreordersPage] failed to load public preorders", itemsResult.reason);
  }

  return (
    <div>
      <section className="border-b border-[var(--border)] bg-[var(--surface)]/40">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:px-8">
          <div>
            <p className="inline-flex rounded-full border border-yellow-300/35 bg-yellow-300/10 px-3 py-1 text-xs font-black uppercase tracking-[0.16em] text-yellow-100">
              Pre-vendas
            </p>
            <h1 className="mt-4 text-4xl font-black leading-tight text-[var(--foreground)] sm:text-5xl">
              Escolha agora. Pague depois da aprovacao.
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-[var(--muted)]">
              Itens temporarios entram como pedido de pre-venda na sua conta.
              O admin aprova, o pedido entra na nota do mes e o pagamento segue pelo sistema.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <a
                href="#pre-vendas"
                className="inline-flex h-11 items-center gap-2 rounded-md bg-[var(--yellow)] px-5 text-sm font-black text-[#020617] hover:brightness-110"
              >
                Ver pre-vendas
                <ArrowRight size={16} aria-hidden="true" />
              </a>
              <Link
                href="/conta/pedidos-v2"
                className="inline-flex h-11 items-center rounded-md border border-[var(--border)] px-5 text-sm font-semibold text-[var(--foreground)] hover:bg-[var(--surface-strong)]"
              >
                Meus pedidos
              </Link>
            </div>
          </div>
          <aside className="rounded-lg border border-[var(--border)] bg-[var(--background)] p-5">
            <CalendarClock size={28} className="text-[var(--accent)]" aria-hidden="true" />
            <h2 className="mt-4 text-xl font-black text-[var(--foreground)]">Fluxo de pre-venda</h2>
            <div className="mt-4 grid gap-3 text-sm text-[var(--muted)]">
              <p>1. Voce seleciona os itens que quer reservar.</p>
              <p>2. O pedido nasce aguardando aprovacao do admin.</p>
              <p>3. Aprovado, ele entra na sua nota mensal e libera pagamento.</p>
              <p>4. Cancelamento de pre-venda e feito somente pelo admin.</p>
            </div>
          </aside>
        </div>
      </section>

      <section id="pre-vendas" className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6">
          <h2 className="text-2xl font-black text-[var(--foreground)]">Pre-vendas abertas</h2>
          <p className="mt-2 text-sm text-[var(--muted)]">
            Selecione um ou mais produtos para gerar um pedido unico de pre-venda.
          </p>
        </div>

        {loadError ? (
          <p className="rounded-lg border border-red-300/25 bg-red-500/10 p-4 text-sm font-semibold text-red-200">
            Nao foi possivel carregar as pre-vendas agora.
          </p>
        ) : items.length > 0 ? (
          <PreorderSelectionPanel
            canRequest={canRequest}
            items={items}
            loginHref={loginHref}
          />
        ) : (
          <p className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5 text-sm text-[var(--muted)]">
            Nenhuma pre-venda aberta no momento.
          </p>
        )}
      </section>
    </div>
  );
}
