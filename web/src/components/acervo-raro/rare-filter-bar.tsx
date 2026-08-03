"use client";

import Link from "next/link";
import { useState } from "react";
import { Search, SlidersHorizontal, X } from "lucide-react";

type Props = {
  category: string;
  query: string;
  sort: string;
  status: string;
};

const categoryOptions = [
  { label: "Todos", value: "todos" },
  { label: "Cinema e TV", value: "cinema-e-tv" },
  { label: "Esportes", value: "esportes" },
  { label: "Música", value: "musica" },
  { label: "Cultura Pop", value: "cultura-pop" },
  { label: "Autografados", value: "autografados" },
  { label: "Edições limitadas", value: "edicoes-limitadas" },
];

const statusOptions = [
  { label: "Todos os status", value: "all" },
  { label: "Disponíveis", value: "available" },
  { label: "Reservados", value: "reserved" },
  { label: "Vendidos", value: "sold" },
];

const sortOptions = [
  { label: "Curadoria", value: "featured" },
  { label: "Mais recentes", value: "newest" },
  { label: "Maior preço", value: "price_desc" },
  { label: "Menor preço", value: "price_asc" },
];

function FilterFields({ category, query, sort, status }: Props) {
  const selectClassName =
    "h-11 w-full rounded-md border border-amber-200/18 bg-[#050b16] px-3 text-sm font-semibold text-[var(--foreground)] outline-none focus:border-amber-100/70";

  return (
    <>
      <label className="block min-w-0">
        <span className="mb-1.5 block text-xs font-black uppercase tracking-[0.14em] text-slate-400">
          Busca
        </span>
        <span className="relative block">
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
            size={17}
          />
          <input
            name="q"
            defaultValue={query}
            type="search"
            placeholder="Nome, autografante, certificado ou número de série"
            className="h-11 w-full rounded-md border border-amber-200/18 bg-[#050b16] px-10 text-sm text-[var(--foreground)] outline-none focus:border-amber-100/70"
          />
        </span>
      </label>

      <label className="block min-w-0">
        <span className="mb-1.5 block text-xs font-black uppercase tracking-[0.14em] text-slate-400">
          Categoria
        </span>
        <select name="category" defaultValue={category || "todos"} className={selectClassName}>
          {categoryOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>

      <label className="block min-w-0">
        <span className="mb-1.5 block text-xs font-black uppercase tracking-[0.14em] text-slate-400">
          Status
        </span>
        <select name="status" defaultValue={status || "all"} className={selectClassName}>
          {statusOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>

      <label className="block min-w-0">
        <span className="mb-1.5 block text-xs font-black uppercase tracking-[0.14em] text-slate-400">
          Ordem
        </span>
        <select name="sort" defaultValue={sort || "featured"} className={selectClassName}>
          {sortOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
    </>
  );
}

export function RareFilterBar(props: Props) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <section className="rounded-lg border border-amber-200/16 bg-slate-950/54 p-3 shadow-[0_24px_70px_rgba(2,6,23,0.18)] backdrop-blur">
      <form action="/acervo-raro" className="hidden gap-3 lg:grid lg:grid-cols-[minmax(260px,1.4fr)_repeat(3,minmax(145px,0.75fr))_auto_auto] lg:items-end">
        <FilterFields {...props} />
        <button className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-amber-200 px-4 text-sm font-black text-slate-950 hover:bg-amber-100">
          <SlidersHorizontal size={16} aria-hidden="true" />
          Filtrar
        </button>
        <Link
          href="/acervo-raro"
          className="inline-flex h-11 items-center justify-center rounded-md border border-amber-200/18 px-4 text-sm font-bold text-slate-300 hover:bg-amber-200/8"
        >
          Limpar
        </Link>
      </form>

      <div className="grid gap-3 lg:hidden">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.16em] text-amber-100">
              Filtros
            </p>
            <p className="text-sm text-slate-400">Refine o acervo por categoria, status e valor.</p>
          </div>
          <button
            type="button"
            onClick={() => setIsOpen(true)}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-md border border-amber-200/24 px-4 text-sm font-black text-[var(--foreground)]"
          >
            <SlidersHorizontal size={16} aria-hidden="true" />
            Abrir
          </button>
        </div>
      </div>

      {isOpen ? (
        <div className="fixed inset-0 z-[80] bg-slate-950/82 p-4 backdrop-blur lg:hidden">
          <div className="ml-auto grid max-h-[calc(100svh-2rem)] w-full max-w-md gap-4 overflow-y-auto rounded-lg border border-amber-200/22 bg-[#071020] p-4 shadow-[0_30px_90px_rgba(2,6,23,0.36)]">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-black text-[var(--foreground)]">Filtrar acervo</h2>
                <p className="text-sm text-slate-400">Escolha os critérios de busca.</p>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-amber-200/18 text-[var(--foreground)]"
              >
                <X size={18} aria-hidden="true" />
                <span className="sr-only">Fechar filtros</span>
              </button>
            </div>

            <form action="/acervo-raro" className="grid gap-3">
              <FilterFields {...props} />
              <div className="grid grid-cols-2 gap-2">
                <button className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-amber-200 px-4 text-sm font-black text-slate-950">
                  <SlidersHorizontal size={16} aria-hidden="true" />
                  Filtrar
                </button>
                <Link
                  href="/acervo-raro"
                  onClick={() => setIsOpen(false)}
                  className="inline-flex h-11 items-center justify-center rounded-md border border-amber-200/18 px-4 text-sm font-bold text-slate-300"
                >
                  Limpar
                </Link>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </section>
  );
}
