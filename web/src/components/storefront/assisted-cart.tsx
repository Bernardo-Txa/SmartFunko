"use client";

import Image from "next/image";
import Link from "next/link";
import { MessageCircle, Minus, Plus, Trash2 } from "lucide-react";
import { useMemo, useSyncExternalStore } from "react";
import {
  clearCart,
  readCart,
  readServerCart,
  removeCartItem,
  subscribeCart,
  updateCartItemQuantity,
} from "@/lib/client/cart-client";
import { formatCurrency } from "@/lib/format";
import { createCartWhatsAppUrl } from "@/lib/whatsapp";

export function AssistedCart({
  customerContact,
  customerName,
}: {
  customerContact?: string | null;
  customerName?: string | null;
}) {
  const items = useSyncExternalStore(subscribeCart, readCart, readServerCart);

  const total = useMemo(
    () => items.reduce((sum, item) => sum + item.price * item.quantity, 0),
    [items],
  );
  const whatsappUrl = createCartWhatsAppUrl({
    customerContact,
    customerName,
    items,
  });

  if (items.length === 0) {
    return (
      <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-6 text-center">
        <h2 className="text-xl font-black text-[var(--foreground)]">Carrinho vazio</h2>
        <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-[var(--muted)]">
          Adicione produtos para montar uma intenção de compra e finalizar pelo atendimento.
        </p>
        <Link
          href="/catalogo"
          prefetch={false}
          className="mt-5 inline-flex h-10 items-center justify-center rounded-full bg-[var(--yellow)] px-4 text-sm font-black text-[#020617] hover:brightness-110"
        >
          Ver catálogo
        </Link>
      </div>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
      <section className="grid gap-3">
        {items.map((item) => (
          <article
            key={item.id}
            className="grid gap-4 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4 sm:grid-cols-[88px_1fr_auto]"
          >
            <Link
              href={`/produto/${item.slug}`}
              prefetch={false}
              className="relative h-24 w-24 overflow-hidden rounded-md border border-[var(--border)] bg-white"
            >
              {item.imageUrl ? (
                <Image
                  src={item.imageUrl}
                  alt={item.name}
                  fill
                  sizes="96px"
                  className="object-contain p-2"
                />
              ) : (
                <span className="flex h-full items-center justify-center text-xs font-black text-slate-900">
                  POP
                </span>
              )}
            </Link>
            <div>
              <Link
                href={`/produto/${item.slug}`}
                prefetch={false}
                className="font-black text-[var(--foreground)] hover:text-[var(--accent)]"
              >
                {item.name}
              </Link>
              <p className="mt-1 text-xs text-[var(--muted)]">SKU {item.sku}</p>
              <p className="mt-3 text-sm font-bold text-[var(--foreground)]">
                {formatCurrency(item.price)}
              </p>
            </div>
            <div className="flex items-center justify-between gap-3 sm:flex-col sm:items-end">
              <div className="flex h-10 items-center rounded-full border border-[var(--border)]">
                <button
                  type="button"
                  className="inline-flex h-10 w-10 items-center justify-center text-[var(--foreground)] hover:text-[var(--accent)]"
                  onClick={() => updateCartItemQuantity(item.id, item.quantity - 1)}
                  aria-label={`Diminuir quantidade de ${item.name}`}
                >
                  <Minus size={15} aria-hidden="true" />
                </button>
                <span className="min-w-8 text-center text-sm font-black text-[var(--foreground)]">
                  {item.quantity}
                </span>
                <button
                  type="button"
                  className="inline-flex h-10 w-10 items-center justify-center text-[var(--foreground)] hover:text-[var(--accent)]"
                  onClick={() => updateCartItemQuantity(item.id, item.quantity + 1)}
                  aria-label={`Aumentar quantidade de ${item.name}`}
                >
                  <Plus size={15} aria-hidden="true" />
                </button>
              </div>
              <div className="text-right">
                <strong className="block text-sm text-[var(--foreground)]">
                  {formatCurrency(item.price * item.quantity)}
                </strong>
                <button
                  type="button"
                  onClick={() => removeCartItem(item.id)}
                  className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-red-100 hover:text-red-200"
                >
                  <Trash2 size={13} aria-hidden="true" />
                  Remover
                </button>
              </div>
            </div>
          </article>
        ))}
      </section>

      <aside className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5 lg:self-start">
        <h2 className="text-lg font-black text-[var(--foreground)]">Resumo</h2>
        <div className="mt-4 grid gap-3 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-[var(--muted)]">Itens</span>
            <strong className="text-[var(--foreground)]">
              {items.reduce((sum, item) => sum + item.quantity, 0)}
            </strong>
          </div>
          <div className="flex items-center justify-between border-t border-[var(--border)] pt-3">
            <span className="text-[var(--muted)]">Total estimado</span>
            <strong className="text-xl text-[var(--foreground)]">{formatCurrency(total)}</strong>
          </div>
        </div>
        <p className="mt-4 text-xs leading-5 text-[var(--muted)]">
          Este carrinho não reserva estoque, não calcula frete e não finaliza pagamento.
        </p>
        <a
          href={whatsappUrl}
          target="_blank"
          rel="noreferrer"
          className="mt-5 inline-flex h-11 w-full items-center justify-center gap-2 rounded-full bg-[var(--green)] px-4 text-sm font-black text-[#052e16] hover:brightness-110"
        >
          <MessageCircle size={17} aria-hidden="true" />
          Finalizar pelo WhatsApp
        </a>
        <Link
          href="/catalogo"
          prefetch={false}
          className="mt-3 inline-flex h-10 w-full items-center justify-center rounded-full border border-[var(--border)] text-sm font-bold text-[var(--foreground)] hover:bg-cyan-400/12"
        >
          Continuar comprando
        </Link>
        <button
          type="button"
          onClick={clearCart}
          className="mt-3 inline-flex h-10 w-full items-center justify-center rounded-full border border-[var(--border)] text-sm font-bold text-[var(--foreground)] hover:bg-cyan-400/12"
        >
          Limpar carrinho
        </button>
      </aside>
    </div>
  );
}
