"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarClock, CheckCircle2, Minus, Plus, ShoppingBag } from "lucide-react";
import { SmartButtonLoading } from "@/components/ui/smart-loading";
import { formatCurrency, formatDate } from "@/lib/format";
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
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {items.map((item) => {
          const quantity = quantities[item.id] ?? 0;

          return (
            <article key={item.id} className="flex min-h-full flex-col overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--surface)]">
              <div className="relative aspect-[4/3] bg-slate-950/70">
                {item.mainImageUrl ? (
                  <Image src={item.mainImageUrl} alt={item.title} fill sizes="(max-width: 768px) 100vw, 33vw" className="object-contain p-3" />
                ) : (
                  <span className="flex h-full items-center justify-center">
                    <CalendarClock className="text-[var(--accent)]" size={34} aria-hidden="true" />
                  </span>
                )}
                <span className="absolute left-3 top-3 rounded-full bg-yellow-300 px-3 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-slate-950">
                  Pre-venda
                </span>
              </div>
              <div className="flex flex-1 flex-col p-4">
                <div className="flex flex-wrap gap-2 text-[10px] font-black uppercase tracking-[0.12em] text-[var(--muted)]">
                  {item.categoryName ? <span>{item.categoryName}</span> : null}
                  {item.franchiseName ? <span>{item.franchiseName}</span> : null}
                </div>
                <h2 className="mt-2 text-lg font-black leading-snug text-[var(--foreground)]">{item.title}</h2>
                <p className="mt-2 line-clamp-3 text-sm leading-6 text-[var(--muted)]">
                  {item.shortDescription || item.description || "Pre-venda temporaria Smart Funkos."}
                </p>
                <div className="mt-4 grid gap-1 text-xs text-[var(--muted)]">
                  {item.expectedArrival ? <span>Chegada prevista: {item.expectedArrival}</span> : null}
                  {item.orderDeadline ? <span>Pedidos ate {formatDate(item.orderDeadline)}</span> : null}
                </div>
                <div className="mt-auto pt-5">
                  <p className="text-2xl font-black text-[var(--foreground)]">{formatCurrency(item.price)}</p>
                  <div className="mt-4 flex h-11 items-center justify-between rounded-md border border-[var(--border)] bg-[var(--background)] px-2">
                    <button
                      type="button"
                      onClick={() => setQuantity(item, quantity - 1)}
                      className="flex h-8 w-8 items-center justify-center rounded-md border border-[var(--border)] hover:bg-[var(--surface-strong)]"
                      aria-label={`Remover ${item.title}`}
                    >
                      <Minus size={15} aria-hidden="true" />
                    </button>
                    <strong className="text-sm text-[var(--foreground)]">{quantity}</strong>
                    <button
                      type="button"
                      onClick={() => setQuantity(item, quantity + 1)}
                      className="flex h-8 w-8 items-center justify-center rounded-md border border-[var(--border)] hover:bg-[var(--surface-strong)]"
                      aria-label={`Adicionar ${item.title}`}
                    >
                      <Plus size={15} aria-hidden="true" />
                    </button>
                  </div>
                </div>
              </div>
            </article>
          );
        })}
      </div>

      <aside className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5 lg:sticky lg:top-28 lg:self-start">
        <div className="flex items-center gap-2">
          <ShoppingBag size={20} className="text-[var(--yellow)]" aria-hidden="true" />
          <h2 className="text-lg font-black text-[var(--foreground)]">Pedido de pre-venda</h2>
        </div>
        <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
          A pre-venda so confirma depois do pagamento. Assim que a InfinitePay confirmar, ela aparece em Meus pedidos como paga.
        </p>

        <div className="mt-5 grid gap-3">
          {selectedItems.length > 0 ? (
            selectedItems.map(({ item, quantity }) => (
              <div key={item.id} className="flex items-start justify-between gap-3 rounded-md border border-[var(--border)] bg-[var(--background)] p-3 text-sm">
                <div>
                  <p className="font-bold text-[var(--foreground)]">{quantity}x {item.title}</p>
                  <p className="mt-1 text-xs text-[var(--muted)]">{item.code}</p>
                </div>
                <strong className="text-[var(--foreground)]">{formatCurrency(quantity * item.price)}</strong>
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

        <div className="mt-5 rounded-md border border-[var(--border)] bg-[var(--background)] p-3">
          <span className="text-xs font-black uppercase tracking-[0.14em] text-[var(--muted)]">Total selecionado</span>
          <strong className="mt-1 block text-2xl text-[var(--foreground)]">{formatCurrency(selectedTotal)}</strong>
          <p className="mt-1 text-xs text-[var(--muted)]">{selectedCount} item(ns)</p>
        </div>

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

        {canRequest ? (
          <button
            type="button"
            disabled={isSubmitting || selectedItems.length === 0}
            onClick={() => void submitPreorder()}
            className="mt-5 inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-[var(--yellow)] px-4 text-sm font-black text-[#020617] hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? <SmartButtonLoading message="Gerando pagamento..." /> : "Ir para pagamento"}
          </button>
        ) : (
          <Link
            href={loginHref}
            className="mt-5 inline-flex h-11 w-full items-center justify-center rounded-md bg-[var(--yellow)] px-4 text-sm font-black text-[#020617] hover:brightness-110"
          >
            Entrar para pedir
          </Link>
        )}
      </aside>
    </div>
  );
}
