import Image from "next/image";
import Link from "next/link";
import { ArrowRight, MessageCircle, PackageCheck, UserRound } from "lucide-react";
import { ProductCard } from "@/components/product/product-card";
import { products } from "@/lib/mock-data";

export default function Home() {
  const featuredProducts = products.slice(0, 4);

  return (
    <div>
      <section className="relative overflow-hidden border-b border-[var(--border)]">
        <div className="absolute inset-0 bg-[linear-gradient(120deg,rgba(2,6,23,0.96),rgba(15,23,42,0.84)_42%,rgba(79,70,229,0.42))]" />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(255,255,255,0.035)_1px,transparent_1px),linear-gradient(0deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[length:34px_34px]" />
        <div className="mx-auto grid min-h-[560px] max-w-7xl gap-8 px-4 py-12 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:px-8">
          <div className="relative z-10 flex flex-col justify-center">
            <Image
              src="/brand/SmartFunko.png"
              alt="Smart Funkos"
              width={300}
              height={105}
              preload
              className="mb-5 h-auto w-56 drop-shadow-[0_0_26px_rgba(34,211,238,0.42)] sm:w-72"
            />
            <p className="text-sm font-bold uppercase tracking-[0.22em] text-[var(--yellow)]">
              Catalogo com atendimento assistido
            </p>
            <h1 className="mt-3 max-w-xl text-4xl font-black leading-tight text-white sm:text-5xl">
              Monte sua colecao sem perder o controle do pedido.
            </h1>
            <p className="mt-4 max-w-xl text-base leading-7 text-slate-300">
              Escolha o item, chame no WhatsApp com o produto preenchido e acompanhe
              seus pedidos pela conta.
            </p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/catalogo"
                className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-[var(--yellow)] px-5 text-sm font-black text-[#020617] shadow-[0_0_26px_rgba(250,204,21,0.28)] hover:brightness-110"
              >
                <PackageCheck size={17} aria-hidden="true" />
                Ver catalogo
              </Link>
              <Link
                href="/cadastro"
                className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-[var(--border)] bg-slate-950/38 px-5 text-sm font-bold text-white backdrop-blur hover:bg-cyan-400/15"
              >
                <UserRound size={17} aria-hidden="true" />
                Criar conta
              </Link>
            </div>
          </div>

          <div className="relative z-10 min-h-[380px]">
            <Image
              src="/brand/products/spider-man-black-light.png"
              alt="Funko Pop Spider-Man Black Light"
              width={600}
              height={600}
              preload
              className="absolute left-[18%] top-0 z-20 w-[54%] max-w-[390px] drop-shadow-[0_34px_30px_rgba(0,0,0,0.48)]"
            />
            <Image
              src="/brand/products/stitch-tiki.png"
              alt="Funko Pop Stitch Tiki"
              width={600}
              height={600}
              className="absolute bottom-4 left-0 z-10 w-[38%] max-w-[240px] rotate-[-7deg] drop-shadow-[0_28px_24px_rgba(0,0,0,0.44)]"
            />
            <Image
              src="/brand/products/cinderella-diamond.png"
              alt="Funko Pop Cinderella Diamond"
              width={600}
              height={600}
              className="absolute bottom-0 right-0 z-10 w-[38%] max-w-[245px] rotate-[8deg] drop-shadow-[0_28px_24px_rgba(0,0,0,0.44)]"
            />
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
            className="inline-flex h-10 items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface)] px-4 text-sm font-bold text-[var(--foreground)] hover:bg-cyan-400/15"
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

      <section className="mx-auto grid max-w-7xl gap-4 px-4 pb-12 sm:px-6 md:grid-cols-3 lg:px-8">
        <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5 backdrop-blur">
          <MessageCircle className="text-[var(--green)]" size={24} />
          <strong className="mt-4 block text-sm">WhatsApp com contexto</strong>
          <span className="mt-1 block text-sm text-[var(--muted)]">
            Produto, codigo, preco e link saem prontos para o atendimento.
          </span>
        </div>
        <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5 backdrop-blur">
          <PackageCheck className="text-[var(--yellow)]" size={24} />
          <strong className="mt-4 block text-sm">Estoque reservado</strong>
          <span className="mt-1 block text-sm text-[var(--muted)]">
            O admin organiza reserva, pagamento e status por item.
          </span>
        </div>
        <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5 backdrop-blur">
          <UserRound className="text-[var(--accent)]" size={24} />
          <strong className="mt-4 block text-sm">Conta do cliente</strong>
          <span className="mt-1 block text-sm text-[var(--muted)]">
            Historico e acompanhamento ficam salvos desde a V1.
          </span>
        </div>
      </section>
    </div>
  );
}
