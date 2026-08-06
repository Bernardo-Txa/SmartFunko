"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { CalendarClock, ImagePlus, Save, Search, Trash2 } from "lucide-react";
import { SmartButtonLoading } from "@/components/ui/smart-loading";
import { formatCurrency, formatDate } from "@/lib/format";
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

function splitImageUrls(value: string) {
  return value
    .split(/[\n,|]/)
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function statusClassName(status: string) {
  if (status === "open") {
    return "border-emerald-300/35 bg-emerald-400/10 text-emerald-100";
  }

  if (status === "paused") {
    return "border-yellow-300/35 bg-yellow-300/10 text-yellow-100";
  }

  if (status === "closed") {
    return "border-cyan-300/35 bg-cyan-400/10 text-cyan-100";
  }

  if (status === "archived") {
    return "border-slate-300/25 bg-slate-400/10 text-slate-300";
  }

  return "border-[var(--border)] bg-[var(--surface-strong)] text-[var(--muted)]";
}

export function PreorderAdminPanel({
  initialItems,
  initialQuery,
  initialStatus,
  loadError,
}: {
  initialItems: PreorderItem[];
  initialQuery: string;
  initialStatus: string;
  loadError?: string;
}) {
  const router = useRouter();
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");
  const [imagePreview, setImagePreview] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [priceDraft, setPriceDraft] = useState("");
  const [titleDraft, setTitleDraft] = useState("");
  const parsedPrice = useMemo(() => parseMoney(priceDraft), [priceDraft]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");
    setIsSubmitting(true);

    const form = event.currentTarget;
    const formData = new FormData(form);
    const title = String(formData.get("title") ?? "").trim();
    const price = parseMoney(String(formData.get("price") ?? ""));
    const galleryImageUrls = splitImageUrls(String(formData.get("galleryImageUrls") ?? ""));

    try {
      if (title.length < 2) {
        throw new Error("Informe o nome da pre-venda.");
      }

      if (price <= 0) {
        throw new Error("Informe um preco maior que zero.");
      }

      const response = await fetch("/api/v1/admin/preorders", {
        body: JSON.stringify({
          categoryName: String(formData.get("categoryName") ?? "").trim() || null,
          code: String(formData.get("code") ?? "").trim() || null,
          description: String(formData.get("description") ?? "").trim() || null,
          expectedArrival: String(formData.get("expectedArrival") ?? "").trim() || null,
          franchiseName: String(formData.get("franchiseName") ?? "").trim() || null,
          galleryImageUrls,
          mainImageUrl: String(formData.get("mainImageUrl") ?? "").trim() || null,
          maxPerCustomer: Number(formData.get("maxPerCustomer") || 0) || null,
          orderDeadline: String(formData.get("orderDeadline") ?? "").trim() || null,
          price,
          shortDescription: String(formData.get("shortDescription") ?? "").trim() || null,
          status: String(formData.get("status") ?? "open"),
          title,
        }),
        headers: { "content-type": "application/json" },
        method: "POST",
      });
      const payload = (await response.json()) as ApiResponse<PreorderItem>;

      if (!response.ok) {
        throw new Error(payload.error?.message ?? "Falha ao criar pre-venda");
      }

      form.reset();
      setDescription("");
      setImagePreview("");
      setPriceDraft("");
      setTitleDraft("");
      setMessage("Pre-venda cadastrada.");
      router.refresh();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Falha ao criar pre-venda");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="grid gap-6">
      <section className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5">
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_300px]">
          <div>
            <div className="mb-4">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-[var(--yellow)]">Cadastro temporario</p>
              <h2 className="mt-2 text-xl font-black text-[var(--foreground)]">Nova pre-venda</h2>
              <p className="mt-1 text-sm text-[var(--muted)]">
                Produtos daqui nao entram no catalogo antigo. O cliente seleciona, paga pela InfinitePay e so entao o pedido V2 nasce pago.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="grid gap-4">
              <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_160px_160px]">
                <label className="block">
                  <span className="text-sm font-semibold text-[var(--foreground)]">Produto</span>
                  <input
                    name="title"
                    value={titleDraft}
                    onChange={(event) => setTitleDraft(event.target.value)}
                    required
                    placeholder="Ex: Funko Pop! Spider-Man edição 2026"
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
                    placeholder="219,90"
                    className="mt-2 h-11 w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 text-sm outline-none focus:border-[var(--accent)]"
                  />
                </label>
                <label className="block">
                  <span className="text-sm font-semibold text-[var(--foreground)]">Status</span>
                  <select
                    name="status"
                    defaultValue="open"
                    className="mt-2 h-11 w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 text-sm outline-none focus:border-[var(--accent)]"
                  >
                    {statusOptions.map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_180px]">
                <label className="block">
                  <span className="text-sm font-semibold text-[var(--foreground)]">Resumo curto</span>
                  <input
                    name="shortDescription"
                    placeholder="Texto curto que aparece no card"
                    className="mt-2 h-11 w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 text-sm outline-none focus:border-[var(--accent)]"
                  />
                </label>
                <label className="block">
                  <span className="text-sm font-semibold text-[var(--foreground)]">Limite por pedido</span>
                  <input
                    name="maxPerCustomer"
                    inputMode="numeric"
                    placeholder="sem limite"
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
                    onChange={(event) => setImagePreview(event.target.value.trim())}
                    placeholder="https://..."
                    className="mt-2 h-11 w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 text-sm outline-none focus:border-[var(--accent)]"
                  />
                </label>
                <label className="block">
                  <span className="text-sm font-semibold text-[var(--foreground)]">Prazo para pedir</span>
                  <input
                    name="orderDeadline"
                    type="date"
                    className="mt-2 h-11 w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 text-sm outline-none focus:border-[var(--accent)]"
                  />
                </label>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <label className="block">
                  <span className="text-sm font-semibold text-[var(--foreground)]">Chegada prevista</span>
                  <input
                    name="expectedArrival"
                    placeholder="Ex: setembro/2026"
                    className="mt-2 h-11 w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 text-sm outline-none focus:border-[var(--accent)]"
                  />
                </label>
                <label className="block">
                  <span className="text-sm font-semibold text-[var(--foreground)]">Categoria</span>
                  <input
                    name="categoryName"
                    placeholder="Funko Pop, Cards, Boneco..."
                    className="mt-2 h-11 w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 text-sm outline-none focus:border-[var(--accent)]"
                  />
                </label>
                <label className="block">
                  <span className="text-sm font-semibold text-[var(--foreground)]">Franquia / linha</span>
                  <input
                    name="franchiseName"
                    placeholder="Marvel, NBA, Disney..."
                    className="mt-2 h-11 w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 text-sm outline-none focus:border-[var(--accent)]"
                  />
                </label>
              </div>

              <label className="block">
                <span className="text-sm font-semibold text-[var(--foreground)]">Descricao</span>
                <textarea
                  name="description"
                  rows={4}
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
                  <div className="grid gap-4 md:grid-cols-2">
                    <label className="block">
                      <span className="text-sm font-semibold text-[var(--foreground)]">Codigo</span>
                      <input
                        name="code"
                        placeholder="automatico"
                        className="mt-2 h-11 w-full rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 text-sm outline-none focus:border-[var(--accent)]"
                      />
                    </label>
                    <label className="block">
                      <span className="text-sm font-semibold text-[var(--foreground)]">Imagens extras</span>
                      <textarea
                        name="galleryImageUrls"
                        rows={2}
                        placeholder="Uma URL por linha"
                        className="mt-2 w-full rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
                      />
                    </label>
                  </div>
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
                {isSubmitting ? <SmartButtonLoading message="Salvando..." /> : <><Save size={16} /> Salvar pre-venda</>}
              </button>
            </form>
          </div>

          <aside className="rounded-lg border border-[var(--border)] bg-[var(--background)] p-4 lg:self-start">
            <div className="relative flex aspect-[4/3] items-center justify-center overflow-hidden rounded-lg border border-[var(--border)] bg-slate-950/70">
              {/^https?:\/\//i.test(imagePreview) ? (
                <Image src={imagePreview} alt="Preview da pre-venda" fill unoptimized sizes="300px" className="object-contain p-3" />
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
            <strong className="mt-3 block text-base text-[var(--foreground)]">{titleDraft.trim() || "Nome do produto"}</strong>
            <span className="mt-2 block text-sm font-black text-[var(--foreground)]">
              {parsedPrice > 0 ? formatCurrency(parsedPrice) : "R$ 0,00"}
            </span>
            {description.trim() ? (
              <p className="mt-3 line-clamp-5 text-sm leading-6 text-[var(--muted)]">{description.trim()}</p>
            ) : null}
          </aside>
        </div>
      </section>

      <section className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="text-xl font-black text-[var(--foreground)]">Pre-vendas cadastradas</h2>
            <p className="mt-1 text-sm text-[var(--muted)]">Use a coluna A pedir para comprar somente o que ja foi pago.</p>
          </div>
          <form className="grid gap-2 sm:grid-cols-[minmax(180px,1fr)_160px_auto]">
            <label className="block">
              <span className="text-xs font-semibold text-[var(--muted)]">Busca</span>
              <div className="relative mt-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]" size={16} />
                <input
                  name="q"
                  defaultValue={initialQuery}
                  placeholder="Nome, codigo ou slug"
                  className="h-10 w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-9 text-sm outline-none focus:border-[var(--accent)]"
                />
              </div>
            </label>
            <label className="block">
              <span className="text-xs font-semibold text-[var(--muted)]">Status</span>
              <select
                name="status"
                defaultValue={initialStatus}
                className="mt-1 h-10 w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 text-sm outline-none focus:border-[var(--accent)]"
              >
                <option value="">Todos</option>
                {statusOptions.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </label>
            <button className="h-10 self-end rounded-md bg-[var(--accent)] px-4 text-sm font-black text-[#020617] hover:brightness-110">
              Filtrar
            </button>
          </form>
        </div>

        {loadError ? (
          <p className="mt-4 rounded-md border border-red-300/25 bg-red-500/10 px-3 py-2 text-sm font-semibold text-red-200">
            {loadError}
          </p>
        ) : null}

        <div className="mt-5 grid gap-4">
          {initialItems.map((item) => (
            <PreorderAdminRow key={item.id} item={item} />
          ))}
          {initialItems.length === 0 && !loadError ? (
            <p className="rounded-lg border border-dashed border-[var(--border)] p-5 text-sm text-[var(--muted)]">
              Nenhuma pre-venda cadastrada ainda.
            </p>
          ) : null}
        </div>
      </section>
    </div>
  );
}

function PreorderAdminRow({ item }: { item: PreorderItem }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function updateStatus(status: string) {
    setError("");
    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/v1/admin/preorders/${item.id}`, {
        body: JSON.stringify({ status }),
        headers: { "content-type": "application/json" },
        method: "PATCH",
      });
      const payload = (await response.json()) as ApiResponse<PreorderItem>;

      if (!response.ok) {
        throw new Error(payload.error?.message ?? "Falha ao atualizar status");
      }

      router.refresh();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Falha ao atualizar status");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function deleteItem() {
    if (!window.confirm(`Excluir "${item.title}"?`)) {
      return;
    }

    setError("");
    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/v1/admin/preorders/${item.id}`, { method: "DELETE" });
      const payload = (await response.json().catch(() => ({}))) as ApiResponse<unknown>;

      if (!response.ok) {
        throw new Error(payload.error?.message ?? "Falha ao excluir pre-venda");
      }

      router.refresh();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Falha ao excluir pre-venda");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <article className="grid gap-4 rounded-lg border border-[var(--border)] bg-[var(--background)] p-4 lg:grid-cols-[minmax(0,1fr)_260px]">
      <div className="grid gap-4 sm:grid-cols-[88px_minmax(0,1fr)]">
        <div className="relative flex h-24 w-24 items-center justify-center overflow-hidden rounded-lg border border-[var(--border)] bg-slate-950/70">
          {item.mainImageUrl ? (
            <Image src={item.mainImageUrl} alt={item.title} fill sizes="96px" className="object-contain p-2" />
          ) : (
            <CalendarClock size={24} className="text-[var(--accent)]" aria-hidden="true" />
          )}
        </div>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className={["inline-flex rounded-full border px-2 py-1 text-[10px] font-black uppercase tracking-[0.14em]", statusClassName(item.status)].join(" ")}>
              {statusOptions.find((option) => option.value === item.status)?.label ?? item.status}
            </span>
            <span className="rounded-full border border-[var(--border)] px-2 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-[var(--muted)]">
              {item.code}
            </span>
          </div>
          <h3 className="mt-3 text-lg font-black text-[var(--foreground)]">{item.title}</h3>
          <p className="mt-1 text-sm text-[var(--muted)]">{item.shortDescription || item.description || "Sem descricao curta."}</p>
          <div className="mt-4 grid gap-2 text-sm sm:grid-cols-4">
            <span className="rounded-md border border-[var(--border)] px-3 py-2">
              <b className="block text-xs uppercase tracking-[0.12em] text-[var(--muted)]">Preco</b>
              {formatCurrency(item.price)}
            </span>
            <span className="rounded-md border border-[var(--border)] px-3 py-2">
              <b className="block text-xs uppercase tracking-[0.12em] text-[var(--muted)]">Reservado</b>
              {item.stats.requestedQuantity}
            </span>
            <span className="rounded-md border border-[var(--border)] px-3 py-2">
              <b className="block text-xs uppercase tracking-[0.12em] text-[var(--muted)]">Aguardando</b>
              {item.stats.pendingQuantity}
            </span>
            <span className="rounded-md border border-[var(--border)] px-3 py-2">
              <b className="block text-xs uppercase tracking-[0.12em] text-[var(--muted)]">A pedir</b>
              {item.stats.approvedQuantity}
            </span>
          </div>
          <p className="mt-3 text-xs text-[var(--muted)]">
            {item.expectedArrival ? `Chegada prevista: ${item.expectedArrival}` : "Sem chegada prevista"}
            {item.orderDeadline ? ` · Pedidos ate ${formatDate(item.orderDeadline)}` : ""}
          </p>
        </div>
      </div>
      <div className="grid gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3">
        <span className="text-xs font-black uppercase tracking-[0.14em] text-[var(--muted)]">Manutencao</span>
        <select
          disabled={isSubmitting}
          value={item.status}
          onChange={(event) => void updateStatus(event.target.value)}
          className="h-10 rounded-md border border-[var(--border)] bg-[var(--background)] px-3 text-sm outline-none focus:border-[var(--accent)] disabled:opacity-60"
        >
          {statusOptions.map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>
        <Link
          href={`/admin/pre-vendas/${item.id}`}
          className="inline-flex h-10 items-center justify-center rounded-md border border-[var(--border)] px-3 text-sm font-semibold text-[var(--foreground)] hover:bg-[var(--surface-strong)]"
        >
          Editar
        </Link>
        <Link
          href={`/admin/v2/pedidos?source=preorder&q=${encodeURIComponent(item.code)}`}
          className="inline-flex h-10 items-center justify-center rounded-md border border-[var(--border)] px-3 text-sm font-semibold text-[var(--foreground)] hover:bg-[var(--surface-strong)]"
        >
          Ver pedidos
        </Link>
        <button
          type="button"
          disabled={isSubmitting}
          onClick={() => void deleteItem()}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-red-300/30 px-3 text-sm font-semibold text-red-100 hover:bg-red-500/10 disabled:opacity-60"
        >
          <Trash2 size={15} aria-hidden="true" />
          Excluir
        </button>
        {isSubmitting ? <SmartButtonLoading message="Atualizando..." className="text-[var(--yellow)]" /> : null}
        {error ? <p className="text-xs font-semibold text-red-300">{error}</p> : null}
      </div>
    </article>
  );
}
