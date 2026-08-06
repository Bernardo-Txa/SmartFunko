import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Gem, Search } from "lucide-react";
import { AdminShell } from "@/components/admin/admin-shell";
import { RareCollectibleForm } from "@/components/admin/rare-collectible-form";
import { RareCollectibleRowActions } from "@/components/admin/rare-collectible-row-actions";
import { formatCurrency, formatDate } from "@/lib/format";
import { requireAdminPage } from "@/server/auth/require-admin-page";
import { ProductService } from "@/server/products/product-service";
import {
  getRareCollectibleStatusLabel,
  RareCollectibleService,
  type RareCollectible,
  type RareCollectibleStatus,
} from "@/server/rare-collectibles/rare-collectible-service";

type SearchParams = {
  category?: string;
  q?: string;
  sort?: "featured" | "newest" | "price_asc" | "price_desc";
  status?: RareCollectibleStatus | "all";
};

type Props = {
  searchParams?: Promise<SearchParams>;
};

export const metadata: Metadata = {
  title: "Acervo Raro admin",
};

const statusClassName: Record<RareCollectible["status"], string> = {
  archived: "border-slate-400/30 bg-slate-400/10 text-slate-200",
  available: "border-emerald-300/30 bg-emerald-400/12 text-emerald-100",
  draft: "border-slate-400/30 bg-slate-400/10 text-slate-200",
  reserved: "border-amber-200/34 bg-amber-300/12 text-amber-100",
  sold: "border-rose-200/30 bg-rose-400/12 text-rose-100",
};

function normalizeParams(params?: SearchParams) {
  const status = params?.status === "draft" ? "all" : params?.status ?? "all";

  return {
    category: params?.category ?? "todos",
    q: params?.q ?? "",
    sort: params?.sort ?? "newest",
    status,
  };
}

export default async function AdminRareCollectiblesPage({ searchParams }: Props) {
  const params = normalizeParams(await searchParams);
  const admin = await requireAdminPage();
  const [franchises, items] = await Promise.all([
    new ProductService(undefined, admin.profile.id).listFranchiseOptions(),
    new RareCollectibleService(undefined, admin.profile.id).listAdminRareCollectibles({
      category: params.category,
      query: params.q,
      sort: params.sort,
      status: params.status,
    }),
  ]);
  const stats = {
    archived: items.filter((item) => item.status === "archived").length,
    available: items.filter((item) => item.status === "available").length,
    reserved: items.filter((item) => item.status === "reserved").length,
    slideshow: items.filter((item) => item.isFeatured).length,
    sold: items.filter((item) => item.status === "sold").length,
  };

  return (
    <AdminShell
      title="Acervo Raro"
      description="Cadastro e manutenção independente de peças autênticas, autografadas e colecionáveis."
    >
      <div className="grid min-w-0 gap-6">
        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4">
            <span className="text-xs font-black uppercase tracking-[0.14em] text-[var(--muted)]">Disponíveis</span>
            <strong className="mt-2 block text-2xl text-[var(--foreground)]">{stats.available}</strong>
          </div>
          <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4">
            <span className="text-xs font-black uppercase tracking-[0.14em] text-[var(--muted)]">Reservadas</span>
            <strong className="mt-2 block text-2xl text-[var(--foreground)]">{stats.reserved}</strong>
          </div>
          <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4">
            <span className="text-xs font-black uppercase tracking-[0.14em] text-[var(--muted)]">Vendidas</span>
            <strong className="mt-2 block text-2xl text-[var(--foreground)]">{stats.sold}</strong>
          </div>
          <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4">
            <span className="text-xs font-black uppercase tracking-[0.14em] text-[var(--muted)]">Arquivadas</span>
            <strong className="mt-2 block text-2xl text-[var(--foreground)]">{stats.archived}</strong>
          </div>
          <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4">
            <span className="text-xs font-black uppercase tracking-[0.14em] text-[var(--muted)]">No slideshow</span>
            <strong className="mt-2 block text-2xl text-[var(--foreground)]">{stats.slideshow}</strong>
          </div>
        </section>

        <RareCollectibleForm franchises={franchises} />

        <section className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4">
          <div className="flex flex-col gap-3 border-b border-[var(--border)] pb-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h2 className="text-lg font-black text-[var(--foreground)]">Peças cadastradas</h2>
              <p className="mt-1 text-sm text-[var(--muted)]">
                Pesquise por nome, autografante, código de autenticação ou número de série.
              </p>
            </div>
            <form action="/admin/acervo-raro" className="grid gap-2 xl:grid-cols-[minmax(220px,1fr)_150px_150px_auto_auto]">
              <label className="relative block">
                <Search
                  aria-hidden="true"
                  size={16}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]"
                />
                <input
                  name="q"
                  defaultValue={params.q}
                  placeholder="Buscar"
                  className="h-10 w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-9 text-sm text-[var(--foreground)] outline-none focus:border-amber-100/70"
                />
              </label>
              <select
                name="status"
                defaultValue={params.status}
                className="h-10 rounded-md border border-[var(--border)] bg-[var(--background)] px-3 text-sm text-[var(--foreground)] outline-none focus:border-amber-100/70"
              >
                <option value="all">Todos</option>
                <option value="available">Disponível</option>
                <option value="reserved">Reservado</option>
                <option value="sold">Vendido</option>
                <option value="archived">Arquivado</option>
              </select>
              <select
                name="sort"
                defaultValue={params.sort}
                className="h-10 rounded-md border border-[var(--border)] bg-[var(--background)] px-3 text-sm text-[var(--foreground)] outline-none focus:border-amber-100/70"
              >
                <option value="newest">Mais recentes</option>
                <option value="featured">Curadoria</option>
                <option value="price_desc">Maior preço</option>
                <option value="price_asc">Menor preço</option>
              </select>
              <button className="h-10 rounded-md bg-amber-200 px-4 text-sm font-black text-slate-950 hover:bg-amber-100">
                Filtrar
              </button>
              <Link
                href="/admin/acervo-raro"
                className="inline-flex h-10 items-center justify-center rounded-md border border-[var(--border)] px-4 text-sm font-bold text-[var(--muted)] hover:bg-[var(--surface-strong)]"
              >
                Limpar
              </Link>
            </form>
          </div>

          {items.length > 0 ? (
            <div className="mt-4 grid gap-4">
              {items.map((item) => (
                <article
                  key={item.id}
                  className="grid gap-4 rounded-lg border border-[var(--border)] bg-[var(--background)] p-3 lg:grid-cols-[96px_minmax(0,1fr)_210px]"
                >
                  <div className="relative aspect-square w-24 overflow-hidden rounded-md border border-[var(--border)] bg-white">
                    {item.coverImageUrl ? (
                      <Image
                        src={item.coverImageUrl}
                        alt={item.name}
                        fill
                        sizes="96px"
                        className="object-contain p-1"
                      />
                    ) : (
                      <div className="grid h-full place-items-center bg-slate-950 text-amber-100">
                        <Gem size={22} aria-hidden="true" />
                      </div>
                    )}
                  </div>

                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.08em] ${statusClassName[item.status === "draft" ? "available" : item.status]}`}>
                        {getRareCollectibleStatusLabel(item.status === "draft" ? "available" : item.status)}
                      </span>
                      {item.isFeatured ? (
                        <span className="rounded-full border border-amber-200/30 bg-amber-200/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.08em] text-amber-100">
                          No slideshow
                        </span>
                      ) : (
                        <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.08em] text-[var(--muted)]">
                          Fora do slideshow
                        </span>
                      )}
                      <span className="rounded-full border border-cyan-200/16 bg-cyan-300/8 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.08em] text-cyan-100">
                        {item.category}
                      </span>
                    </div>

                    <h3 className="mt-3 text-lg font-black leading-snug text-[var(--foreground)]">
                      {item.name}
                    </h3>
                    <p className="mt-1 text-sm font-semibold text-[var(--muted)]">
                      {item.signerName ? `Autografado por ${item.signerName}` : "Sem autografante informado"}
                    </p>

                    <div className="mt-4 grid gap-2 text-xs text-[var(--muted)] md:grid-cols-4">
                      <div className="rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2">
                        <span className="block font-black uppercase tracking-[0.12em]">Preço</span>
                        <strong className="mt-1 block text-sm text-[var(--foreground)]">{formatCurrency(item.price)}</strong>
                      </div>
                      <div className="rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2">
                        <span className="block font-black uppercase tracking-[0.12em]">Série</span>
                        <strong className="mt-1 block truncate text-sm text-[var(--foreground)]">{item.serialNumber || "Sem série"}</strong>
                      </div>
                      <div className="rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2">
                        <span className="block font-black uppercase tracking-[0.12em]">Código</span>
                        <strong className="mt-1 block truncate text-sm text-[var(--foreground)]">{item.authenticationCode || "Sem código"}</strong>
                      </div>
                      <div className="rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2">
                        <span className="block font-black uppercase tracking-[0.12em]">Cadastro</span>
                        <strong className="mt-1 block text-sm text-[var(--foreground)]">{formatDate(item.createdAt)}</strong>
                      </div>
                    </div>

                    <p className="mt-3 text-xs text-[var(--muted)]">SKU {item.sku}</p>
                  </div>

                  <div className="rounded-md border border-[var(--border)] bg-[var(--surface)] p-3">
                    <RareCollectibleRowActions item={item} />
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="mt-4 rounded-lg border border-dashed border-[var(--border)] bg-[var(--background)] p-6 text-center">
              <Gem className="mx-auto text-amber-100" size={30} aria-hidden="true" />
              <h2 className="mt-3 text-lg font-black text-[var(--foreground)]">Nenhuma peça no Acervo Raro</h2>
              <p className="mt-1 text-sm text-[var(--muted)]">
                Cadastre a primeira peça acima para publicar a vitrine premium.
              </p>
            </div>
          )}
        </section>
      </div>
    </AdminShell>
  );
}
