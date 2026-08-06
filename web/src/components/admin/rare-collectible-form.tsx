"use client";

import { useMemo, useState, type ChangeEvent, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { ImagePlus, Save, Settings2 } from "lucide-react";
import { SmartButtonLoading } from "@/components/ui/smart-loading";
import { productTypeOptions } from "@/lib/product-types";
import type { RareCollectible } from "@/server/rare-collectibles/rare-collectible-service";

type FranchiseOption = {
  id: string;
  name: string;
  slug: string;
};

type Props = {
  franchises: FranchiseOption[];
  item?: RareCollectible;
};

function cleanText(value: FormDataEntryValue | null) {
  const text = String(value ?? "").trim();
  return text.length > 0 ? text : null;
}

function parseMoney(value: string) {
  const cleaned = value.replace(/[^\d,.-]/g, "").trim();
  const normalized = cleaned.includes(",") && cleaned.includes(".")
    ? cleaned.replace(/\./g, "").replace(",", ".")
    : cleaned.replace(",", ".");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

function parseInteger(value: FormDataEntryValue | null, fallback: number) {
  const parsed = Number(String(value ?? "").trim());
  return Number.isFinite(parsed) ? Math.trunc(parsed) : fallback;
}

function splitList(value: FormDataEntryValue | null) {
  return String(value ?? "")
    .split(/[|,]/)
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function normalizeWhatsAppUrl(value: FormDataEntryValue | null) {
  const text = String(value ?? "").trim();

  if (!text) {
    return null;
  }

  if (/^https?:\/\//i.test(text)) {
    return text;
  }

  const digits = text.replace(/\D/g, "");
  return digits ? `https://wa.me/${digits}` : text;
}

function moneyInputValue(value?: number | null) {
  return value ? String(value).replace(".", ",") : "";
}

async function readJson(response: Response) {
  try {
    return await response.json();
  } catch {
    return {};
  }
}

function Field({
  children,
  label,
}: {
  children: React.ReactNode;
  label: string;
}) {
  return (
    <label className="block min-w-0">
      <span className="text-sm font-bold text-[var(--foreground)]">{label}</span>
      {children}
    </label>
  );
}

const inputClassName =
  "mt-2 h-11 w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 text-sm text-[var(--foreground)] outline-none focus:border-amber-100/70";
const textareaClassName =
  "mt-2 w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)] outline-none focus:border-amber-100/70";

export function RareCollectibleForm({ franchises, item }: Props) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isEdit = Boolean(item);
  const selectedStatus = item?.status === "draft" ? "available" : item?.status ?? "available";
  const totalUploadSizeMb = useMemo(
    () => files.reduce((sum, file) => sum + file.size, 0) / 1024 / 1024,
    [files],
  );

  function onFilesSelected(event: ChangeEvent<HTMLInputElement>) {
    setFiles(Array.from(event.target.files ?? []));
  }

  async function uploadImages(productId: string) {
    for (const [index, file] of files.entries()) {
      const imageData = new FormData();
      imageData.append("file", file);
      imageData.append("setAsMain", String(index === 0 && !item?.coverImageUrl));

      const response = await fetch(`/api/v1/admin/products/${productId}/images`, {
        body: imageData,
        method: "POST",
      });
      const body = await readJson(response);

      if (!response.ok) {
        throw new Error(body.error?.message ?? `Falha ao enviar imagem ${index + 1}`);
      }
    }
  }

  function buildPayload(formData: FormData, forcedStatus?: string) {
    const status = forcedStatus ?? String(formData.get("status") ?? "available");
    const signerName = cleanText(formData.get("signerName"));
    const certificationSummary = cleanText(formData.get("certificationSummary"));
    const tags = splitList(formData.get("tags"));

    return {
      allowReservation: formData.get("allowReservation") === "on",
      authenticationCode: cleanText(formData.get("authenticationCode")),
      authenticationImageUrl: cleanText(formData.get("authenticationImageUrl")),
      autographDate: cleanText(formData.get("autographDate")),
      autographLocation: cleanText(formData.get("autographLocation")),
      authenticityNotes: certificationSummary,
      availabilityMessage: cleanText(formData.get("availabilityMessage")),
      badgeLabel: cleanText(formData.get("badgeLabel")) ?? "Autenticidade certificada",
      category: cleanText(formData.get("category")) ?? "Cultura Pop",
      certificateImageUrl: cleanText(formData.get("certificateImageUrl")),
      certificateType: cleanText(formData.get("certificateType")),
      certifierName: cleanText(formData.get("certifierName")),
      checkoutUrl: cleanText(formData.get("checkoutUrl")),
      collectibleYear: cleanText(formData.get("collectibleYear")),
      conditionNotes: cleanText(formData.get("conditionNotes")),
      coverImageUrl: cleanText(formData.get("coverImageUrl")),
      description: cleanText(formData.get("description")),
      displayOrder: parseInteger(formData.get("displayOrder"), 0),
      edition: cleanText(formData.get("edition")),
      franchiseId: cleanText(formData.get("franchiseId")),
      funkoNumber: cleanText(formData.get("funkoNumber")),
      includedItems: splitList(formData.get("includedItems")),
      installmentsMax: parseInteger(formData.get("installmentsMax"), 10),
      isFeatured: formData.get("isFeatured") === "on",
      isPublic: formData.getAll("isPublic").includes("on"),
      marketPrice: parseMoney(String(formData.get("marketPrice") ?? "")) || null,
      name: String(formData.get("name") ?? "").trim(),
      packagingImageUrl: cleanText(formData.get("packagingImageUrl")),
      productType: String(formData.get("productType") ?? "funko_pop"),
      publicVisibility: String(formData.get("publicVisibility") ?? "visible"),
      purchaseMode: String(formData.get("purchaseMode") ?? "whatsapp"),
      quantityAvailable: parseInteger(formData.get("quantityAvailable"), 1),
      reservationDays: formData.get("allowReservation") === "on"
        ? parseInteger(formData.get("reservationDays"), 2)
        : null,
      salePrice: parseMoney(String(formData.get("salePrice") ?? "")),
      seoDescription: cleanText(formData.get("seoDescription")),
      seoTitle: cleanText(formData.get("seoTitle")),
      serialImageUrl: cleanText(formData.get("serialImageUrl")),
      serialNumber: cleanText(formData.get("serialNumber")),
      shareImageUrl: cleanText(formData.get("shareImageUrl")),
      shortTitle: cleanText(formData.get("shortTitle")),
      signerName,
      signerRole: cleanText(formData.get("signerRole")),
      sku: cleanText(formData.get("sku")),
      slug: cleanText(formData.get("slug")),
      soldVisibility: String(formData.get("soldVisibility") ?? "visible"),
      status,
      story: cleanText(formData.get("story")),
      tags: Array.from(new Set([
        signerName ? "Autografado" : null,
        certificationSummary ? "Certificado" : null,
        ...tags,
      ].filter((tag): tag is string => Boolean(tag)))),
      verificationUrl: cleanText(formData.get("verificationUrl")),
      whatsappUrl: normalizeWhatsAppUrl(formData.get("whatsappUrl")),
    };
  }

  async function submitRareCollectible(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);
    const intendedStatus = String(formData.get("status") ?? "available");
    const hasMainImage = Boolean(cleanText(formData.get("coverImageUrl")) || item?.coverImageUrl || files.length > 0);
    const needsUploadBeforePublish = files.length > 0 && !item?.coverImageUrl && !cleanText(formData.get("coverImageUrl"));
    const firstPayloadStatus = needsUploadBeforePublish ? "draft" : intendedStatus;
    const payload = buildPayload(formData, firstPayloadStatus);

    try {
      if (payload.name.length < 2) {
        throw new Error("Informe o nome da peça.");
      }

      if (payload.salePrice <= 0) {
        throw new Error("Informe um preço maior que zero.");
      }

      if (intendedStatus !== "draft" && intendedStatus !== "archived") {
        if (!payload.description) {
          throw new Error("Descrição obrigatória para publicar.");
        }

        if (!hasMainImage) {
          throw new Error("Imagem principal obrigatória para publicar.");
        }
      }

      const response = await fetch(
        isEdit ? `/api/v1/admin/rare-collectibles/${item?.id}` : "/api/v1/admin/rare-collectibles",
        {
          body: JSON.stringify(payload),
          headers: { "content-type": "application/json" },
          method: isEdit ? "PATCH" : "POST",
        },
      );
      const body = await readJson(response);

      if (!response.ok) {
        throw new Error(body.error?.message ?? "Falha ao salvar Acervo Raro");
      }

      const saved = body.data as RareCollectible;

      if (files.length > 0) {
        await uploadImages(saved.productId);
      }

      if (needsUploadBeforePublish && intendedStatus !== "draft") {
        const publishResponse = await fetch(`/api/v1/admin/rare-collectibles/${saved.id}`, {
          body: JSON.stringify({ status: intendedStatus }),
          headers: { "content-type": "application/json" },
          method: "PATCH",
        });
        const publishBody = await readJson(publishResponse);

        if (!publishResponse.ok) {
          throw new Error(publishBody.error?.message ?? "Peça criada, mas publicação falhou");
        }
      }

      setMessage(isEdit ? "Peça atualizada." : "Peça criada.");
      router.push(`/admin/acervo-raro/${saved.id}`);
      router.refresh();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Falha ao salvar Acervo Raro");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={submitRareCollectible} className="rounded-lg border border-amber-200/20 bg-[var(--surface)] p-4">
      <div className="flex flex-col gap-3 border-b border-[var(--border)] pb-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-amber-100">Acervo Raro</p>
          <h2 className="mt-1 text-xl font-black text-[var(--foreground)]">
            {isEdit ? "Editar peça" : "Cadastro rápido"}
          </h2>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Preencha o essencial. Detalhes finos ficam opcionais.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <label className="inline-flex h-10 items-center gap-2 rounded-md border border-[var(--border)] px-3 text-sm font-bold text-[var(--foreground)]">
            <input name="isFeatured" type="checkbox" defaultChecked={item?.isFeatured ?? false} />
            No slideshow
          </label>
          <label className="inline-flex h-10 items-center gap-2 rounded-md border border-[var(--border)] px-3 text-sm font-bold text-[var(--foreground)]">
            <input name="isPublic" type="hidden" value="off" />
            <input name="isPublic" type="checkbox" defaultChecked={item?.isPublic ?? true} value="on" />
            Público
          </label>
        </div>
      </div>

      <section className="mt-5 grid gap-4">
        <div className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-[minmax(260px,1fr)_180px_170px_170px]">
          <Field label="Nome da peça">
            <input name="name" required defaultValue={item?.name ?? ""} placeholder="Funko Chucky autografado" className={inputClassName} />
          </Field>
          <Field label="Status">
            <select name="status" defaultValue={selectedStatus} className={inputClassName}>
              <option value="available">Disponível</option>
              <option value="reserved">Reservado</option>
              <option value="sold">Vendido</option>
              <option value="archived">Arquivado</option>
            </select>
          </Field>
          <Field label="Preço">
            <input name="salePrice" required inputMode="decimal" defaultValue={moneyInputValue(item?.price)} placeholder="3290,00" className={inputClassName} />
          </Field>
          <Field label="Parcelas">
            <input name="installmentsMax" type="number" min={1} max={24} defaultValue={item?.installmentsMax ?? 10} className={inputClassName} />
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-4">
          <Field label="Categoria">
            <select name="category" defaultValue={item?.category ?? "Cultura Pop"} className={inputClassName}>
              <option>Cinema e TV</option>
              <option>Esportes</option>
              <option>Música</option>
              <option>Cultura Pop</option>
              <option>Outros</option>
            </select>
          </Field>
          <Field label="Autografante">
            <input name="signerName" defaultValue={item?.signerName ?? ""} placeholder="Alex Vincent" className={inputClassName} />
          </Field>
          <Field label="Relevância">
            <input name="signerRole" defaultValue={item?.signerRole ?? ""} placeholder="Andy Barclay em Child's Play" className={inputClassName} />
          </Field>
          <Field label="Número Funko">
            <input name="funkoNumber" defaultValue={item?.funkoNumber ?? ""} placeholder="56" className={inputClassName} />
          </Field>
        </div>

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_260px] xl:items-end">
          <Field label="Imagem principal / galeria">
            <input
              name="images"
              type="file"
              multiple
              accept="image/jpeg,image/png,image/webp,image/avif"
              onChange={onFilesSelected}
              className="mt-2 w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)] file:mr-3 file:rounded-md file:border-0 file:bg-amber-200 file:px-3 file:py-2 file:text-xs file:font-black file:text-slate-950"
            />
          </Field>
          <div className="rounded-md border border-amber-200/18 bg-amber-200/8 px-3 py-2 text-xs font-semibold text-amber-100">
            {files.length} imagem(ns) · {totalUploadSizeMb.toFixed(2)}MB
          </div>
        </div>

        {item?.galleryImages.length ? (
          <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
            {item.galleryImages.map((image) => (
              <div key={image.id} className="flex min-w-0 items-center gap-2 rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-xs text-[var(--muted)]">
                <ImagePlus size={14} aria-hidden="true" className="shrink-0 text-amber-100" />
                <span className="truncate">{image.imageUrl}</span>
              </div>
            ))}
          </div>
        ) : null}

        <div className="grid gap-4 lg:grid-cols-2">
          <Field label="Descrição para venda">
            <textarea
              name="description"
              rows={6}
              defaultValue={item?.description ?? ""}
              placeholder="Texto direto que aparece na página da peça."
              className={textareaClassName}
            />
          </Field>
          <Field label="Autenticidade / itens inclusos">
            <textarea
              name="certificationSummary"
              rows={6}
              defaultValue={item?.authenticityNotes ?? ""}
              placeholder="Número de série, certificado internacional, código de autenticação, blister protetor..."
              className={textareaClassName}
            />
          </Field>
        </div>

        <Field label="Itens inclusos">
          <input
            name="includedItems"
            defaultValue={item?.includedItems.join(", ") ?? ""}
            placeholder="Número de série, certificado internacional, código de autenticação, blister protetor"
            className={inputClassName}
          />
        </Field>
      </section>

      <details className="mt-5 rounded-lg border border-[var(--border)] bg-[var(--background)]">
        <summary className="flex min-h-11 cursor-pointer items-center gap-2 px-3 text-sm font-black text-[var(--foreground)]">
          <Settings2 size={16} aria-hidden="true" />
          Campos opcionais / avançados
        </summary>
        <div className="grid gap-4 border-t border-[var(--border)] p-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Field label="Título curto">
              <input name="shortTitle" defaultValue={item?.shortTitle ?? ""} className={inputClassName} />
            </Field>
            <Field label="Slug">
              <input name="slug" defaultValue={item?.slug ?? ""} placeholder="automatico" className={inputClassName} />
            </Field>
            <Field label="SKU">
              <input name="sku" defaultValue={item?.sku ?? ""} placeholder="automatico" className={inputClassName} />
            </Field>
            <Field label="Selo">
              <input name="badgeLabel" defaultValue={item?.badgeLabel ?? "Autenticidade certificada"} className={inputClassName} />
            </Field>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Field label="Tipo de produto">
              <select name="productType" defaultValue={item?.productType ?? "funko_pop"} className={inputClassName}>
                {productTypeOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Franquia">
              <select name="franchiseId" defaultValue={item?.franchiseId ?? ""} className={inputClassName}>
                <option value="">Sem franquia</option>
                {franchises.map((franchise) => (
                  <option key={franchise.id} value={franchise.id}>
                    {franchise.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Ano">
              <input name="collectibleYear" defaultValue={item?.collectibleYear ?? ""} className={inputClassName} />
            </Field>
            <Field label="Edição">
              <input name="edition" defaultValue={item?.edition ?? ""} className={inputClassName} />
            </Field>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Field label="Número de série">
              <input name="serialNumber" defaultValue={item?.serialNumber ?? ""} placeholder="opcional" className={inputClassName} />
            </Field>
            <Field label="Certificadora">
              <input name="certifierName" defaultValue={item?.certifierName ?? ""} className={inputClassName} />
            </Field>
            <Field label="Tipo de certificado">
              <input name="certificateType" defaultValue={item?.certificateType ?? ""} className={inputClassName} />
            </Field>
            <Field label="Código de autenticação">
              <input name="authenticationCode" defaultValue={item?.authenticationCode ?? ""} placeholder="opcional" className={inputClassName} />
            </Field>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Field label="Link de verificação">
              <input name="verificationUrl" type="url" defaultValue={item?.verificationUrl ?? ""} className={inputClassName} />
            </Field>
            <Field label="Imagem de capa URL">
              <input name="coverImageUrl" type="url" defaultValue={item?.coverImageUrl ?? ""} className={inputClassName} />
            </Field>
            <Field label="Preço mercado/de">
              <input name="marketPrice" inputMode="decimal" defaultValue={moneyInputValue(item?.marketPrice)} className={inputClassName} />
            </Field>
            <Field label="Quantidade">
              <input name="quantityAvailable" type="number" min={0} defaultValue={item?.quantityAvailable ?? 1} className={inputClassName} />
            </Field>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Field label="Compra">
              <select name="purchaseMode" defaultValue={item?.purchaseMode ?? "whatsapp"} className={inputClassName}>
                <option value="whatsapp">WhatsApp</option>
                <option value="checkout">Link de checkout</option>
                <option value="manual">Manual</option>
              </select>
            </Field>
            <Field label="Checkout URL">
              <input name="checkoutUrl" type="url" defaultValue={item?.checkoutUrl ?? ""} className={inputClassName} />
            </Field>
            <Field label="WhatsApp URL ou número">
              <input name="whatsappUrl" defaultValue={item?.whatsappUrl ?? ""} className={inputClassName} />
            </Field>
            <Field label="Ordem">
              <input name="displayOrder" type="number" defaultValue={item?.displayOrder ?? 0} className={inputClassName} />
            </Field>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Field label="História / contexto extra">
              <textarea name="story" rows={4} defaultValue={item?.story ?? ""} className={textareaClassName} />
            </Field>
            <Field label="Estado de conservação">
              <textarea name="conditionNotes" rows={4} defaultValue={item?.conditionNotes ?? ""} className={textareaClassName} />
            </Field>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Field label="Foto do certificado">
              <input name="certificateImageUrl" type="url" defaultValue={item?.certificateImageUrl ?? ""} className={inputClassName} />
            </Field>
            <Field label="Foto do código">
              <input name="authenticationImageUrl" type="url" defaultValue={item?.authenticationImageUrl ?? ""} className={inputClassName} />
            </Field>
            <Field label="Foto da série">
              <input name="serialImageUrl" type="url" defaultValue={item?.serialImageUrl ?? ""} className={inputClassName} />
            </Field>
            <Field label="Foto da embalagem">
              <input name="packagingImageUrl" type="url" defaultValue={item?.packagingImageUrl ?? ""} className={inputClassName} />
            </Field>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Tags">
              <input name="tags" defaultValue={item?.tags.join(", ") ?? ""} className={inputClassName} />
            </Field>
            <Field label="Quando vendido">
              <select name="soldVisibility" defaultValue={item?.soldVisibility ?? "visible"} className={inputClassName}>
                <option value="visible">Continua visível com selo Vendido</option>
                <option value="hidden">Remove da página pública</option>
                <option value="archive">Move para histórico</option>
              </select>
            </Field>
          </div>

          <input name="publicVisibility" type="hidden" value={item?.publicVisibility ?? "visible"} />
          <input name="shareImageUrl" type="hidden" value={item?.shareImageUrl ?? ""} />
          <input name="seoTitle" type="hidden" value={item?.seoTitle ?? ""} />
          <input name="seoDescription" type="hidden" value={item?.seoDescription ?? ""} />
          <input name="allowReservation" type="hidden" value="" />
          <input name="reservationDays" type="hidden" value={item?.reservationDays ?? ""} />
          <input name="availabilityMessage" type="hidden" value={item?.availabilityMessage ?? ""} />
          <input name="autographDate" type="hidden" value={item?.autographDate ?? ""} />
          <input name="autographLocation" type="hidden" value={item?.autographLocation ?? ""} />
        </div>
      </details>

      {message ? (
        <p className="mt-5 rounded-md border border-emerald-300/25 bg-emerald-400/10 px-3 py-2 text-sm font-semibold text-emerald-200">
          {message}
        </p>
      ) : null}
      {error ? (
        <p className="mt-5 rounded-md border border-red-300/25 bg-red-500/10 px-3 py-2 text-sm font-semibold text-red-200">
          {error}
        </p>
      ) : null}

      <button
        disabled={isSubmitting}
        className="mt-5 inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-amber-200 px-4 text-sm font-black text-slate-950 hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-60 md:w-fit"
      >
        {isSubmitting ? (
          <SmartButtonLoading message="Salvando..." />
        ) : (
          <>
            <Save size={16} aria-hidden="true" />
            Salvar Acervo Raro
          </>
        )}
      </button>
    </form>
  );
}
