"use client";

import Image from "next/image";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Minus, Pencil, Plus, Save, X } from "lucide-react";
import { SmartButtonLoading } from "@/components/ui/smart-loading";
import { formatCurrency } from "@/lib/format";
import type { ReadyStockItem } from "@/server/ready-stock/ready-stock-service";

function parseMoney(value: string) { return Number(value.replace(/\./g, "").replace(",", ".")) || 0; }
type ApiResponse = { error?: { message?: string } };

export function ReadyStockInventoryPanel({ items }: { items: ReadyStockItem[] }) {
  const router = useRouter();
  const [editing, setEditing] = useState<ReadyStockItem | null>(null);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [stockDrafts, setStockDrafts] = useState<Record<string, string>>({});

  async function adjustStock(item: ReadyStockItem, direction: 1 | -1) {
    const amount = Math.max(1, Number(stockDrafts[item.id] || 1));
    setBusy(`stock-${item.id}`); setError(""); setMessage("");
    try {
      const response = await fetch(`/api/v1/admin/ready-stock/${item.id}/stock`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ quantity: amount * direction }) });
      const payload = await response.json() as ApiResponse;
      if (!response.ok) throw new Error(payload.error?.message ?? "Falha ao ajustar estoque");
      setMessage(`${amount} unidade(s) ${direction > 0 ? "adicionada(s) ao" : "removida(s) do"} estoque de ${item.title}.`);
      router.refresh();
    } catch (requestError) { setError(requestError instanceof Error ? requestError.message : "Falha ao ajustar estoque"); }
    finally { setBusy(""); }
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editing) return;
    const data = new FormData(event.currentTarget);
    setBusy(`edit-${editing.id}`); setError(""); setMessage("");
    try {
      const response = await fetch(`/api/v1/admin/ready-stock/${editing.id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({
        categoryName: String(data.get("categoryName") ?? "").trim() || null,
        code: String(data.get("code") ?? "").trim(),
        description: String(data.get("description") ?? "").trim() || null,
        franchiseName: String(data.get("franchiseName") ?? "").trim() || null,
        mainImageUrl: String(data.get("mainImageUrl") ?? "").trim() || null,
        maxPerCustomer: Number(data.get("maxPerCustomer") || 0) || null,
        price: parseMoney(String(data.get("price") ?? "")),
        status: String(data.get("status") ?? editing.status),
        title: String(data.get("title") ?? "").trim(),
      }) });
      const payload = await response.json() as ApiResponse;
      if (!response.ok) throw new Error(payload.error?.message ?? "Falha ao salvar produto");
      setEditing(null); setMessage("Produto atualizado."); router.refresh();
    } catch (requestError) { setError(requestError instanceof Error ? requestError.message : "Falha ao salvar produto"); }
    finally { setBusy(""); }
  }

  return <>
    {message ? <p className="mb-4 rounded-md border border-emerald-300/25 bg-emerald-400/10 px-3 py-2 text-sm font-semibold text-emerald-200">{message}</p> : null}
    {error ? <p className="mb-4 rounded-md border border-red-300/25 bg-red-500/10 px-3 py-2 text-sm font-semibold text-red-200">{error}</p> : null}
    <div className="overflow-x-auto"><table className="w-full min-w-[980px] text-sm"><thead><tr className="border-b border-[var(--border)] text-left text-[var(--muted)]"><th className="px-3 py-3">Produto</th><th className="px-3 py-3">Preco</th><th className="px-3 py-3">Total</th><th className="px-3 py-3">Reservado</th><th className="px-3 py-3">Disponivel</th><th className="px-3 py-3">Movimentar estoque</th><th className="px-3 py-3">Acoes</th></tr></thead><tbody className="divide-y divide-[var(--border)]">
      {items.map((item) => <tr key={item.id}><td className="px-3 py-3"><div className="flex items-center gap-3">{item.mainImageUrl ? <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded border border-[var(--border)] bg-white"><Image src={item.mainImageUrl} alt="" fill sizes="48px" className="object-contain p-1" /></div> : null}<div><strong className="block text-[var(--foreground)]">{item.title}</strong><span className="text-xs text-[var(--muted)]">{item.code} · {item.status}</span></div></div></td><td className="px-3 py-3">{formatCurrency(item.price)}</td><td className="px-3 py-3">{item.quantity}</td><td className="px-3 py-3 text-yellow-100">{item.reservedQuantity}</td><td className="px-3 py-3 text-emerald-200">{item.availableQuantity}</td><td className="px-3 py-3"><div className="flex items-center gap-2"><input type="number" min="1" value={stockDrafts[item.id] ?? "1"} onChange={(event) => setStockDrafts((current) => ({ ...current, [item.id]: event.target.value }))} className="h-9 w-20 rounded-md border border-[var(--border)] bg-[var(--background)] px-2" aria-label={`Quantidade para movimentar ${item.title}`} /><button type="button" disabled={Boolean(busy)} onClick={() => void adjustStock(item, 1)} className="flex h-9 items-center gap-1 rounded-md border border-emerald-300/30 px-2 font-bold text-emerald-200"><Plus size={14} />Adicionar</button><button type="button" disabled={Boolean(busy) || item.availableQuantity === 0} onClick={() => void adjustStock(item, -1)} className="flex h-9 items-center gap-1 rounded-md border border-red-300/30 px-2 font-bold text-red-200"><Minus size={14} />Remover</button></div></td><td className="px-3 py-3"><button type="button" onClick={() => { setEditing(item); setError(""); }} className="flex h-9 items-center gap-2 rounded-md bg-[var(--accent)] px-3 font-black text-slate-950"><Pencil size={14} />Editar</button></td></tr>)}
      {!items.length ? <tr><td colSpan={7} className="px-3 py-8 text-center text-[var(--muted)]">Nenhum produto cadastrado.</td></tr> : null}
    </tbody></table></div>

    {editing ? <div className="fixed inset-0 z-50 overflow-y-auto bg-black/70 p-3 backdrop-blur-sm sm:p-6" role="presentation" onClick={() => setEditing(null)}><section role="dialog" aria-modal="true" aria-label={`Editar ${editing.title}`} className="mx-auto w-full max-w-4xl rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5 shadow-2xl" onClick={(event) => event.stopPropagation()}><div className="flex items-center justify-between"><div><h2 className="text-lg font-black">Editar produto</h2><p className="text-sm text-[var(--muted)]">Altere preco, imagem e demais informacoes. O estoque e movimentado na listagem.</p></div><button type="button" onClick={() => setEditing(null)} className="flex h-9 w-9 items-center justify-center rounded-md border border-[var(--border)]" aria-label="Fechar"><X size={18} /></button></div>
      <form onSubmit={save} className="mt-5 grid gap-4"><div className="grid gap-4 md:grid-cols-[2fr_1fr_1fr]"><Field label="Produto" name="title" defaultValue={editing.title} required /><Field label="Preco" name="price" defaultValue={editing.price.toFixed(2).replace(".", ",")} required /><label className="block"><span className="text-sm font-semibold">Status</span><select name="status" defaultValue={editing.status} className="mt-2 h-11 w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3"><option value="open">Ativo</option><option value="draft">Rascunho</option><option value="paused">Pausado</option><option value="archived">Arquivado</option></select></label></div><div className="grid gap-4 md:grid-cols-3"><Field label="Codigo" name="code" defaultValue={editing.code} required /><Field label="Categoria" name="categoryName" defaultValue={editing.categoryName ?? ""} /><Field label="Franquia" name="franchiseName" defaultValue={editing.franchiseName ?? ""} /></div><div className="grid gap-4 md:grid-cols-[2fr_1fr]"><Field label="Imagem URL" name="mainImageUrl" defaultValue={editing.mainImageUrl ?? ""} type="url" /><Field label="Limite por cliente" name="maxPerCustomer" defaultValue={editing.maxPerCustomer ?? ""} type="number" /></div><label className="block"><span className="text-sm font-semibold">Descricao</span><textarea name="description" defaultValue={editing.description ?? ""} rows={4} className="mt-2 w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2" /></label>{error ? <p className="text-sm font-semibold text-red-300">{error}</p> : null}<button disabled={Boolean(busy)} className="inline-flex h-11 w-fit items-center gap-2 rounded-md bg-[var(--accent)] px-5 text-sm font-black text-slate-950 disabled:opacity-60">{busy === `edit-${editing.id}` ? <SmartButtonLoading message="Salvando..." /> : <><Save size={16} />Salvar alteracoes</>}</button></form>
    </section></div> : null}
  </>;
}

function Field({ label, ...props }: { label: string; name: string; defaultValue: string | number; required?: boolean; type?: string }) { return <label className="block"><span className="text-sm font-semibold">{label}</span><input {...props} className="mt-2 h-11 w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3" /></label>; }
