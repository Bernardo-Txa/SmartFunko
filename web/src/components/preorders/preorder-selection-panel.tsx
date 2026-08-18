"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarClock, CheckCircle2, Minus, Plus, ShoppingCart, X } from "lucide-react";
import { SmartButtonLoading } from "@/components/ui/smart-loading";
import { formatCurrency } from "@/lib/format";
import type { PreorderItem } from "@/server/preorders/preorder-service";

type ApiResponse = {
  data?: {
    paymentLinkUrl?: string;
    reservation?: {
      reservation_number?: string;
    };
  };
  error?: {
    message?: string;
  };
};

export function PreorderSelectionPanel({
  canRequest,
  items,
  loginHref,
}: {
  canRequest: boolean;
  items: PreorderItem[];
  loginHref: string;
}) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [notes, setNotes] = useState("");
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [isCartOpen, setIsCartOpen] = useState(false);

  const selectedItems = useMemo(
    () => items
      .map((item) => ({ item, quantity: quantities[item.id] ?? 0 }))
      .filter((entry) => entry.quantity > 0),
    [items, quantities],
  );
  const selectedTotal = selectedItems.reduce((sum, entry) => sum + entry.quantity * entry.item.price, 0);
  const selectedCount = selectedItems.reduce((sum, entry) => sum + entry.quantity, 0);

  function setQuantity(item: PreorderItem, nextQuantity: number) {
    const max = item.maxPerCustomer ?? 99;
    const normalized = Math.max(0, Math.min(max, nextQuantity));

    setQuantities((current) => ({
      ...current,
      [item.id]: normalized,
    }));
  }

  async function submitPreorder() {
    setError("");
    setMessage("");

    if (!canRequest) {
      router.push(loginHref);
      return;
    }

    if (selectedItems.length === 0) {
      setError("Selecione ao menos uma pre-venda.");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/v1/me/preorders", {
        body: JSON.stringify({
          items: selectedItems.map(({ item, quantity }) => ({
            itemId: item.id,
            quantity,
          })),
          notes: notes.trim() || null,
        }),
        headers: { "content-type": "application/json" },
        method: "POST",
      });
      const payload = (await response.json()) as ApiResponse;

      if (!response.ok) {
        throw new Error(payload.error?.message ?? "Falha ao gerar pagamento da pre-venda");
      }

      setQuantities({});
      setNotes("");
      setMessage(`Pre-venda ${payload.data?.reservation?.reservation_number ?? ""} criada. Redirecionando para pagamento.`);

      if (payload.data?.paymentLinkUrl) {
        window.location.assign(payload.data.paymentLinkUrl);
        return;
      }

      router.refresh();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Falha ao gerar pagamento da pre-venda");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {items.map((item) => {
          const quantity = quantities[item.id] ?? 0;
          const itemSelectedTotal = quantity * item.price;
          const isSelected = quantity > 0;

          return (
            <article
              key={item.id}
              className={[
                "flex min-h-full flex-col overflow-hidden rounded-lg border bg-[var(--surface)] transition",
                isSelected
                  ? "border-yellow-300/70 shadow-[0_0_0_1px_rgba(250,204,21,0.22)]"
                  : "border-[var(--border)] hover:border-[var(--accent)]/70",
              ].join(" ")}
            >
              <div className="relative aspect-[4/3] bg-[#f8fafc]">
                {item.mainImageUrl ? (
                  <Image
                    src={item.mainImageUrl}
                    alt={item.title}
                    fill
                    sizes="(max-width: 768px) 50vw, 22vw"
                    className="object-contain p-2"
                  />
                ) : (
                  <span className="flex h-full items-center justify-center bg-slate-950/70">
                    <CalendarClock className="text-[var(--accent)]" size={28} aria-hidden="true" />
                  </span>
                )}
                <span className="absolute left-2 top-2 rounded-full bg-yellow-300 px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.12em] text-slate-950 shadow-lg">
                  Pre-venda
                </span>
                {isSelected ? (
                  <span className="absolute right-2 top-2 rounded-full border border-emerald-300/40 bg-emerald-400/15 px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.12em] text-emerald-100">
                    {quantity}x
                  </span>
                ) : null}
              </div>
              <div className="flex flex-1 flex-col p-3.5">
                <div className="flex min-h-4 flex-wrap gap-2 text-[10px] font-extrabold uppercase tracking-[0.08em] text-[var(--muted)]">
                  <span>{item.franchiseName || item.code}</span>
                </div>
                <h2 className="mt-2 line-clamp-2 min-h-[44px] text-[15px] font-extrabold leading-[22px] text-[var(--foreground)]">{item.title}</h2>
                <div className="mt-3 text-xs text-[var(--muted)]">
                  <span className="flex items-center justify-between gap-2 rounded-md border border-[var(--border)] bg-[var(--background)] px-2 py-1.5">
                    <b className="text-[10px] font-extrabold uppercase tracking-[0.08em] text-[var(--muted)]">Chegada</b>
                    <span className="truncate font-bold text-[var(--foreground)]">{item.expectedArrival || "A confirmar"}</span>
                  </span>
                </div>
                <div className="mt-auto pt-4">
                  <div className="flex items-end justify-between gap-3">
                    <div>
                      <span className="text-[10px] font-extrabold uppercase tracking-[0.08em] text-[var(--muted)]">Valor</span>
                      <p className="text-[22px] font-black leading-7 text-[var(--foreground)]">{formatCurrency(item.price)}</p>
                    </div>
                    {isSelected ? (
                      <span className="rounded-md border border-yellow-300/30 bg-yellow-300/10 px-2 py-1 text-right text-[11px] font-bold text-yellow-100">
                        {formatCurrency(itemSelectedTotal)}
                      </span>
                    ) : null}
                  </div>
                  {isSelected ? (
                    <div className="mt-3 flex h-10 items-center justify-between rounded-md border border-yellow-300/40 bg-yellow-300/10 px-1.5">
                      <button
                        type="button"
                        onClick={() => setQuantity(item, quantity - 1)}
                        className="flex h-7 w-7 items-center justify-center rounded-md border border-yellow-300/30 text-yellow-100 hover:bg-yellow-300/10"
                        aria-label={`Remover ${item.title}`}
                      >
                        <Minus size={14} aria-hidden="true" />
                      </button>
                      <strong className="min-w-20 text-center text-sm font-black text-yellow-100">{quantity} no carrinho</strong>
                      <button
                        type="button"
                        onClick={() => setQuantity(item, quantity + 1)}
                        className="flex h-7 w-7 items-center justify-center rounded-md border border-yellow-300/30 text-yellow-100 hover:bg-yellow-300/10"
                        aria-label={`Adicionar ${item.title}`}
                      >
                        <Plus size={14} aria-hidden="true" />
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setQuantity(item, 1)}
                      className="mt-3 inline-flex h-10 w-full items-center justify-center gap-2 rounded-md bg-[var(--yellow)] px-3 text-sm font-black text-[#020617] shadow-[0_12px_28px_rgba(250,204,21,0.18)] hover:brightness-110"
                      aria-label={`Adicionar ${item.title} ao carrinho`}
                    >
                      <ShoppingCart size={16} aria-hidden="true" />
                      Adicionar
                    </button>
                  )}
                </div>
              </div>
            </article>
          );
        })}
      </div>

      <button
        type="button"
        onClick={() => setIsCartOpen(true)}
        className="fixed bottom-5 right-5 z-40 flex h-16 w-16 items-center justify-center rounded-full bg-[var(--yellow)] text-[#020617] shadow-[0_18px_48px_rgba(250,204,21,0.35)] transition hover:scale-105 hover:brightness-110"
        aria-label="Abrir carrinho de pre-venda"
      >
        <ShoppingCart size={28} aria-hidden="true" />
        {selectedCount > 0 ? (
          <span className="absolute -right-1 -top-1 flex h-6 min-w-6 items-center justify-center rounded-full border-2 border-[#020617] bg-emerald-400 px-1.5 text-xs font-black text-[#020617]">
            {selectedCount}
          </span>
        ) : null}
      </button>

      {isCartOpen ? (
        <div
          className="fixed inset-0 z-50 bg-black/70 p-3 backdrop-blur-sm sm:p-6"
          role="presentation"
          onClick={() => setIsCartOpen(false)}
        >
          <aside
            role="dialog"
            aria-modal="true"
            aria-label="Carrinho de pre-venda"
            className="ml-auto flex h-full w-full max-w-md flex-col overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--surface)] shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4 border-b border-[var(--border)] p-5">
              <div>
                <div className="flex items-center gap-2">
                  <ShoppingCart size={20} className="text-[var(--yellow)]" aria-hidden="true" />
                  <h2 className="text-lg font-black text-[var(--foreground)]">Carrinho de pre-venda</h2>
                </div>
                <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                  A pre-venda so confirma depois do pagamento InfinitePay.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsCartOpen(false)}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-[var(--border)] text-[var(--foreground)] hover:bg-[var(--surface-strong)]"
                aria-label="Fechar carrinho"
              >
                <X size={18} aria-hidden="true" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5">
              <div className="rounded-lg border border-yellow-300/30 bg-yellow-300/10 p-3 text-sm leading-6 text-yellow-100">
                <div className="flex gap-2">
                  <CalendarClock size={17} className="mt-0.5 shrink-0" aria-hidden="true" />
                  <p>
                    Este pedido e de pre-venda. Separacao e envio acontecem somente apos a data de lancamento ou chegada prevista de cada item.
                  </p>
                </div>
              </div>

              <div className="mt-5 grid gap-3">
                {selectedItems.length > 0 ? (
                  selectedItems.map(({ item, quantity }) => (
                    <div key={item.id} className="grid grid-cols-[52px_minmax(0,1fr)] gap-3 rounded-md border border-[var(--border)] bg-[var(--background)] p-3 text-sm">
                      <div className="relative h-14 w-14 overflow-hidden rounded-md border border-[var(--border)] bg-[#f8fafc]">
                        {item.mainImageUrl ? (
                          <Image src={item.mainImageUrl} alt="" fill sizes="56px" className="object-contain p-1" />
                        ) : (
                          <span className="flex h-full items-center justify-center bg-slate-950/70">
                            <CalendarClock size={18} className="text-[var(--accent)]" aria-hidden="true" />
                          </span>
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-start justify-between gap-3">
                          <p className="line-clamp-2 font-bold text-[var(--foreground)]">{quantity}x {item.title}</p>
                          <strong className="shrink-0 text-[var(--foreground)]">{formatCurrency(quantity * item.price)}</strong>
                        </div>
                        <p className="mt-1 text-xs text-[var(--muted)]">
                          {item.expectedArrival ? `Lancamento/chegada: ${item.expectedArrival}` : item.code}
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="rounded-md border border-dashed border-[var(--border)] p-3 text-sm text-[var(--muted)]">
                    Selecione os itens desejados.
                  </p>
                )}
              </div>

              <label className="mt-5 block">
                <span className="text-sm font-semibold text-[var(--foreground)]">Observacao para o admin</span>
                <textarea
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  rows={3}
                  className="mt-2 w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
                />
              </label>

              {message ? (
                <p className="mt-4 flex items-center gap-2 rounded-md border border-emerald-300/25 bg-emerald-400/10 px-3 py-2 text-sm font-semibold text-emerald-200">
                  <CheckCircle2 size={16} aria-hidden="true" />
                  {message}
                </p>
              ) : null}
              {error ? (
                <p className="mt-4 rounded-md border border-red-300/25 bg-red-500/10 px-3 py-2 text-sm font-semibold text-red-200">
                  {error}
                </p>
              ) : null}
            </div>

            <div className="border-t border-[var(--border)] p-5">
              <div className="rounded-md border border-[var(--border)] bg-[var(--background)] p-3">
                <span className="text-xs font-black uppercase tracking-[0.14em] text-[var(--muted)]">Total selecionado</span>
                <strong className="mt-1 block text-2xl text-[var(--foreground)]">{formatCurrency(selectedTotal)}</strong>
                <p className="mt-1 text-xs text-[var(--muted)]">{selectedCount} item(ns)</p>
              </div>

              {canRequest ? (
                <button
                  type="button"
                  disabled={isSubmitting || selectedItems.length === 0}
                  onClick={() => void submitPreorder()}
                  className="mt-4 inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-[var(--yellow)] px-4 text-sm font-black text-[#020617] hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSubmitting ? <SmartButtonLoading message="Gerando pagamento..." /> : "Ir para pagamento"}
                </button>
              ) : (
                <Link
                  href={loginHref}
                  className="mt-4 inline-flex h-11 w-full items-center justify-center rounded-md bg-[var(--yellow)] px-4 text-sm font-black text-[#020617] hover:brightness-110"
                >
                  Entrar para pedir
                </Link>
              )}
            </div>
          </aside>
        </div>
      ) : null}
    </>
  );
}
