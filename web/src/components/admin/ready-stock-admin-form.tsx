"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { SmartButtonLoading } from "@/components/ui/smart-loading";

function parseMoney(value: string) { return Number(value.replace(/\./g, "").replace(",", ".")) || 0; }

export function ReadyStockAdminForm() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(""); setMessage(""); setIsSubmitting(true);
    const form = event.currentTarget; const data = new FormData(form);
    try {
      const response = await fetch("/api/v1/admin/ready-stock", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({
        categoryName: String(data.get("categoryName") ?? "") || null,
        code: String(data.get("code") ?? "") || null,
        description: String(data.get("description") ?? "") || null,
        franchiseName: String(data.get("franchiseName") ?? "") || null,
        mainImageUrl: String(data.get("mainImageUrl") ?? "") || null,
        maxPerCustomer: Number(data.get("maxPerCustomer") || 0) || null,
        price: parseMoney(String(data.get("price") ?? "")),
        quantity: Number(data.get("quantity") || 0),
        status: String(data.get("status") ?? "open"),
        title: String(data.get("title") ?? ""),
      }) });
      const payload = await response.json() as { error?: { message?: string } };
      if (!response.ok) throw new Error(payload.error?.message ?? "Falha ao cadastrar produto");
      form.reset(); setMessage("Produto cadastrado na Pronta Entrega."); router.refresh();
    } catch (submitError) { setError(submitError instanceof Error ? submitError.message : "Falha ao cadastrar produto"); }
    finally { setIsSubmitting(false); }
  }

  return <section className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5"><h2 className="text-lg font-black text-[var(--foreground)]">Novo produto próprio</h2><p className="mt-1 text-sm text-[var(--muted)]">Este cadastro aparece somente na aba Pronta Entrega.</p>
    <form onSubmit={submit} className="mt-5 grid gap-4">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-[2fr_1fr_1fr_1fr]"><label className="block"><span className="text-sm font-semibold">Produto</span><input name="title" required className="mt-2 h-11 w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3" /></label><label className="block"><span className="text-sm font-semibold">Preço</span><input name="price" required inputMode="decimal" placeholder="199,90" className="mt-2 h-11 w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3" /></label><label className="block"><span className="text-sm font-semibold">Quantidade</span><input name="quantity" required type="number" min="0" className="mt-2 h-11 w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3" /></label><label className="block"><span className="text-sm font-semibold">Status</span><select name="status" defaultValue="open" className="mt-2 h-11 w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3"><option value="open">Ativo</option><option value="draft">Rascunho</option><option value="paused">Pausado</option></select></label></div>
      <div className="grid gap-4 md:grid-cols-3"><label className="block"><span className="text-sm font-semibold">Código</span><input name="code" className="mt-2 h-11 w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3" /></label><label className="block"><span className="text-sm font-semibold">Categoria</span><input name="categoryName" className="mt-2 h-11 w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3" /></label><label className="block"><span className="text-sm font-semibold">Franquia</span><input name="franchiseName" className="mt-2 h-11 w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3" /></label></div>
      <div className="grid gap-4 md:grid-cols-[2fr_1fr]"><label className="block"><span className="text-sm font-semibold">Imagem URL</span><input name="mainImageUrl" type="url" className="mt-2 h-11 w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3" /></label><label className="block"><span className="text-sm font-semibold">Limite por cliente</span><input name="maxPerCustomer" type="number" min="1" className="mt-2 h-11 w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3" /></label></div>
      <label className="block"><span className="text-sm font-semibold">Descrição</span><textarea name="description" rows={3} className="mt-2 w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2" /></label>
      {message ? <p className="text-sm font-semibold text-emerald-200">{message}</p> : null}{error ? <p className="text-sm font-semibold text-red-300">{error}</p> : null}
      <button disabled={isSubmitting} className="inline-flex h-11 w-fit items-center gap-2 rounded-md bg-[var(--accent)] px-5 text-sm font-black text-slate-950 disabled:opacity-50">{isSubmitting ? <SmartButtonLoading message="Salvando..." /> : <><Plus size={16} />Cadastrar produto</>}</button>
    </form></section>;
}
