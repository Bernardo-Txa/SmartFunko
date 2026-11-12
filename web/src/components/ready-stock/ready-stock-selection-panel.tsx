"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Minus, Plus, ShoppingCart } from "lucide-react";
import { SmartButtonLoading } from "@/components/ui/smart-loading";
import { formatCurrency } from "@/lib/format";
import type { ReadyStockItem } from "@/server/ready-stock/ready-stock-service";

export function ReadyStockSelectionPanel({ canBuy, items, loginHref }: { canBuy: boolean; items: ReadyStockItem[]; loginHref: string }) {
  const router = useRouter();
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const selected = useMemo(() => items.map((item) => ({ item, quantity: quantities[item.id] ?? 0 })).filter((entry) => entry.quantity > 0), [items, quantities]);
  const total = selected.reduce((sum, entry) => sum + entry.item.price * entry.quantity, 0);
  const count = selected.reduce((sum, entry) => sum + entry.quantity, 0);

  function setQuantity(item: ReadyStockItem, quantity: number) {
    const maximum = Math.min(item.availableQuantity, item.maxPerCustomer ?? item.availableQuantity);
    setQuantities((current) => ({ ...current, [item.id]: Math.max(0, Math.min(maximum, quantity)) }));
  }

  async function checkout() {
    if (!canBuy) { router.push(loginHref); return; }
    if (!selected.length) { setError("Selecione ao menos um produto."); return; }
    setError(""); setIsSubmitting(true);
    try {
      const response = await fetch("/api/v1/me/ready-stock", { body: JSON.stringify({ items: selected.map(({ item, quantity }) => ({ itemId: item.id, quantity })) }), headers: { "content-type": "application/json" }, method: "POST" });
      const payload = await response.json() as { data?: { paymentLinkUrl?: string }; error?: { message?: string } };
      if (!response.ok) throw new Error(payload.error?.message ?? "Falha ao gerar checkout");
      if (payload.data?.paymentLinkUrl) { window.location.assign(payload.data.paymentLinkUrl); return; }
      throw new Error("Checkout nao retornou um link de pagamento");
    } catch (checkoutError) {
      setError(checkoutError instanceof Error ? checkoutError.message : "Falha ao gerar checkout"); router.refresh();
    } finally { setIsSubmitting(false); }
  }

  return <div>
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{items.map((item) => { const quantity = quantities[item.id] ?? 0; return <article key={item.id} className="flex flex-col overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--surface)]">
      <div className="relative aspect-[4/3] bg-slate-50">{item.mainImageUrl ? <Image src={item.mainImageUrl} alt={item.title} fill sizes="(max-width: 768px) 50vw, 22vw" className="object-contain p-2" /> : <span className="flex h-full items-center justify-center text-4xl font-black text-slate-300">SF</span>}</div>
      <div className="flex flex-1 flex-col p-4"><p className="text-[10px] font-black uppercase tracking-wider text-[var(--muted)]">{item.franchiseName || item.categoryName || item.code}</p><h2 className="mt-2 text-base font-black text-[var(--foreground)]">{item.title}</h2><p className="mt-2 line-clamp-2 text-sm text-[var(--muted)]">{item.description || "Disponível para envio imediato."}</p>
        <div className="mt-auto pt-4"><div className="flex items-end justify-between gap-3"><strong className="text-xl font-black text-[var(--foreground)]">{formatCurrency(item.price)}</strong><span className="text-xs font-bold text-emerald-200">{item.availableQuantity} disponível(is)</span></div>
          <div className="mt-3 flex h-11 items-center justify-between rounded-md border border-[var(--border)] px-2"><button type="button" onClick={() => setQuantity(item, quantity - 1)} aria-label={`Remover ${item.title}`} className="flex h-8 w-8 items-center justify-center rounded-md hover:bg-[var(--surface-strong)]"><Minus size={15} /></button><strong>{quantity}</strong><button type="button" onClick={() => setQuantity(item, quantity + 1)} aria-label={`Adicionar ${item.title}`} className="flex h-8 w-8 items-center justify-center rounded-md hover:bg-[var(--surface-strong)]"><Plus size={15} /></button></div>
        </div></div>
    </article>; })}</div>
    <div className="sticky bottom-4 z-30 mx-auto mt-6 flex max-w-2xl flex-col gap-3 rounded-lg border border-yellow-300/30 bg-slate-950/95 p-4 shadow-2xl backdrop-blur sm:flex-row sm:items-center sm:justify-between"><div><p className="text-sm font-bold text-slate-300">{count} item(ns)</p><strong className="text-xl text-white">{formatCurrency(total)}</strong></div><button type="button" disabled={isSubmitting || count === 0} onClick={() => void checkout()} className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-yellow-300 px-5 text-sm font-black text-slate-950 disabled:opacity-50">{isSubmitting ? <SmartButtonLoading message="Gerando..." /> : <><ShoppingCart size={17} />Pagar agora</>}</button></div>
    {error ? <p className="mt-3 text-center text-sm font-semibold text-red-300">{error}</p> : null}
  </div>;
}
