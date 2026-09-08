"use client";

import { useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  ExternalLink,
  ImagePlus,
  MonitorUp,
  Save,
  Smartphone,
  Trash2,
  Upload,
} from "lucide-react";
import type { HomeBanner, HomeBannerStatus } from "@/server/home-banners/home-banner-service";

const statusOptions: Array<{ label: string; value: HomeBannerStatus }> = [
  { label: "Ativo", value: "active" },
  { label: "Inativo", value: "inactive" },
  { label: "Arquivado", value: "archived" },
];

type ApiResponse<T> = {
  data?: T;
  error?: {
    message?: string;
  };
};

type UploadResponse = {
  imageUrl: string;
  path: string;
};

function parseDisplayOrder(value: string) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : 0;
}

async function readApiResponse<T>(response: Response) {
  const payload = (await response.json().catch(() => ({}))) as ApiResponse<T>;

  if (!response.ok) {
    throw new Error(payload.error?.message ?? "Falha ao salvar banner");
  }

  if (!payload.data) {
    throw new Error("Resposta invalida do servidor");
  }

  return payload.data;
}

async function uploadBannerFile(file: File) {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch("/api/v1/admin/home-banners/upload", {
    body: formData,
    method: "POST",
  });

  return readApiResponse<UploadResponse>(response);
}

function statusClassName(status: HomeBannerStatus) {
  if (status === "active") {
    return "border-emerald-300/35 bg-emerald-400/10 text-emerald-100";
  }

  if (status === "inactive") {
    return "border-slate-300/25 bg-slate-400/10 text-slate-300";
  }

  return "border-red-300/30 bg-red-400/10 text-red-100";
}

function BannerPreview({
  banner,
  className = "",
}: {
  banner: Pick<HomeBanner, "buttonLabel" | "eyebrow" | "imageUrl" | "linkUrl" | "subtitle" | "title">;
  className?: string;
}) {
  const hasOverlayCopy = Boolean(banner.eyebrow || banner.subtitle || banner.buttonLabel);

  return (
    <div className={`relative overflow-hidden rounded-lg border border-[var(--border)] bg-[#020617] ${className}`}>
      {banner.imageUrl ? (
        <div
          role="img"
          aria-label={banner.title || "Banner da home"}
          className="aspect-[48/13] w-full bg-cover bg-center"
          style={{ backgroundImage: `url("${banner.imageUrl}")` }}
        />
      ) : (
        <div className="grid aspect-[48/13] place-items-center border border-dashed border-cyan-200/20 text-cyan-100">
          <div className="text-center">
            <ImagePlus size={30} aria-hidden="true" className="mx-auto" />
            <span className="mt-2 block text-xs font-black uppercase tracking-[0.14em]">Sem banner</span>
          </div>
        </div>
      )}
      {hasOverlayCopy ? (
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950/84 via-slate-950/28 to-transparent p-4">
          {banner.eyebrow ? (
            <span className="inline-flex rounded-full border border-yellow-300/38 bg-slate-950/54 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-yellow-100">
              {banner.eyebrow}
            </span>
          ) : null}
          {banner.subtitle ? (
            <p className="mt-2 line-clamp-2 text-sm font-semibold leading-5 text-white">
              {banner.subtitle}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function BannerListItem({ banner }: { banner: HomeBanner }) {
  const router = useRouter();
  const [displayOrder, setDisplayOrder] = useState(String(banner.displayOrder));
  const [error, setError] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<HomeBannerStatus>(banner.status);
  const shouldOpenNewTab = banner.openInNewTab || (banner.linkUrl ? /^https?:\/\//i.test(banner.linkUrl) : false);

  async function updateBanner(input: Partial<Pick<HomeBanner, "displayOrder" | "status">>) {
    setError("");
    setMessage("");
    setIsSaving(true);

    try {
      const response = await fetch(`/api/v1/admin/home-banners/${banner.id}`, {
        body: JSON.stringify(input),
        headers: { "content-type": "application/json" },
        method: "PATCH",
      });

      await readApiResponse<HomeBanner>(response);
      setMessage("Atualizado.");
      router.refresh();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Falha ao atualizar banner");
    } finally {
      setIsSaving(false);
    }
  }

  async function saveAdjustments() {
    await updateBanner({
      displayOrder: parseDisplayOrder(displayOrder),
      status,
    });
  }

  async function deleteBanner() {
    const confirmed = window.confirm("Excluir este banner da home?");

    if (!confirmed) {
      return;
    }

    setError("");
    setMessage("");
    setIsDeleting(true);

    try {
      const response = await fetch(`/api/v1/admin/home-banners/${banner.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as ApiResponse<unknown>;
        throw new Error(payload.error?.message ?? "Falha ao excluir banner");
      }

      router.refresh();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Falha ao excluir banner");
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <article className="grid gap-4 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4 lg:grid-cols-[minmax(260px,420px)_minmax(0,1fr)_230px]">
      <BannerPreview banner={banner} />

      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span className={`rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.12em] ${statusClassName(banner.status)}`}>
            {statusOptions.find((option) => option.value === banner.status)?.label ?? banner.status}
          </span>
          {banner.linkUrl ? (
            <a
              href={banner.linkUrl}
              target={shouldOpenNewTab ? "_blank" : undefined}
              rel={shouldOpenNewTab ? "noreferrer" : undefined}
              className="inline-flex items-center gap-1 rounded-full border border-cyan-200/20 bg-cyan-300/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-cyan-100"
            >
              Link
              <ExternalLink size={11} aria-hidden="true" />
            </a>
          ) : null}
        </div>
        <h3 className="mt-3 text-lg font-black leading-tight text-[var(--foreground)]">{banner.title}</h3>
        {banner.subtitle ? (
          <p className="mt-2 line-clamp-2 text-sm leading-6 text-[var(--muted)]">{banner.subtitle}</p>
        ) : null}
        <dl className="mt-4 grid gap-2 text-xs text-[var(--muted)] sm:grid-cols-2">
          <div className="rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2">
            <dt className="font-black uppercase tracking-[0.12em]">Ordem</dt>
            <dd className="mt-1 text-[var(--foreground)]">{banner.displayOrder}</dd>
          </div>
          <div className="rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2">
            <dt className="font-black uppercase tracking-[0.12em]">Mobile</dt>
            <dd className="mt-1 text-[var(--foreground)]">{banner.mobileImageUrl ? "Com imagem" : "Usa desktop"}</dd>
          </div>
        </dl>
        {error ? <p className="mt-3 text-sm font-semibold text-red-200">{error}</p> : null}
        {message ? <p className="mt-3 text-sm font-semibold text-emerald-200">{message}</p> : null}
      </div>

      <div className="grid content-start gap-3 rounded-lg border border-[var(--border)] bg-[var(--background)] p-3">
        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[var(--muted)]">Manutencao</p>
        <label className="block">
          <span className="text-xs font-black uppercase tracking-[0.12em] text-[var(--muted)]">Status</span>
          <select
            value={status}
            onChange={(event) => setStatus(event.target.value as HomeBannerStatus)}
            className="mt-2 h-10 w-full rounded-md border border-[var(--border)] bg-[#030816] px-3 text-sm text-[var(--foreground)] outline-none focus:border-[var(--accent)]"
          >
            {statusOptions.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="text-xs font-black uppercase tracking-[0.12em] text-[var(--muted)]">Ordem</span>
          <input
            value={displayOrder}
            onChange={(event) => setDisplayOrder(event.target.value)}
            inputMode="numeric"
            className="mt-2 h-10 w-full rounded-md border border-[var(--border)] bg-[#030816] px-3 text-sm text-[var(--foreground)] outline-none focus:border-[var(--accent)]"
          />
        </label>
        <button
          type="button"
          onClick={saveAdjustments}
          disabled={isSaving}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-cyan-200/30 bg-cyan-300/10 px-3 text-sm font-black text-cyan-100 hover:bg-cyan-300/16 disabled:cursor-not-allowed disabled:opacity-55"
        >
          <Save size={16} aria-hidden="true" />
          {isSaving ? "Salvando..." : "Salvar ajuste"}
        </button>
        <button
          type="button"
          onClick={deleteBanner}
          disabled={isDeleting}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-red-300/35 bg-red-400/10 px-3 text-sm font-black text-red-100 hover:bg-red-400/16 disabled:cursor-not-allowed disabled:opacity-55"
        >
          <Trash2 size={16} aria-hidden="true" />
          {isDeleting ? "Excluindo..." : "Excluir"}
        </button>
      </div>
    </article>
  );
}

export function HomeBannerAdminPanel({
  initialBanners,
  loadError,
}: {
  initialBanners: HomeBanner[];
  loadError?: string;
}) {
  const router = useRouter();
  const [buttonLabel, setButtonLabel] = useState("");
  const [displayOrder, setDisplayOrder] = useState("0");
  const [error, setError] = useState("");
  const [eyebrow, setEyebrow] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");
  const [message, setMessage] = useState("");
  const [mobileImageFile, setMobileImageFile] = useState<File | null>(null);
  const [mobileImageUrl, setMobileImageUrl] = useState("");
  const [openInNewTab, setOpenInNewTab] = useState(false);
  const [subtitle, setSubtitle] = useState("");
  const [title, setTitle] = useState("");
  const previewBanner = useMemo(
    () => ({
      buttonLabel,
      eyebrow,
      imageUrl: imagePreview || imageUrl,
      linkUrl,
      subtitle,
      title: title || "Banner da home",
    }),
    [buttonLabel, eyebrow, imagePreview, imageUrl, linkUrl, subtitle, title],
  );

  function onImageFileChange(file: File | null) {
    setImageFile(file);

    if (file) {
      setImagePreview(URL.createObjectURL(file));
    } else {
      setImagePreview("");
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    setError("");
    setMessage("");
    setIsSubmitting(true);

    try {
      let desktopImageUrl = imageUrl.trim();
      let mobileUrl = mobileImageUrl.trim();

      if (imageFile) {
        const upload = await uploadBannerFile(imageFile);
        desktopImageUrl = upload.imageUrl;
      }

      if (mobileImageFile) {
        const upload = await uploadBannerFile(mobileImageFile);
        mobileUrl = upload.imageUrl;
      }

      if (!title.trim()) {
        throw new Error("Informe um nome para controle interno.");
      }

      if (!desktopImageUrl) {
        throw new Error("Suba uma imagem ou informe uma URL de banner.");
      }

      const response = await fetch("/api/v1/admin/home-banners", {
        body: JSON.stringify({
          buttonLabel,
          displayOrder: parseDisplayOrder(displayOrder),
          eyebrow,
          imageUrl: desktopImageUrl,
          linkUrl,
          mobileImageUrl: mobileUrl,
          openInNewTab,
          status: "active",
          subtitle,
          title,
        }),
        headers: { "content-type": "application/json" },
        method: "POST",
      });

      await readApiResponse<HomeBanner>(response);

      form.reset();
      setButtonLabel("");
      setDisplayOrder("0");
      setEyebrow("");
      setImageFile(null);
      setImagePreview("");
      setImageUrl("");
      setLinkUrl("");
      setMobileImageFile(null);
      setMobileImageUrl("");
      setOpenInNewTab(false);
      setSubtitle("");
      setTitle("");
      setMessage("Banner publicado na home.");
      router.refresh();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Falha ao criar banner");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="grid gap-6">
      {loadError ? (
        <div className="rounded-lg border border-yellow-300/30 bg-yellow-300/10 p-4 text-sm font-semibold text-yellow-100">
          {loadError}
        </div>
      ) : null}

      <section className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5">
        <div className="mb-5">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-[var(--yellow)]">Vitrine da home</p>
          <h2 className="mt-2 text-xl font-black text-[var(--foreground)]">Novo banner</h2>
          <p className="mt-1 text-sm leading-6 text-[var(--muted)]">
            Use uma arte larga, escolha o link de destino e publique. Texto por cima e imagem mobile sao opcionais.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_420px]">
          <div className="grid gap-4">
            <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_170px]">
              <label className="block">
                <span className="text-sm font-semibold text-[var(--foreground)]">Nome interno</span>
                <input
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  required
                  placeholder="Ex: Lancamento anime setembro"
                  className="mt-2 h-11 w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 text-sm outline-none focus:border-[var(--accent)]"
                />
              </label>
              <label className="block">
                <span className="text-sm font-semibold text-[var(--foreground)]">Ordem</span>
                <input
                  value={displayOrder}
                  onChange={(event) => setDisplayOrder(event.target.value)}
                  inputMode="numeric"
                  className="mt-2 h-11 w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 text-sm outline-none focus:border-[var(--accent)]"
                />
              </label>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="block">
                <span className="flex items-center gap-2 text-sm font-semibold text-[var(--foreground)]">
                  <MonitorUp size={16} aria-hidden="true" />
                  Imagem desktop
                </span>
                <input
                  type="file"
                  accept="image/avif,image/jpeg,image/png,image/webp"
                  onChange={(event) => onImageFileChange(event.target.files?.[0] ?? null)}
                  className="mt-2 block w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-[var(--yellow)] file:px-3 file:py-1.5 file:text-sm file:font-black file:text-slate-950"
                />
              </label>
              <label className="block">
                <span className="flex items-center gap-2 text-sm font-semibold text-[var(--foreground)]">
                  <Smartphone size={16} aria-hidden="true" />
                  Imagem mobile opcional
                </span>
                <input
                  type="file"
                  accept="image/avif,image/jpeg,image/png,image/webp"
                  onChange={(event) => setMobileImageFile(event.target.files?.[0] ?? null)}
                  className="mt-2 block w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-[var(--surface-strong)] file:px-3 file:py-1.5 file:text-sm file:font-black file:text-[var(--foreground)]"
                />
              </label>
            </div>

            <details className="rounded-lg border border-[var(--border)] bg-[var(--background)]">
              <summary className="flex min-h-11 cursor-pointer items-center gap-2 px-3 text-sm font-black text-[var(--foreground)]">
                <ImagePlus size={16} aria-hidden="true" className="text-[var(--accent)]" />
                URLs manuais
              </summary>
              <div className="grid gap-4 border-t border-[var(--border)] p-3">
                <label className="block">
                  <span className="text-sm font-semibold text-[var(--foreground)]">URL desktop</span>
                  <input
                    value={imageUrl}
                    onChange={(event) => setImageUrl(event.target.value)}
                    placeholder="https://..."
                    className="mt-2 h-11 w-full rounded-md border border-[var(--border)] bg-[#030816] px-3 text-sm outline-none focus:border-[var(--accent)]"
                  />
                </label>
                <label className="block">
                  <span className="text-sm font-semibold text-[var(--foreground)]">URL mobile</span>
                  <input
                    value={mobileImageUrl}
                    onChange={(event) => setMobileImageUrl(event.target.value)}
                    placeholder="https://..."
                    className="mt-2 h-11 w-full rounded-md border border-[var(--border)] bg-[#030816] px-3 text-sm outline-none focus:border-[var(--accent)]"
                  />
                </label>
              </div>
            </details>

            <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_190px]">
              <label className="block">
                <span className="text-sm font-semibold text-[var(--foreground)]">Link ao clicar</span>
                <input
                  value={linkUrl}
                  onChange={(event) => setLinkUrl(event.target.value)}
                  placeholder="/catalogo ou https://..."
                  className="mt-2 h-11 w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 text-sm outline-none focus:border-[var(--accent)]"
                />
              </label>
              <label className="mt-8 flex h-11 items-center gap-2 rounded-md border border-[var(--border)] bg-[var(--background)] px-3 text-sm font-semibold text-[var(--foreground)]">
                <input
                  type="checkbox"
                  checked={openInNewTab}
                  onChange={(event) => setOpenInNewTab(event.target.checked)}
                  className="h-4 w-4 rounded border-[var(--border)]"
                />
                Abrir nova aba
              </label>
            </div>

            <details className="rounded-lg border border-[var(--border)] bg-[var(--background)]">
              <summary className="flex min-h-11 cursor-pointer items-center gap-2 px-3 text-sm font-black text-[var(--foreground)]">
                <Upload size={16} aria-hidden="true" className="text-[var(--accent)]" />
                Texto opcional por cima do banner
              </summary>
              <div className="grid gap-4 border-t border-[var(--border)] p-3">
                <div className="grid gap-4 md:grid-cols-2">
                  <label className="block">
                    <span className="text-sm font-semibold text-[var(--foreground)]">Etiqueta</span>
                    <input
                      value={eyebrow}
                      onChange={(event) => setEyebrow(event.target.value)}
                      placeholder="Ex: Pre-venda aberta"
                      className="mt-2 h-11 w-full rounded-md border border-[var(--border)] bg-[#030816] px-3 text-sm outline-none focus:border-[var(--accent)]"
                    />
                  </label>
                  <label className="block">
                    <span className="text-sm font-semibold text-[var(--foreground)]">Botao visual</span>
                    <input
                      value={buttonLabel}
                      onChange={(event) => setButtonLabel(event.target.value)}
                      placeholder="Ex: Ver produtos"
                      className="mt-2 h-11 w-full rounded-md border border-[var(--border)] bg-[#030816] px-3 text-sm outline-none focus:border-[var(--accent)]"
                    />
                  </label>
                </div>
                <label className="block">
                  <span className="text-sm font-semibold text-[var(--foreground)]">Texto curto</span>
                  <textarea
                    value={subtitle}
                    onChange={(event) => setSubtitle(event.target.value)}
                    rows={3}
                    placeholder="Opcional. Use so quando a arte nao tiver chamada."
                    className="mt-2 w-full rounded-md border border-[var(--border)] bg-[#030816] px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
                  />
                </label>
              </div>
            </details>

            {error ? <p className="text-sm font-semibold text-red-200">{error}</p> : null}
            {message ? <p className="text-sm font-semibold text-emerald-200">{message}</p> : null}

            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex h-11 w-fit items-center justify-center gap-2 rounded-md bg-[var(--yellow)] px-5 text-sm font-black text-slate-950 shadow-[0_14px_30px_rgba(250,204,21,0.18)] hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Save size={17} aria-hidden="true" />
              {isSubmitting ? "Publicando..." : "Publicar banner"}
            </button>
          </div>

          <aside className="min-w-0 rounded-lg border border-[var(--border)] bg-[var(--background)] p-3 xl:self-start">
            <p className="mb-3 text-[10px] font-black uppercase tracking-[0.18em] text-[var(--muted)]">Preview</p>
            <BannerPreview banner={previewBanner} />
            <p className="mt-3 text-xs leading-5 text-[var(--muted)]">
              Ideal: arte horizontal em 1920x520. O preview usa a mesma proporcao exibida na home.
            </p>
          </aside>
        </form>
      </section>

      <section className="grid gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.16em] text-[var(--yellow)]">Banners cadastrados</p>
          <h2 className="mt-2 text-xl font-black text-[var(--foreground)]">Fila da home</h2>
        </div>
        {initialBanners.length > 0 ? (
          initialBanners.map((banner) => <BannerListItem key={banner.id} banner={banner} />)
        ) : (
          <div className="rounded-lg border border-dashed border-[var(--border)] bg-[var(--surface)] p-6 text-sm text-[var(--muted)]">
            Nenhum banner cadastrado ainda.
          </div>
        )}
      </section>
    </div>
  );
}
