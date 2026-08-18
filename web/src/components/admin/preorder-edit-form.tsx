"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ImagePlus, Save } from "lucide-react";
import { SmartButtonLoading } from "@/components/ui/smart-loading";
import type { PreorderItem, PreorderItemStatus } from "@/server/preorders/preorder-service";

const statusOptions: Array<{ label: string; value: PreorderItemStatus }> = [
  { label: "Rascunho", value: "draft" },
  { label: "Aberta", value: "open" },
  { label: "Pausada", value: "paused" },
  { label: "Encerrada", value: "closed" },
  { label: "Arquivada", value: "archived" },
];

type ApiResponse<T> = {
  data?: T;
  error?: {
    message?: string;
  };
};

function parseMoney(value: string) {
  const cleaned = value.replace(/[^\d,.-]/g, "").trim();
  const normalized = cleaned.includes(",") && cleaned.includes(".")
    ? cleaned.replace(/\./g, "").replace(",", ".")
    : cleaned.replace(",", ".");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatMoneyInput(value: number) {
  return value.toFixed(2).replace(".", ",");
}

function splitImageUrls(value: string) {
  return value
    .split(/[\n,|]/)
    .map((entry) => entry.trim())
    .filter(Boolean);
}

export function PreorderEditForm({ item }: { item: PreorderItem }) {
  const router = useRouter();
  const [description, setDescription] = useState(item.description ?? "");
  const [error, setError] = useState("");
  const [imagePreview, setImagePreview] = useState(item.mainImageUrl ?? "");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [priceDraft, setPriceDraft] = useState(formatMoneyInput(item.price));
  const [titleDraft, setTitleDraft] = useState(item.title);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);
    const title = String(formData.get("title") ?? "").trim();
    const price = parseMoney(String(formData.get("price") ?? ""));

    try {
      if (title.length < 2) {
        throw new Error("Informe o nome da pre-venda.");
      }

      if (price <= 0) {
        throw new Error("Informe um preco maior que zero.");
      }

      const response = await fetch(`/api/v1/admin/preorders/${item.id}`, {
        body: JSON.stringify({
          categoryName: null,
          code: String(formData.get("code") ?? "").trim() || null,
          description: String(formData.get("description") ?? "").trim() || null,
          expectedArrival: String(formData.get("expectedArrival") ?? "").trim() || null,
          franchiseName: String(formData.get("franchiseName") ?? "").trim() || null,
          galleryImageUrls: splitImageUrls(String(formData.get("galleryImageUrls") ?? "")),
          mainImageUrl: String(formData.get("mainImageUrl") ?? "").trim() || null,
          maxPerCustomer: Number(formData.get("maxPerCustomer") || 0) || null,
          orderDeadline: String(formData.get("orderDeadline") ?? "").trim() || null,
          price,
          shortDescription: null,
          status: String(formData.get("status") ?? item.status),
          title,
        }),
        headers: { "content-type": "application/json" },
        method: "PATCH",
      });
      const payload = (await response.json()) as ApiResponse<PreorderItem>;

      if (!response.ok) {
        throw new Error(payload.error?.message ?? "Falha ao atualizar pre-venda");
      }

      setMessage("Pre-venda atualizada.");
      router.refresh();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Falha ao atualizar pre-venda");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="grid gap-5">
      <Link
        href="/admin/pre-vendas"
        className="inline-flex w-fit items-center gap-2 text-sm font-semibold text-[var(--accent)] hover:underline"
      >
        <ArrowLeft size={16} aria-hidden="true" />
        Voltar para pre-vendas
      </Link>

      <section className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5">
        <form onSubmit={handleSubmit} className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_300px]">
          <div className="grid gap-4">
            <div className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-[minmax(0,1fr)_160px_160px_160px]">
              <label className="block">
                <span className="text-sm font-semibold text-[var(--foreground)]">Produto</span>
                <input
                  name="title"
                  value={titleDraft}
                  onChange={(event) => setTitleDraft(event.target.value)}
                  required
                  className="mt-2 h-11 w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 text-sm outline-none focus:border-[var(--accent)]"
                />
              </label>
              <label className="block">
                <span className="text-sm font-semibold text-[var(--foreground)]">Preco</span>
                <input
                  name="price"
                  value={priceDraft}
                  onChange={(event) => setPriceDraft(event.target.value)}
                  required
                  inputMode="decimal"
                  className="mt-2 h-11 w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 text-sm outline-none focus:border-[var(--accent)]"
                />
              </label>
              <label className="block">
                <span className="text-sm font-semibold text-[var(--foreground)]">Status</span>
                <select
                  name="status"
                  defaultValue={item.status}
                  className="mt-2 h-11 w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 text-sm outline-none focus:border-[var(--accent)]"
                >
                  {statusOptions.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="text-sm font-semibold text-[var(--foreground)]">Limite por pedido</span>
                <input
                  name="maxPerCustomer"
                  defaultValue={item.maxPerCustomer ?? ""}
                  inputMode="numeric"
                  className="mt-2 h-11 w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 text-sm outline-none focus:border-[var(--accent)]"
                />
              </label>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="block">
                <span className="text-sm font-semibold text-[var(--foreground)]">Imagem principal URL</span>
                <input
                  name="mainImageUrl"
                  type="url"
                  defaultValue={item.mainImageUrl ?? ""}
                  onChange={(event) => setImagePreview(event.target.value.trim())}
                  className="mt-2 h-11 w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 text-sm outline-none focus:border-[var(--accent)]"
                />
              </label>
              <label className="block">
                <span className="text-sm font-semibold text-[var(--foreground)]">Prazo para pedir</span>
                <input
                  name="orderDeadline"
                  type="date"
                  defaultValue={item.orderDeadline ?? ""}
                  className="mt-2 h-11 w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 text-sm outline-none focus:border-[var(--accent)]"
                />
              </label>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="block">
                <span className="text-sm font-semibold text-[var(--foreground)]">Chegada prevista</span>
                <input
                  name="expectedArrival"
                  defaultValue={item.expectedArrival ?? ""}
                  className="mt-2 h-11 w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 text-sm outline-none focus:border-[var(--accent)]"
                />
              </label>
              <label className="block">
                <span className="text-sm font-semibold text-[var(--foreground)]">Franquia / linha</span>
                <input
                  name="franchiseName"
                  defaultValue={item.franchiseName ?? ""}
                  className="mt-2 h-11 w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 text-sm outline-none focus:border-[var(--accent)]"
                />
              </label>
            </div>

            <label className="block">
              <span className="text-sm font-semibold text-[var(--foreground)]">Descricao</span>
              <textarea
                name="description"
                rows={5}
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                className="mt-2 w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
              />
            </label>

            <details className="rounded-lg border border-[var(--border)] bg-[var(--background)]">
              <summary className="flex min-h-11 cursor-pointer items-center gap-2 px-3 text-sm font-black text-[var(--foreground)]">
                <ImagePlus size={16} aria-hidden="true" className="text-[var(--accent)]" />
                Campos opcionais
              </summary>
              <div className="grid gap-4 border-t border-[var(--border)] p-3">
                <label className="block">
                  <span className="text-sm font-semibold text-[var(--foreground)]">Codigo</span>
                  <input
                    name="code"
                    defaultValue={item.code}
                    className="mt-2 h-11 w-full rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 text-sm outline-none focus:border-[var(--accent)]"
                  />
                </label>
                <label className="block">
                  <span className="text-sm font-semibold text-[var(--foreground)]">Imagens extras</span>
                  <textarea
                    name="galleryImageUrls"
                    rows={3}
                    defaultValue={item.galleryImageUrls.join("\n")}
                    className="mt-2 w-full rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
                  />
                </label>
              </div>
            </details>

            {message ? (
              <p className="rounded-md border border-emerald-300/25 bg-emerald-400/10 px-3 py-2 text-sm font-semibold text-emerald-200">
                {message}
              </p>
            ) : null}
            {error ? (
              <p className="rounded-md border border-red-300/25 bg-red-500/10 px-3 py-2 text-sm font-semibold text-red-200">
                {error}
              </p>
            ) : null}

            <button
              disabled={isSubmitting}
              className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-[var(--accent)] px-4 text-sm font-black text-[#020617] hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60 md:w-fit"
            >
              {isSubmitting ? <SmartButtonLoading message="Salvando..." /> : <><Save size={16} /> Salvar alteracoes</>}
            </button>
          </div>

          <aside className="rounded-lg border border-[var(--border)] bg-[var(--background)] p-4 lg:self-start">
            <div className="relative flex aspect-[4/3] items-center justify-center overflow-hidden rounded-lg border border-[var(--border)] bg-slate-950/70">
              {/^https?:\/\//i.test(imagePreview) ? (
                <Image src={imagePreview} alt={titleDraft} fill unoptimized sizes="300px" className="object-contain p-3" />
              ) : (
                <div className="grid justify-items-center gap-2 text-center text-[var(--muted)]">
                  <ImagePlus size={28} aria-hidden="true" />
                  <span className="text-xs font-semibold">Sem imagem</span>
                </div>
              )}
            </div>
            <span className="mt-4 inline-flex rounded-full border border-yellow-300/35 bg-yellow-300/10 px-2 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-yellow-100">
              Pre-venda
            </span>
            <strong className="mt-3 block text-base text-[var(--foreground)]">{titleDraft || item.title}</strong>
            <p className="mt-2 text-xs text-[var(--muted)]">{item.code}</p>
            <div className="mt-4 rounded-md border border-yellow-300/25 bg-yellow-300/10 p-3 text-xs leading-5 text-yellow-100">
              Pre-venda confirmada somente apos pagamento. Envio apenas depois do lancamento ou chegada prevista.
            </div>
          </aside>
        </form>
      </section>
    </div>
  );
}
