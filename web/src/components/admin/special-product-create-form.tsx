"use client";

import { useMemo, useState, type ChangeEvent, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { ImagePlus, Sparkles, UploadCloud } from "lucide-react";
import { SmartButtonLoading } from "@/components/ui/smart-loading";
import { productTypeOptions } from "@/lib/product-types";

type FranchiseOption = {
  id: string;
  name: string;
  slug: string;
};

type SpecialKind = "signed" | "exclusive" | "chase" | "glow" | "special";

const specialKindOptions: Array<{
  label: string;
  specialLabel: string;
  tags: string[];
  type: "exclusive" | "chase" | "glow" | "special";
  value: SpecialKind;
}> = [
  {
    label: "Assinado",
    specialLabel: "Assinado",
    tags: ["Assinado"],
    type: "special",
    value: "signed",
  },
  {
    label: "Exclusivo",
    specialLabel: "Exclusivo",
    tags: ["Exclusivo"],
    type: "exclusive",
    value: "exclusive",
  },
  {
    label: "Chase",
    specialLabel: "Chase",
    tags: ["Chase"],
    type: "chase",
    value: "chase",
  },
  {
    label: "Glow",
    specialLabel: "Glow",
    tags: ["Glow"],
    type: "glow",
    value: "glow",
  },
  {
    label: "Especial",
    specialLabel: "Especial",
    tags: ["Especial"],
    type: "special",
    value: "special",
  },
];

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

function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function createSku(name: string, specialKind: SpecialKind) {
  const prefix = slugify(name)
    .split("-")
    .filter(Boolean)
    .slice(0, 4)
    .map((part) => part.slice(0, 4))
    .join("-")
    .toUpperCase();
  const suffix = Date.now().toString(36).toUpperCase();

  return `SFE-${specialKind.toUpperCase()}-${prefix || "ITEM"}-${suffix}`;
}

function splitTags(value: FormDataEntryValue | null) {
  return String(value ?? "")
    .split(/[|,]/)
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function buildDescription(formData: FormData) {
  const blocks = [
    ["Destaque", cleanText(formData.get("headline"))],
    ["Historia da peca", cleanText(formData.get("story"))],
    ["Descricao detalhada", cleanText(formData.get("description"))],
    ["Condicao e autenticidade", cleanText(formData.get("conditionNotes"))],
  ];

  return blocks
    .filter(([, value]) => Boolean(value))
    .map(([label, value]) => `${label}\n${value}`)
    .join("\n\n");
}

async function readJson(response: Response) {
  try {
    return await response.json();
  } catch {
    return {};
  }
}

export function SpecialProductCreateForm({
  franchises,
}: {
  franchises: FranchiseOption[];
}) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [nameDraft, setNameDraft] = useState("");
  const [priceDraft, setPriceDraft] = useState("");
  const [specialKind, setSpecialKind] = useState<SpecialKind>("signed");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const selectedSpecialKind = useMemo(
    () => specialKindOptions.find((option) => option.value === specialKind) ?? specialKindOptions[0],
    [specialKind],
  );
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
      imageData.append("setAsMain", String(index === 0));

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

  async function submitSpecial(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");
    setIsSubmitting(true);

    const form = event.currentTarget;
    const formData = new FormData(form);
    const name = String(formData.get("name") ?? "").trim();
    const salePrice = parseMoney(String(formData.get("salePrice") ?? ""));
    const marketPrice = parseMoney(String(formData.get("marketPrice") ?? ""));
    const manualSku = String(formData.get("sku") ?? "").trim();
    const sku = manualSku || createSku(name, specialKind);
    const productDescription = buildDescription(formData);
    const manualTags = splitTags(formData.get("specialTags"));
    const specialTags = Array.from(new Set([...selectedSpecialKind.tags, ...manualTags]));

    try {
      if (name.length < 2) {
        throw new Error("Informe o nome da peca especial.");
      }

      if (salePrice <= 0) {
        throw new Error("Informe um preco maior que zero.");
      }

      if (files.length === 0) {
        throw new Error("Envie ao menos uma imagem da peca especial.");
      }

      const slug = `${slugify(name)}-${Date.now().toString(36)}`;
      const productResponse = await fetch("/api/v1/admin/products", {
        body: JSON.stringify({
          categoryName: cleanText(formData.get("categoryName")) ?? "Especiais",
          description: productDescription || null,
          externalCatalogCode: cleanText(formData.get("externalCatalogCode")) ?? sku,
          franchiseId: cleanText(formData.get("franchiseId")),
          funkoNumber: cleanText(formData.get("funkoNumber")),
          mainImageUrl: null,
          name,
          productType: String(formData.get("productType") ?? "funko_pop"),
          slug,
          status: "active",
          subcategoryName: cleanText(formData.get("subcategoryName")),
          supplierId: null,
        }),
        headers: { "content-type": "application/json" },
        method: "POST",
      });
      const productBody = await readJson(productResponse);

      if (!productResponse.ok) {
        throw new Error(productBody.error?.message ?? "Falha ao criar especial");
      }

      const productId = productBody.data?.id;

      if (!productId) {
        throw new Error("Produto criado sem identificador.");
      }

      const variantResponse = await fetch(`/api/v1/admin/products/${productId}/variants`, {
        body: JSON.stringify({
          condition: "new",
          estimatedCost: null,
          marketPrice: marketPrice > 0 ? marketPrice : null,
          salePrice,
          sku,
          source: "own_stock",
          specialLabel: cleanText(formData.get("specialLabel")) ?? selectedSpecialKind.specialLabel,
          specialTags,
          status: "available",
          type: selectedSpecialKind.type,
        }),
        headers: { "content-type": "application/json" },
        method: "POST",
      });
      const variantBody = await readJson(variantResponse);

      if (!variantResponse.ok) {
        throw new Error(variantBody.error?.message ?? "Especial criado, mas preco/variante falhou");
      }

      await uploadImages(productId);

      setMessage("Especial criado. Abrindo manutencao completa...");
      router.push(`/admin/especiais/${productId}`);
      router.refresh();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Falha ao cadastrar especial");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={submitSpecial} className="grid gap-5 rounded-lg border border-yellow-300/24 bg-[var(--surface)] p-5">
      <div className="flex flex-col gap-3 border-b border-[var(--border)] pb-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="inline-flex items-center gap-2 rounded-full border border-yellow-300/30 bg-yellow-300/10 px-3 py-1 text-xs font-black uppercase tracking-[0.16em] text-yellow-200">
            <Sparkles size={14} aria-hidden="true" />
            Cadastro especial
          </p>
          <h2 className="mt-3 text-xl font-black text-[var(--foreground)]">Nova peca limitada</h2>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Cria a peca ja marcada para a aba de assinados e exclusivos.
          </p>
        </div>
        <div className="rounded-lg border border-yellow-300/18 bg-yellow-300/8 px-3 py-2 text-sm font-semibold text-yellow-100">
          {selectedSpecialKind.label}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(260px,1fr)_170px_160px_160px]">
        <label className="block">
          <span className="text-sm font-semibold text-[var(--foreground)]">Nome da peca</span>
          <input
            name="name"
            value={nameDraft}
            onChange={(event) => setNameDraft(event.target.value)}
            required
            placeholder="Ex: Funko autografado ..."
            className="mt-2 h-11 w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 text-sm outline-none focus:border-[var(--accent)]"
          />
        </label>
        <label className="block">
          <span className="text-sm font-semibold text-[var(--foreground)]">Tipo especial</span>
          <select
            name="specialKind"
            value={specialKind}
            onChange={(event) => setSpecialKind(event.target.value as SpecialKind)}
            className="mt-2 h-11 w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 text-sm outline-none focus:border-[var(--accent)]"
          >
            {specialKindOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="text-sm font-semibold text-[var(--foreground)]">Preco</span>
          <input
            name="salePrice"
            value={priceDraft}
            onChange={(event) => setPriceDraft(event.target.value)}
            required
            inputMode="decimal"
            placeholder="499,90"
            className="mt-2 h-11 w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 text-sm outline-none focus:border-[var(--accent)]"
          />
        </label>
        <label className="block">
          <span className="text-sm font-semibold text-[var(--foreground)]">Mercado</span>
          <input
            name="marketPrice"
            inputMode="decimal"
            placeholder="opcional"
            className="mt-2 h-11 w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 text-sm outline-none focus:border-[var(--accent)]"
          />
        </label>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <label className="block">
          <span className="text-sm font-semibold text-[var(--foreground)]">Produto</span>
          <select
            name="productType"
            defaultValue="funko_pop"
            className="mt-2 h-11 w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 text-sm outline-none focus:border-[var(--accent)]"
          >
            {productTypeOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="text-sm font-semibold text-[var(--foreground)]">Franquia</span>
          <select
            name="franchiseId"
            defaultValue=""
            className="mt-2 h-11 w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 text-sm outline-none focus:border-[var(--accent)]"
          >
            <option value="">Sem franquia</option>
            {franchises.map((franchise) => (
              <option key={franchise.id} value={franchise.id}>
                {franchise.name}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="text-sm font-semibold text-[var(--foreground)]">Numero Funko</span>
          <input
            name="funkoNumber"
            className="mt-2 h-11 w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 text-sm outline-none focus:border-[var(--accent)]"
          />
        </label>
        <label className="block">
          <span className="text-sm font-semibold text-[var(--foreground)]">Categoria</span>
          <input
            name="categoryName"
            defaultValue="Especiais"
            className="mt-2 h-11 w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 text-sm outline-none focus:border-[var(--accent)]"
          />
        </label>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <label className="block">
          <span className="text-sm font-semibold text-[var(--foreground)]">Linha / colecao</span>
          <input
            name="subcategoryName"
            placeholder="Ex: SDCC, assinatura, edicao limitada"
            className="mt-2 h-11 w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 text-sm outline-none focus:border-[var(--accent)]"
          />
        </label>
        <label className="block">
          <span className="text-sm font-semibold text-[var(--foreground)]">Selo principal</span>
          <input
            name="specialLabel"
            placeholder={selectedSpecialKind.specialLabel}
            className="mt-2 h-11 w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 text-sm outline-none focus:border-[var(--accent)]"
          />
        </label>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <label className="block">
          <span className="text-sm font-semibold text-[var(--foreground)]">Titulo de destaque</span>
          <textarea
            name="headline"
            rows={3}
            placeholder="O que torna essa peca unica?"
            className="mt-2 w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
          />
        </label>
        <label className="block">
          <span className="text-sm font-semibold text-[var(--foreground)]">Historia da peca</span>
          <textarea
            name="story"
            rows={3}
            placeholder="Contexto, evento, assinatura, origem ou raridade."
            className="mt-2 w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
          />
        </label>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <label className="block">
          <span className="text-sm font-semibold text-[var(--foreground)]">Descricao detalhada</span>
          <textarea
            name="description"
            rows={5}
            className="mt-2 w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
          />
        </label>
        <label className="block">
          <span className="text-sm font-semibold text-[var(--foreground)]">Condicao e autenticidade</span>
          <textarea
            name="conditionNotes"
            rows={5}
            placeholder="Caixa, certificado, detalhes da assinatura, avarias, observacoes."
            className="mt-2 w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
          />
        </label>
      </div>

      <details className="rounded-lg border border-[var(--border)] bg-[var(--background)]">
        <summary className="flex min-h-11 cursor-pointer items-center gap-2 px-3 text-sm font-black text-[var(--foreground)]">
          Campos internos e tags
        </summary>
        <div className="grid gap-4 border-t border-[var(--border)] p-3 md:grid-cols-3">
          <label className="block">
            <span className="text-sm font-semibold text-[var(--foreground)]">SKU</span>
            <input
              name="sku"
              placeholder="automatico"
              className="mt-2 h-11 w-full rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 text-sm outline-none focus:border-[var(--accent)]"
            />
          </label>
          <label className="block">
            <span className="text-sm font-semibold text-[var(--foreground)]">Codigo externo</span>
            <input
              name="externalCatalogCode"
              placeholder="usa SKU se vazio"
              className="mt-2 h-11 w-full rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 text-sm outline-none focus:border-[var(--accent)]"
            />
          </label>
          <label className="block">
            <span className="text-sm font-semibold text-[var(--foreground)]">Tags especiais</span>
            <input
              name="specialTags"
              placeholder="Autografado, Certificado, Limitado"
              className="mt-2 h-11 w-full rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 text-sm outline-none focus:border-[var(--accent)]"
            />
          </label>
        </div>
      </details>

      <section className="rounded-lg border border-[var(--border)] bg-[var(--background)] p-4">
        <div className="grid gap-4 md:grid-cols-[1fr_auto] md:items-end">
          <label className="block">
            <span className="text-sm font-semibold text-[var(--foreground)]">Galeria de imagens</span>
            <input
              name="images"
              type="file"
              multiple
              accept="image/jpeg,image/png,image/webp,image/avif"
              onChange={onFilesSelected}
              className="mt-2 w-full rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--foreground)] file:mr-3 file:rounded-md file:border-0 file:bg-[var(--accent)] file:px-3 file:py-2 file:text-xs file:font-black file:text-[#020617]"
            />
          </label>
          <div className="rounded-md border border-yellow-300/18 bg-yellow-300/8 px-3 py-2 text-xs font-semibold text-yellow-100">
            {files.length} imagem(ns) · {totalUploadSizeMb.toFixed(2)}MB
          </div>
        </div>
        {files.length > 0 ? (
          <div className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
            {files.map((file, index) => (
              <div
                key={`${file.name}-${file.size}-${index}`}
                className="flex min-w-0 items-center gap-2 rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-xs text-[var(--muted)]"
              >
                <ImagePlus size={15} aria-hidden="true" className="shrink-0 text-[var(--accent)]" />
                <span className="truncate">{file.name}</span>
                {index === 0 ? (
                  <span className="shrink-0 rounded-full bg-yellow-300 px-2 py-0.5 text-[10px] font-black uppercase text-slate-950">
                    principal
                  </span>
                ) : null}
              </div>
            ))}
          </div>
        ) : null}
      </section>

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
        className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-yellow-300 px-4 text-sm font-black text-[#020617] hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60 md:w-fit"
      >
        {isSubmitting ? (
          <SmartButtonLoading message="Criando especial..." />
        ) : (
          <>
            <UploadCloud size={16} aria-hidden="true" />
            Criar especial
          </>
        )}
      </button>
    </form>
  );
}
