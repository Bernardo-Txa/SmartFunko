import type { Metadata } from "next";
import Link from "next/link";
import { Search } from "lucide-react";
import { ProductCard } from "@/components/product/product-card";
import { getCatalogFranchises, getCatalogProductsPage } from "@/lib/catalog";

export const metadata: Metadata = {
  title: "Catalogo",
};

type Props = {
  searchParams: Promise<{
    franchise?: string;
    page?: string;
    q?: string;
    status?: string;
  }>;
};

const statusOptions = [
  { label: "Todos os status", value: "all" },
  { label: "Disponivel", value: "available" },
  { label: "Sob encomenda", value: "order_only" },
  { label: "Pre-venda", value: "preorder" },
  { label: "Esgotado", value: "sold_out" },
];

function catalogHref(params: Record<string, string | number | undefined>) {
  const search = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "" && value !== "all") {
      search.set(key, String(value));
    }
  }

  const query = search.toString();
  return query ? `/catalogo?${query}` : "/catalogo";
}

export default async function CatalogPage({ searchParams }: Props) {
  const params = await searchParams;
  const page = Number(params.page ?? 1);
  const query = params.q ?? "";
  const status = params.status ?? "all";
  const franchise = params.franchise ?? "";
  const [franchises, productPage] = await Promise.all([
    getCatalogFranchises(),
    getCatalogProductsPage({
      franchise,
      page,
      pageSize: 24,
      query,
      status: status as "all",
    }),
  ]);
  const { data: products, meta } = productPage;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-[var(--foreground)]">Catalogo</h1>
          <p className="mt-2 text-sm text-[var(--muted)]">
            Produtos preparados para atendimento pelo WhatsApp.
          </p>
        </div>
        <form className="grid min-w-0 gap-2 md:w-[520px] md:grid-cols-[1fr_170px_auto]">
          <label className="flex h-11 min-w-0 items-center gap-2 rounded-md border border-[var(--border)] bg-[var(--surface)] px-3">
            <Search size={17} className="text-[var(--muted)]" aria-hidden="true" />
            <input
              defaultValue={query}
              name="q"
              type="search"
              placeholder="Buscar produto"
              className="min-w-0 flex-1 bg-transparent text-sm outline-none"
            />
          </label>
          <select
            defaultValue={status}
            name="status"
            className="h-11 rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 text-sm font-semibold outline-none focus:border-[var(--accent)]"
          >
            {statusOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          {franchise ? <input type="hidden" name="franchise" value={franchise} /> : null}
          <button className="h-11 rounded-md bg-[var(--accent)] px-4 text-sm font-black text-[#020617] hover:brightness-110">
            Buscar
          </button>
        </form>
      </div>

      <div className="mb-6 flex gap-2 overflow-x-auto pb-2">
        <Link
          href={catalogHref({ q: query, status })}
          className={`inline-flex h-9 items-center rounded-full px-4 text-sm font-black ${
            franchise
              ? "border border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)]"
              : "bg-[var(--yellow)] text-[#020617]"
          }`}
        >
          Todos
        </Link>
        {franchises.map((item) => (
          <Link
            key={item.id}
            href={catalogHref({ franchise: item.slug, q: query, status })}
            className={`inline-flex h-9 items-center rounded-full border border-[var(--border)] px-4 text-sm font-bold hover:bg-cyan-400/15 ${
              franchise === item.slug
                ? "bg-[var(--accent)] text-[#020617]"
                : "bg-[var(--surface)] text-[var(--foreground)]"
            }`}
          >
            {item.name}
          </Link>
        ))}
      </div>

      <p className="mb-4 text-sm text-[var(--muted)]">
        {meta.total} produto(s) encontrado(s). Pagina {meta.page} de {meta.totalPages}.
      </p>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {products.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>

      <nav className="mt-8 flex flex-wrap items-center justify-center gap-2" aria-label="Paginacao">
        <Link
          href={catalogHref({
            franchise,
            page: Math.max(1, meta.page - 1),
            q: query,
            status,
          })}
          aria-disabled={meta.page <= 1}
          className="inline-flex h-10 items-center rounded-md border border-[var(--border)] px-3 text-sm font-semibold text-[var(--foreground)] aria-disabled:pointer-events-none aria-disabled:opacity-50"
        >
          Anterior
        </Link>
        <span className="px-3 text-sm font-semibold text-[var(--muted)]">
          {meta.page} / {meta.totalPages}
        </span>
        <Link
          href={catalogHref({
            franchise,
            page: Math.min(meta.totalPages, meta.page + 1),
            q: query,
            status,
          })}
          aria-disabled={meta.page >= meta.totalPages}
          className="inline-flex h-10 items-center rounded-md border border-[var(--border)] px-3 text-sm font-semibold text-[var(--foreground)] aria-disabled:pointer-events-none aria-disabled:opacity-50"
        >
          Proxima
        </Link>
      </nav>
    </div>
  );
}
