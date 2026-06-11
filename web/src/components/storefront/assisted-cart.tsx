"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BadgePercent, ClipboardCheck, MessageCircle, Minus, Plus, Trash2 } from "lucide-react";
import { useMemo, useState, useSyncExternalStore } from "react";
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
  const router = useRouter();
  const items = useSyncExternalStore(subscribeCart, readCart, readServerCart);
  const [error, setError] = useState("");
  const [couponCode, setCouponCode] = useState("");
  const [couponError, setCouponError] = useState("");
  const [couponResult, setCouponResult] = useState<{
    code: string;
    discount: number;
    totalAfterDiscount: number;
  } | null>(null);
  const [isApplyingCoupon, setIsApplyingCoupon] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const total = useMemo(
    () => items.reduce((sum, item) => sum + item.price * item.quantity, 0),
    [items],
  );
  const whatsappUrl = createCartWhatsAppUrl({
    customerContact,
    customerName,
    items,
  });
  const canSubmitForReview = items.every((item) => item.variantId);
  const finalTotal = couponResult?.totalAfterDiscount ?? total;

  function clearCoupon() {
    setCouponResult(null);
    setCouponError("");
  }

  async function applyCoupon() {
    const code = couponCode.trim();

    if (!code) {
      setCouponResult(null);
      setCouponError("Informe um cupom.");
      return;
    }

    setCouponError("");
    setIsApplyingCoupon(true);

    try {
      const response = await fetch("/api/v1/me/coupons/validate", {
        body: JSON.stringify({
          code,
          items: items.map((item) => ({
            quantity: item.quantity,
            variantId: item.variantId,
          })),
        }),
        headers: { "content-type": "application/json" },
        method: "POST",
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload?.error?.message ?? "Cupom invalido");
      }

      setCouponResult(payload.data);
      setCouponCode(payload.data.code);
    } catch (requestError) {
      setCouponResult(null);
      setCouponError(requestError instanceof Error ? requestError.message : "Cupom invalido");
    } finally {
      setIsApplyingCoupon(false);
    }
  }

  async function submitForReview() {
    setError("");
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/v1/me/orders", {
        body: JSON.stringify({
          items: items.map((item) => ({
            quantity: item.quantity,
            variantId: item.variantId,
          })),
          couponCode: couponResult?.code ?? undefined,
          notes: "Pedido enviado pelo carrinho assistido.",
        }),
        headers: { "content-type": "application/json" },
        method: "POST",
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload?.error?.message ?? "Falha ao enviar pedido para analise");
      }

      clearCart();
      router.push(`/conta/pedidos/${payload.data.orderNumber}`);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Falha ao enviar pedido para analise");
    } finally {
      setIsSubmitting(false);
    }
  }

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
                  onClick={() => {
                    clearCoupon();
                    updateCartItemQuantity(item.id, item.quantity - 1);
                  }}
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
                  onClick={() => {
                    clearCoupon();
                    updateCartItemQuantity(item.id, item.quantity + 1);
                  }}
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
                  onClick={() => {
                    clearCoupon();
                    removeCartItem(item.id);
                  }}
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
          {couponResult ? (
            <>
              <div className="flex items-center justify-between">
                <span className="text-[var(--muted)]">Cupom {couponResult.code}</span>
                <strong className="text-emerald-300">-{formatCurrency(couponResult.discount)}</strong>
              </div>
              <div className="flex items-center justify-between border-t border-[var(--border)] pt-3">
                <span className="text-[var(--muted)]">Total com desconto</span>
                <strong className="text-xl text-[var(--foreground)]">{formatCurrency(finalTotal)}</strong>
              </div>
            </>
          ) : null}
        </div>
        <div className="mt-4 rounded-lg border border-[var(--border)] bg-[var(--background)] p-3">
          <label className="block">
            <span className="text-sm font-bold text-[var(--foreground)]">Cupom de desconto</span>
            <div className="mt-2 flex gap-2">
              <input
                value={couponCode}
                onChange={(event) => {
                  setCouponCode(event.target.value);
                  setCouponResult(null);
                  setCouponError("");
                }}
                placeholder="SMART10"
                className="min-w-0 flex-1 rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 text-sm font-semibold uppercase text-[var(--foreground)] outline-none focus:border-[var(--accent)]"
              />
              <button
                type="button"
                disabled={isApplyingCoupon || !canSubmitForReview}
                onClick={applyCoupon}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-[var(--accent)] px-3 text-sm font-black text-[#020617] hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <BadgePercent size={16} aria-hidden="true" />
                {isApplyingCoupon ? "Validando..." : "Aplicar"}
              </button>
            </div>
          </label>
          {couponResult ? (
            <p className="mt-2 text-xs font-semibold text-emerald-300">Cupom aplicado.</p>
          ) : null}
          {couponError ? <p className="mt-2 text-xs font-semibold text-red-300">{couponError}</p> : null}
        </div>
        <p className="mt-4 text-xs leading-5 text-[var(--muted)]">
          Este carrinho não reserva estoque, não calcula frete e só gera pagamento por link após aprovação da Smart Funkos.
        </p>
        <button
          type="button"
          disabled={!canSubmitForReview || isSubmitting}
          onClick={submitForReview}
          className="mt-5 inline-flex h-11 w-full items-center justify-center gap-2 rounded-full bg-[var(--yellow)] px-4 text-sm font-black text-[#020617] hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <ClipboardCheck size={17} aria-hidden="true" />
          {isSubmitting ? "Enviando..." : "Enviar pedido para análise"}
        </button>
        {!canSubmitForReview ? (
          <p className="mt-2 text-xs leading-5 text-red-300">
            Um item do carrinho precisa ser adicionado novamente pelo catálogo antes do envio.
          </p>
        ) : null}
        {error ? <p className="mt-2 text-xs leading-5 text-red-300">{error}</p> : null}
        <a
          href={whatsappUrl}
          target="_blank"
          rel="noreferrer"
          className="mt-3 inline-flex h-11 w-full items-center justify-center gap-2 rounded-full bg-[var(--green)] px-4 text-sm font-black text-[#052e16] hover:brightness-110"
        >
          <MessageCircle size={17} aria-hidden="true" />
          Falar com atendimento
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
