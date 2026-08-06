"use client";

import Image from "next/image";
import { useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, ImagePlus, PackagePlus, Plus, Tag } from "lucide-react";
import { SmartButtonLoading } from "@/components/ui/smart-loading";
import { formatCurrency } from "@/lib/format";
import { getProductTypeLabel, productTypeOptions } from "@/lib/product-types";

type SupplierOption = {
  accent_color?: string | null;
  id: string;
  logo_url?: string | null;
  name: string;
  slug?: string;
};

const categorySuggestions = [
  "Funko Pop",
  "Boneco",
  "Cards",
  "Album",
  "HQ / Manga",
  "Acessorios",
  "Caixas protetoras",
  "Vestuario",
  "Jogos",
];

function cleanOptional(value: FormDataEntryValue | null) {
  const normalized = String(value ?? "").trim();
  return normalized.length > 0 ? normalized : null;
}

function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function parseMoney(value: string) {
  const cleaned = value.replace(/[^\d,.-]/g, "").trim();
  const normalized = cleaned.includes(",") && cleaned.includes(".")
    ? cleaned.replace(/\./g, "").replace(",", ".")
    : cleaned.replace(",", ".");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

function createSku(name: string, productType: string, supplier?: SupplierOption | null) {
  const supplierPrefix = slugify(supplier?.slug || supplier?.name || "smart")
    .split("-")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.slice(0, 4))
    .join("-")
    .toUpperCase();
  const namePrefix = slugify(name)
    .split("-")
    .filter(Boolean)
    .slice(0, 3)
    .map((part) => part.slice(0, 4))
    .join("-")
    .toUpperCase();
  const typePrefix = productType.replace(/[^a-z0-9]/gi, "").slice(0, 4).toUpperCase() || "ITEM";
  const suffix = Date.now().toString(36).toUpperCase();

  return `SF-${supplierPrefix || "GERAL"}-${typePrefix}-${namePrefix || "PROD"}-${suffix}`;
}

export function ProductCreateForm({
  defaultSupplierId = "",
  lockSupplier = false,
  selectedSupplier = null,
  suppliers = [],
}: {
  defaultSupplierId?: string;
  lockSupplier?: boolean;
  selectedSupplier?: SupplierOption | null;
  suppliers?: SupplierOption[];
}) {
  const router = useRouter();
  const currentSupplier = selectedSupplier ?? suppliers.find((supplier) => supplier.id === defaultSupplierId) ?? null;
  const catalogName = currentSupplier?.name ?? "Produtos gerais";
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [mainImagePreview, setMainImagePreview] = useState("");
  const [nameDraft, setNameDraft] = useState("");
  const [priceDraft, setPriceDraft] = useState("");
  const [productType, setProductType] = useState("funko_pop");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const canPreviewImage = /^https?:\/\//i.test(mainImagePreview);
  const parsedPrice = useMemo(() => parseMoney(priceDraft), [priceDraft]);
  const supplierId = lockSupplier ? defaultSupplierId : "";

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");
    setIsSubmitting(true);

    const form = event.currentTarget;
    const formData = new FormData(form);
    const name = String(formData.get("name") ?? "").trim();
    const salePrice = parseMoney(String(formData.get("salePrice") ?? ""));
    const manualSku = String(formData.get("sku") ?? "").trim();
    const generatedSku = manualSku || createSku(name, productType, currentSupplier);
    const externalCatalogCode = cleanOptional(formData.get("externalCatalogCode")) || generatedSku;
    const mainImageUrl = cleanOptional(formData.get("mainImageUrl"));

    try {
      if (name.length < 2) {
        throw new Error("Informe o nome do produto.");
      }

      if (salePrice <= 0) {
        throw new Error("Informe um preco maior que zero.");
      }

      const productResponse = await fetch("/api/v1/admin/products", {
        body: JSON.stringify({
          categoryName: cleanOptional(formData.get("categoryName")),
          description: cleanOptional(formData.get("description")),
          externalCatalogCode,
          franchiseId: null,
          funkoNumber: productType === "funko_pop" ? cleanOptional(formData.get("funkoNumber")) : null,
          mainImageUrl,
          name,
          productType,
          slug: cleanOptional(formData.get("slug")) ?? undefined,
          status: "active",
          subcategoryName: cleanOptional(formData.get("subcategoryName")),
          supplierId: supplierId || null,
        }),
        headers: { "content-type": "application/json" },
        method: "POST",
      });
      const productBody = await productResponse.json();

      if (!productResponse.ok) {
        throw new Error(productBody.error?.message ?? "Falha ao criar produto");
      }

      const variantResponse = await fetch(`/api/v1/admin/products/${productBody.data.id}/variants`, {
        body: JSON.stringify({
          condition: "new",
          estimatedCost: null,
          marketPrice: null,
          salePrice,
          sku: generatedSku,
          source: "own_stock",
          specialLabel: null,
          specialTags: [],
          status: "available",
          type: "common",
        }),
        headers: { "content-type": "application/json" },
        method: "POST",
      });
      const variantBody = await variantResponse.json();

      if (!variantResponse.ok) {
        throw new Error(variantBody.error?.message ?? "Produto criado, mas o preco principal falhou");
      }

      form.reset();
      setDescription("");
      setMainImagePreview("");
      setNameDraft("");
      setPriceDraft("");
      setProductType("funko_pop");
      setMessage(`Produto criado em ${catalogName}. SKU ${generatedSku}.`);
      router.refresh();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Falha ao criar produto");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5">
      <div className="grid gap-3 border-b border-[var(--border)] pb-4 md:grid-cols-[minmax(0,1fr)_280px] md:items-center">
        <div className="min-w-0">
          <h2 className="text-lg font-bold text-[var(--foreground)]">Novo produto</h2>
          <p className="mt-1 text-sm text-[var(--muted)]">Cadastro direto para o catalogo ativo.</p>
        </div>
        <div className="flex h-16 min-w-0 items-center gap-3 rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2">
          <div className="relative flex h-11 w-11 items-center justify-center overflow-hidden rounded-md border border-[var(--border)] bg-white p-1.5">
            {currentSupplier?.logo_url ? (
              <Image
                src={currentSupplier.logo_url}
                alt={currentSupplier.name}
                width={72}
                height={44}
                className="h-full w-full object-contain"
              />
            ) : (
              <PackagePlus size={20} aria-hidden="true" className="text-slate-700" />
            )}
          </div>
          <div className="min-w-0">
            <span className="block text-[10px] font-black uppercase tracking-[0.14em] text-[var(--muted)]">
              Catalogo
            </span>
            <strong className="block truncate text-sm text-[var(--foreground)]">{catalogName}</strong>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="mt-5 grid min-w-0 gap-5">
        <input type="hidden" name="supplierId" value={supplierId} />

        <div className="grid min-w-0 gap-5">
          <div className="grid gap-4 lg:grid-cols-[minmax(280px,1fr)_180px_160px]">
            <label className="block">
              <span className="text-sm font-semibold text-[var(--foreground)]">Nome</span>
              <input
                name="name"
                value={nameDraft}
                onChange={(event) => setNameDraft(event.target.value)}
                required
                placeholder="Ex: Funko Pop! NBA Michael Jordan"
                className="mt-2 h-11 w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 text-sm outline-none focus:border-[var(--accent)]"
              />
            </label>
            <label className="block">
              <span className="text-sm font-semibold text-[var(--foreground)]">Tipo</span>
              <select
                name="productType"
                value={productType}
                onChange={(event) => setProductType(event.target.value)}
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
              <span className="text-sm font-semibold text-[var(--foreground)]">Preco</span>
              <input
                name="salePrice"
                value={priceDraft}
                onChange={(event) => setPriceDraft(event.target.value)}
                required
                inputMode="decimal"
                placeholder="109,90"
                className="mt-2 h-11 w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 text-sm outline-none focus:border-[var(--accent)]"
              />
            </label>
          </div>

          <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_160px]">
            <label className="block">
              <span className="text-sm font-semibold text-[var(--foreground)]">Imagem URL</span>
              <input
                name="mainImageUrl"
                onChange={(event) => setMainImagePreview(event.target.value.trim())}
                type="url"
                placeholder="https://..."
                className="mt-2 h-11 w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 text-sm outline-none focus:border-[var(--accent)]"
              />
            </label>
            <label className="block">
              <span className="text-sm font-semibold text-[var(--foreground)]">
                {productType === "funko_pop" ? "Numero Funko" : "Referencia"}
              </span>
              <input
                name="funkoNumber"
                inputMode={productType === "funko_pop" ? "numeric" : "text"}
                disabled={productType !== "funko_pop"}
                placeholder={productType === "funko_pop" ? "" : "nao usado"}
                className="mt-2 h-11 w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 text-sm outline-none focus:border-[var(--accent)] disabled:cursor-not-allowed disabled:opacity-55"
              />
            </label>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="block">
              <span className="text-sm font-semibold text-[var(--foreground)]">Categoria</span>
              <input
                name="categoryName"
                list="product-category-suggestions"
                placeholder={getProductTypeLabel(productType)}
                className="mt-2 h-11 w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 text-sm outline-none focus:border-[var(--accent)]"
              />
              <datalist id="product-category-suggestions">
                {categorySuggestions.map((category) => (
                  <option key={category} value={category} />
                ))}
              </datalist>
            </label>
            <label className="block">
              <span className="text-sm font-semibold text-[var(--foreground)]">Linha / colecao</span>
              <input
                name="subcategoryName"
                placeholder="Ex: NBA, Marvel, Pokemon"
                className="mt-2 h-11 w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 text-sm outline-none focus:border-[var(--accent)]"
              />
            </label>
          </div>

          <label className="block">
            <span className="text-sm font-semibold text-[var(--foreground)]">Descricao</span>
            <textarea
              name="description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              rows={3}
              className="mt-2 w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
            />
          </label>

          <details className="rounded-lg border border-[var(--border)] bg-[var(--background)]">
            <summary className="flex min-h-11 cursor-pointer items-center gap-2 px-3 text-sm font-black text-[var(--foreground)]">
              <Tag size={16} aria-hidden="true" className="text-[var(--accent)]" />
              Campos opcionais
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
                <span className="text-sm font-semibold text-[var(--foreground)]">Codigo catalogo</span>
                <input
                  name="externalCatalogCode"
                  placeholder="usa SKU se vazio"
                  className="mt-2 h-11 w-full rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 text-sm outline-none focus:border-[var(--accent)]"
                />
              </label>
              <label className="block">
                <span className="text-sm font-semibold text-[var(--foreground)]">Slug</span>
                <input
                  name="slug"
                  placeholder="automatico"
                  className="mt-2 h-11 w-full rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 text-sm outline-none focus:border-[var(--accent)]"
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
            {isSubmitting ? (
              <SmartButtonLoading message="Criando..." />
            ) : (
              <>
                <Plus size={16} />
                Criar produto
              </>
            )}
          </button>
        </div>

        <aside className="grid min-w-0 gap-4 rounded-lg border border-[var(--border)] bg-[var(--background)] p-4 md:grid-cols-[180px_minmax(0,1fr)] md:items-center">
          <div className="relative flex h-44 items-center justify-center overflow-hidden rounded-lg border border-[var(--border)] bg-slate-950/70">
            {canPreviewImage ? (
              <Image
                src={mainImagePreview}
                alt="Preview do produto"
                fill
                unoptimized
                sizes="180px"
                className="object-contain p-3"
              />
            ) : (
              <div className="grid justify-items-center gap-2 text-center text-[var(--muted)]">
                <ImagePlus size={28} aria-hidden="true" />
                <span className="text-xs font-semibold">Sem imagem</span>
              </div>
            )}
          </div>
          <div className="grid min-w-0 gap-2">
            <span className="w-fit rounded-full border border-[var(--border)] px-2 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-[var(--muted)]">
              {getProductTypeLabel(productType)}
            </span>
            <strong className="truncate text-base text-[var(--foreground)]">
              {nameDraft.trim() || "Nome do produto"}
            </strong>
            <span className="text-sm font-black text-[var(--foreground)]">
              {parsedPrice > 0 ? formatCurrency(parsedPrice) : "R$ 0,00"}
            </span>
            <span className="text-xs text-[var(--muted)]">{catalogName}</span>
            {description.trim() ? (
              <p className="line-clamp-4 text-sm leading-6 text-[var(--muted)]">{description.trim()}</p>
            ) : null}
          </div>
          <div className="flex items-center gap-2 rounded-md border border-cyan-300/18 bg-cyan-300/8 px-3 py-2 text-xs font-semibold text-cyan-100 md:col-span-2">
            <CheckCircle2 size={15} aria-hidden="true" />
            Produto unico com preco principal.
          </div>
        </aside>
      </form>
    </section>
  );
}
