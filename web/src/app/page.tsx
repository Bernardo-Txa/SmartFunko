import Link from "next/link";
import { ArrowRight, MessageCircle, PackageCheck, UserRound } from "lucide-react";
import { ProductCard } from "@/components/product/product-card";
import { products } from "@/lib/mock-data";

export default function Home() {
  const featuredProducts = products.slice(0, 4);

  return (
    <div className="bg-[var(--background)]">
      <section className="border-b border-[var(--border)] bg-white">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:px-8">
          <div className="flex flex-col justify-center">
            <p className="text-sm font-semibold text-[var(--accent)]">
              Catalogo com atendimento assistido
            </p>
            <h1 className="mt-3 max-w-xl text-4xl font-bold leading-tight text-[var(--foreground)]">
              Smart Funkos
            </h1>
            <p className="mt-4 max-w-xl text-base leading-7 text-[var(--muted)]">
              Escolha o item, chame no WhatsApp com o produto preenchido e acompanhe
              seus pedidos pela conta.
            </p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/catalogo"
                className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-[var(--foreground)] px-4 text-sm font-semibold text-white hover:bg-black"
              >
                <PackageCheck size={17} aria-hidden="true" />
                Ver catalogo
              </Link>
              <Link
                href="/cadastro"
                className="inline-flex h-11 items-center justify-center gap-2 rounded-md border border-[var(--border)] bg-white px-4 text-sm font-semibold text-[var(--foreground)] hover:bg-[var(--surface-strong)]"
              >
                <UserRound size={17} aria-hidden="true" />
                Criar conta
              </Link>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4">
              <MessageCircle className="text-[var(--accent)]" size={24} />
              <strong className="mt-4 block text-sm">WhatsApp</strong>
              <span className="mt-1 block text-sm text-[var(--muted)]">
                Produto, codigo e link enviados no atendimento.
              </span>
            </div>
            <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4">
              <PackageCheck className="text-[var(--pink)]" size={24} />
              <strong className="mt-4 block text-sm">Estoque</strong>
              <span className="mt-1 block text-sm text-[var(--muted)]">
                Reserva por unidade no pedido manual.
              </span>
            </div>
            <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4">
              <UserRound className="text-[var(--amber)]" size={24} />
              <strong className="mt-4 block text-sm">Conta</strong>
              <span className="mt-1 block text-sm text-[var(--muted)]">
                Historico e status dos pedidos do cliente.
              </span>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="mb-5 flex items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-[var(--foreground)]">
              Destaques do catalogo
            </h2>
            <p className="mt-1 text-sm text-[var(--muted)]">
              Itens prontos, sob encomenda e pre-venda.
            </p>
          </div>
          <Link
            href="/catalogo"
            className="inline-flex h-10 items-center gap-2 rounded-md border border-[var(--border)] bg-white px-3 text-sm font-semibold text-[var(--foreground)] hover:bg-[var(--surface-strong)]"
          >
            Abrir
            <ArrowRight size={16} aria-hidden="true" />
          </Link>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {featuredProducts.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </section>
    </div>
  );
}
