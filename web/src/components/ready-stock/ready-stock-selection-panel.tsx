"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Minus, PackageCheck, Plus, ShoppingCart, X } from "lucide-react";
import { SmartButtonLoading } from "@/components/ui/smart-loading";
import { formatCurrency } from "@/lib/format";
import type { ReadyStockItem } from "@/server/ready-stock/ready-stock-service";

type ApiResponse = { data?: { paymentLinkUrl?: string }; error?: { message?: string } };

export function ReadyStockSelectionPanel({ canBuy, items, loginHref }: { canBuy: boolean; items: ReadyStockItem[]; loginHref: string }) {
  const router = useRouter();
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [error, setError] = useState("");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const selected = useMemo(() => items.map((item) => ({
    item,
    quantity: Math.min(quantities[item.id] ?? 0, item.availableQuantity, item.maxPerCustomer ?? item.availableQuantity),
  })).filter(({ quantity }) => quantity > 0), [items, quantities]);
  const total = selected.reduce((sum, { item, quantity }) => sum + item.price * quantity, 0);
  const count = selected.reduce((sum, { quantity }) => sum + quantity, 0);

  function setQuantity(item: ReadyStockItem, quantity: number) {
    const maximum = Math.min(item.availableQuantity, item.maxPerCustomer ?? item.availableQuantity);
    setQuantities((current) => ({ ...current, [item.id]: Math.max(0, Math.min(maximum, quantity)) }));
  }

  async function checkout() {
    setError("");
    if (!canBuy) { router.push(loginHref); return; }
    if (!selected.length) { setError("Selecione ao menos um produto."); return; }
    setIsSubmitting(true);
    try {
      const response = await fetch("/api/v1/me/ready-stock", {
        body: JSON.stringify({ items: selected.map(({ item, quantity }) => ({ itemId: item.id, quantity })), notes: notes.trim() || null }),
        headers: { "content-type": "application/json" },
        method: "POST",
      });
      const payload = await response.json() as ApiResponse;
      if (!response.ok) throw new Error(payload.error?.message ?? "Falha ao gerar checkout");
      if (payload.data?.paymentLinkUrl) { window.location.assign(payload.data.paymentLinkUrl); return; }
      throw new Error("Checkout nao retornou um link de pagamento");
    } catch (checkoutError) {
      setError(checkoutError instanceof Error ? checkoutError.message : "Falha ao gerar checkout");
      router.refresh();
    } finally { setIsSubmitting(false); }
  }

  return <>
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {items.map((item) => {
        const quantity = Math.min(quantities[item.id] ?? 0, item.availableQuantity, item.maxPerCustomer ?? item.availableQuantity);
        const isSoldOut = item.availableQuantity === 0;
        return <article key={item.id} className={`flex min-h-full flex-col overflow-hidden rounded-lg border bg-[var(--surface)] transition ${quantity ? "border-yellow-300/70 shadow-[0_0_0_1px_rgba(250,204,21,0.22)]" : isSoldOut ? "border-[var(--border)] opacity-75" : "border-[var(--border)] hover:border-[var(--accent)]/70"}`}>
          <div className="relative aspect-[4/3] bg-[#f8fafc]">
            {item.mainImageUrl ? <Image src={item.mainImageUrl} alt={item.title} fill sizes="(max-width: 768px) 50vw, 22vw" className="object-contain p-2" /> : <span className="flex h-full items-center justify-center bg-slate-950/70"><PackageCheck className="text-[var(--accent)]" size={28} /></span>}
            <span className="absolute left-2 top-2 rounded-full bg-emerald-300 px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.12em] text-slate-950 shadow-lg">Pronta entrega</span>
            {quantity ? <span className="absolute right-2 top-2 rounded-full border border-emerald-300/40 bg-emerald-400/90 px-2.5 py-1 text-[9px] font-black uppercase text-slate-950">{quantity}x</span> : null}
            {isSoldOut ? <span className="absolute right-2 top-2 rounded-full border border-red-300/40 bg-red-500/90 px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.12em] text-white">Esgotado</span> : null}
          </div>
          <div className="flex flex-1 flex-col p-3.5">
            <p className="text-[10px] font-extrabold uppercase tracking-[0.08em] text-[var(--muted)]">{item.franchiseName || item.categoryName || item.code}</p>
            <h2 className="mt-2 line-clamp-2 min-h-[44px] text-[15px] font-extrabold leading-[22px] text-[var(--foreground)]">{item.title}</h2>
            <p className="mt-2 line-clamp-2 text-sm text-[var(--muted)]">{item.description || (isSoldOut ? "Produto esgotado no momento." : "Disponivel para envio imediato.")}</p>
            <div className="mt-auto pt-4">
              <div className="flex items-end justify-between gap-3"><div><span className="text-[10px] font-extrabold uppercase text-[var(--muted)]">Valor</span><p className="text-[22px] font-black text-[var(--foreground)]">{formatCurrency(item.price)}</p></div><span className={`text-xs font-bold ${isSoldOut ? "text-red-300" : "text-emerald-200"}`}>{isSoldOut ? "Sem estoque" : `${item.availableQuantity} disponivel(is)`}</span></div>
              {quantity ? <QuantityControl item={item} quantity={quantity} setQuantity={setQuantity} /> : isSoldOut ? <button type="button" disabled className="mt-3 inline-flex h-10 w-full cursor-not-allowed items-center justify-center gap-2 rounded-md border border-[var(--border)] bg-[var(--surface-strong)] px-3 text-sm font-black text-[var(--muted)]" aria-label={`${item.title} esgotado`}><ShoppingCart size={16} />Esgotado</button> : <button type="button" onClick={() => setQuantity(item, 1)} className="mt-3 inline-flex h-10 w-full items-center justify-center gap-2 rounded-md bg-[var(--yellow)] px-3 text-sm font-black text-[#020617] hover:brightness-110"><ShoppingCart size={16} />Adicionar</button>}
            </div>
          </div>
        </article>;
      })}
    </div>

    <button type="button" onClick={() => setIsCartOpen(true)} className="fixed bottom-5 right-5 z-40 flex h-16 w-16 items-center justify-center rounded-full bg-[var(--yellow)] text-[#020617] shadow-[0_18px_48px_rgba(250,204,21,0.35)] transition hover:scale-105" aria-label="Abrir carrinho de pronta entrega">
      <ShoppingCart size={28} />{count ? <span className="absolute -right-1 -top-1 flex h-6 min-w-6 items-center justify-center rounded-full border-2 border-[#020617] bg-emerald-400 px-1.5 text-xs font-black">{count}</span> : null}
    </button>

    {isCartOpen ? <div className="fixed inset-0 z-50 bg-black/70 p-3 backdrop-blur-sm sm:p-6" role="presentation" onClick={() => setIsCartOpen(false)}>
      <aside role="dialog" aria-modal="true" aria-label="Carrinho de pronta entrega" className="ml-auto flex h-full w-full max-w-md flex-col overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--surface)] shadow-2xl" onClick={(event) => event.stopPropagation()}>
        <div className="flex items-start justify-between gap-4 border-b border-[var(--border)] p-5"><div><div className="flex items-center gap-2"><ShoppingCart size={20} className="text-[var(--yellow)]" /><h2 className="text-lg font-black">Carrinho de pronta entrega</h2></div><p className="mt-2 text-sm text-[var(--muted)]">O estoque fica reservado por 30 minutos durante o pagamento.</p></div><button type="button" onClick={() => setIsCartOpen(false)} className="flex h-9 w-9 items-center justify-center rounded-md border border-[var(--border)]" aria-label="Fechar carrinho"><X size={18} /></button></div>
        <div className="flex-1 overflow-y-auto p-5">
          <div className="rounded-lg border border-emerald-300/30 bg-emerald-300/10 p-3 text-sm text-emerald-100"><div className="flex gap-2"><PackageCheck size={17} className="mt-0.5 shrink-0" /><p>Produtos em estoque, preparados para envio depois da confirmacao do pagamento.</p></div></div>
          <div className="mt-5 grid gap-3">{selected.length ? selected.map(({ item, quantity }) => <div key={item.id} className="grid grid-cols-[56px_minmax(0,1fr)] gap-3 rounded-md border border-[var(--border)] bg-[var(--background)] p-3 text-sm"><div className="relative h-14 w-14 overflow-hidden rounded-md border border-[var(--border)] bg-[#f8fafc]">{item.mainImageUrl ? <Image src={item.mainImageUrl} alt="" fill sizes="56px" className="object-contain p-1" /> : null}</div><div className="min-w-0"><div className="flex justify-between gap-3"><p className="line-clamp-2 font-bold">{item.title}</p><strong>{formatCurrency(quantity * item.price)}</strong></div><QuantityControl item={item} quantity={quantity} setQuantity={setQuantity} compact /></div></div>) : <p className="rounded-md border border-dashed border-[var(--border)] p-3 text-sm text-[var(--muted)]">Selecione os itens desejados.</p>}</div>
          <label className="mt-5 block"><span className="text-sm font-semibold">Observacao para o admin</span><textarea value={notes} onChange={(event) => setNotes(event.target.value)} rows={3} className="mt-2 w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm" /></label>
          {error ? <p className="mt-4 rounded-md border border-red-300/25 bg-red-500/10 px-3 py-2 text-sm font-semibold text-red-200">{error}</p> : null}
        </div>
        <div className="border-t border-[var(--border)] p-5"><div className="rounded-md border border-[var(--border)] bg-[var(--background)] p-3"><span className="text-xs font-black uppercase tracking-[0.14em] text-[var(--muted)]">Total selecionado</span><strong className="mt-1 block text-2xl">{formatCurrency(total)}</strong><p className="text-xs text-[var(--muted)]">{count} item(ns)</p></div>{canBuy ? <button type="button" disabled={isSubmitting || !selected.length} onClick={() => void checkout()} className="mt-4 inline-flex h-11 w-full items-center justify-center rounded-md bg-[var(--yellow)] px-4 text-sm font-black text-[#020617] disabled:opacity-60">{isSubmitting ? <SmartButtonLoading message="Gerando pagamento..." /> : "Ir para pagamento"}</button> : <Link href={loginHref} className="mt-4 inline-flex h-11 w-full items-center justify-center rounded-md bg-[var(--yellow)] text-sm font-black text-[#020617]">Entrar para comprar</Link>}</div>
      </aside>
    </div> : null}
  </>;
}

function QuantityControl({ item, quantity, setQuantity, compact = false }: { item: ReadyStockItem; quantity: number; setQuantity: (item: ReadyStockItem, quantity: number) => void; compact?: boolean }) {
  return <div className={`${compact ? "mt-2 w-28" : "mt-3 w-full"} flex h-10 items-center justify-between rounded-md border border-yellow-300/40 bg-yellow-300/10 px-1.5`}><button type="button" onClick={() => setQuantity(item, quantity - 1)} className="flex h-7 w-7 items-center justify-center rounded-md text-yellow-100" aria-label={`Remover ${item.title}`}><Minus size={14} /></button><strong className="text-sm text-yellow-100">{quantity}</strong><button type="button" onClick={() => setQuantity(item, quantity + 1)} className="flex h-7 w-7 items-center justify-center rounded-md text-yellow-100" aria-label={`Adicionar ${item.title}`}><Plus size={14} /></button></div>;
}
