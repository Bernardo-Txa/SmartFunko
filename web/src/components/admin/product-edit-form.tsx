"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, Plus, Save } from "lucide-react";
import { productVariantStatusOptions } from "@/lib/status-labels";

type Option = {
  id: string;
  name: string;
};

type ProductVariant = {
  condition: "new" | "used" | "damaged_box";
  estimated_cost: number | string | null;
  id: string;
  market_price: number | string | null;
  sale_price: number | string;
  sku: string;
  source: "own_stock" | "national" | "international" | "preorder";
  special_label: string | null;
  special_tags: string[] | null;
  status: "available" | "order_only" | "preorder" | "sold_out" | "hidden";
  type: "common" | "exclusive" | "chase" | "glow" | "special";
};

export type AdminProductEditData = {
  category_name: string | null;
  description: string | null;
  external_catalog_code: string | null;
  franchise_id: string | null;
  funko_number: string | null;
  id: string;
  main_image_url: string | null;
  name: string;
  product_variants?: ProductVariant[] | null;
  slug: string;
  status: "active" | "inactive" | "archived";
  subcategory_name: string | null;
  supplier_id: string | null;
};

type ApiPayload = {
  data?: {
    id?: string;
  };
  error?: {
    message?: string;
  };
};

const conditionOptions = [
  { label: "Novo", value: "new" },
  { label: "Usado", value: "used" },
  { label: "Caixa avariada", value: "damaged_box" },
] as const;

const typeOptions = [
  { label: "Comum", value: "common" },
  { label: "Exclusivo", value: "exclusive" },
  { label: "Chase", value: "chase" },
  { label: "Glow", value: "glow" },
  { label: "Especial", value: "special" },
] as const;

const sourceOptions = [
  { label: "Pronta-entrega", value: "own_stock" },
  { label: "Nacional", value: "national" },
  { label: "Importado", value: "international" },
  { label: "Pré-venda", value: "preorder" },
] as const;

function nullable(value: FormDataEntryValue | null) {
  const text = String(value ?? "").trim();
  return text || null;
}

function nullableNumber(value: FormDataEntryValue | null) {
  const text = String(value ?? "").trim();
  return text ? Number(text) : null;
}

function tagsFromForm(value: FormDataEntryValue | null) {
  return String(value ?? "")
    .split(/[|,]/)
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function SelectField({
  defaultValue,
  label,
  name,
  options,
}: {
  defaultValue?: string | null;
  label: string;
  name: string;
  options: ReadonlyArray<{ label: string; value: string }>;
}) {
  return (
    <label className="block">
      <span className="text-sm font-semibold text-[var(--foreground)]">{label}</span>
      <select
        name={name}
        defaultValue={defaultValue ?? ""}
        className="mt-2 h-11 w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 text-sm outline-none focus:border-[var(--accent)]"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function VariantForm({
  endpoint,
  method,
  onSaved,
  productId,
  variant,
}: {
  endpoint: string;
  method: "PATCH" | "POST";
  onSaved: (text: string) => void;
  productId?: string;
  variant?: ProductVariant;
}) {
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function submitVariant(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);
    const form = event.currentTarget;
    const formData = new FormData(form);
    const payload = {
      condition: String(formData.get("condition") ?? "new"),
      estimatedCost: nullableNumber(formData.get("estimatedCost")),
      marketPrice: nullableNumber(formData.get("marketPrice")),
      salePrice: Number(formData.get("salePrice") ?? 0),
      sku: String(formData.get("sku") ?? "").trim(),
      source: String(formData.get("source") ?? "own_stock"),
      specialLabel: nullable(formData.get("specialLabel")),
      specialTags: tagsFromForm(formData.get("specialTags")),
      status: String(formData.get("status") ?? "available"),
      type: String(formData.get("type") ?? "common"),
      ...(productId ? { productId } : {}),
    };

    try {
      const response = await fetch(endpoint, {
        body: JSON.stringify(payload),
        headers: { "content-type": "application/json" },
        method,
      });
      const body = (await response.json()) as ApiPayload;

      if (!response.ok) {
        throw new Error(body.error?.message ?? "Falha ao salvar variante");
      }

      if (method === "POST") {
        form.reset();
      }

      onSaved("Variante salva.");
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Falha ao salvar variante");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={submitVariant} className="grid gap-4 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4">
      <div className="grid gap-4 md:grid-cols-4">
        <label className="block">
          <span className="text-sm font-semibold text-[var(--foreground)]">SKU</span>
          <input
            name="sku"
            required
            defaultValue={variant?.sku ?? ""}
            className="mt-2 h-11 w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 text-sm outline-none focus:border-[var(--accent)]"
          />
        </label>
        <label className="block">
          <span className="text-sm font-semibold text-[var(--foreground)]">Preco de venda</span>
          <input
            name="salePrice"
            required
            min={0}
            step="0.01"
            type="number"
            defaultValue={variant?.sale_price ?? ""}
            className="mt-2 h-11 w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 text-sm outline-none focus:border-[var(--accent)]"
          />
        </label>
        <label className="block">
          <span className="text-sm font-semibold text-[var(--foreground)]">Preco de mercado</span>
          <input
            name="marketPrice"
            min={0}
            step="0.01"
            type="number"
            defaultValue={variant?.market_price ?? ""}
            className="mt-2 h-11 w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 text-sm outline-none focus:border-[var(--accent)]"
          />
        </label>
        <label className="block">
          <span className="text-sm font-semibold text-[var(--foreground)]">Custo estimado</span>
          <input
            name="estimatedCost"
            min={0}
            step="0.01"
            type="number"
            defaultValue={variant?.estimated_cost ?? ""}
            className="mt-2 h-11 w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 text-sm outline-none focus:border-[var(--accent)]"
          />
        </label>
      </div>
      <div className="grid gap-4 md:grid-cols-4">
        <SelectField defaultValue={variant?.condition ?? "new"} label="Condicao" name="condition" options={conditionOptions} />
        <SelectField defaultValue={variant?.type ?? "common"} label="Tipo" name="type" options={typeOptions} />
        <SelectField defaultValue={variant?.source ?? "own_stock"} label="Origem" name="source" options={sourceOptions} />
        <SelectField defaultValue={variant?.status ?? "available"} label="Status" name="status" options={productVariantStatusOptions} />
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <label className="block">
          <span className="text-sm font-semibold text-[var(--foreground)]">Special label</span>
          <input
            name="specialLabel"
            defaultValue={variant?.special_label ?? ""}
            className="mt-2 h-11 w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 text-sm outline-none focus:border-[var(--accent)]"
          />
        </label>
        <label className="block">
          <span className="text-sm font-semibold text-[var(--foreground)]">Special tags</span>
          <input
            name="specialTags"
            defaultValue={(variant?.special_tags ?? []).join(", ")}
            className="mt-2 h-11 w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 text-sm outline-none focus:border-[var(--accent)]"
          />
        </label>
      </div>
      {error ? <p className="text-sm font-semibold text-red-300">{error}</p> : null}
      <button
        disabled={isSubmitting}
        className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-md border border-[var(--border)] px-3 text-sm font-semibold text-[var(--foreground)] hover:bg-[var(--surface-strong)] disabled:cursor-not-allowed disabled:opacity-60 md:w-auto"
      >
        {method === "POST" ? <Plus size={16} aria-hidden="true" /> : <Save size={16} aria-hidden="true" />}
        {isSubmitting ? "Salvando..." : method === "POST" ? "Criar variante" : "Salvar variante"}
      </button>
    </form>
  );
}

export function ProductEditForm({
  franchises,
  product,
  suppliers,
}: {
  franchises: Option[];
  product: AdminProductEditData;
  suppliers: Option[];
}) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [imageUrl, setImageUrl] = useState(product.main_image_url ?? "");
  const [slug, setSlug] = useState(product.slug);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const canPreviewImage = /^https?:\/\//.test(imageUrl);

  function onSaved(text: string) {
    setError("");
    setMessage(text);
    router.refresh();
  }

  async function submitProduct(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);
    const payload = {
      categoryName: nullable(formData.get("categoryName")),
      description: nullable(formData.get("description")),
      externalCatalogCode: nullable(formData.get("externalCatalogCode")),
      franchiseId: nullable(formData.get("franchiseId")),
      funkoNumber: nullable(formData.get("funkoNumber")),
      mainImageUrl: nullable(formData.get("mainImageUrl")),
      name: String(formData.get("name") ?? "").trim(),
      slug: String(formData.get("slug") ?? "").trim(),
      status: String(formData.get("status") ?? "active"),
      subcategoryName: nullable(formData.get("subcategoryName")),
      supplierId: nullable(formData.get("supplierId")),
    };

    try {
      const response = await fetch(`/api/v1/admin/products/${product.id}`, {
        body: JSON.stringify(payload),
        headers: { "content-type": "application/json" },
        method: "PATCH",
      });
      const body = (await response.json()) as ApiPayload;

      if (!response.ok) {
        throw new Error(body.error?.message ?? "Falha ao salvar produto");
      }

      onSaved("Produto salvo.");
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Falha ao salvar produto");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="grid gap-6">
      <form onSubmit={submitProduct} className="grid gap-4 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-lg font-bold text-[var(--foreground)]">Dados do produto</h2>
            {slug !== product.slug ? (
              <p className="mt-1 text-sm text-[var(--muted)]">Alterar o slug muda a URL publica do produto.</p>
            ) : null}
          </div>
          <Link
            href={`/produto/${slug || product.slug}`}
            className="inline-flex h-10 items-center gap-2 rounded-md border border-[var(--border)] px-3 text-sm font-semibold text-[var(--foreground)] hover:bg-[var(--surface-strong)]"
          >
            <Eye size={16} aria-hidden="true" />
            Visualizar catalogo
          </Link>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <label className="block">
            <span className="text-sm font-semibold text-[var(--foreground)]">Nome</span>
            <input
              name="name"
              required
              defaultValue={product.name}
              className="mt-2 h-11 w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 text-sm outline-none focus:border-[var(--accent)]"
            />
          </label>
          <label className="block">
            <span className="text-sm font-semibold text-[var(--foreground)]">Slug</span>
            <input
              name="slug"
              required
              value={slug}
              onChange={(event) => setSlug(event.target.value)}
              className="mt-2 h-11 w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 text-sm outline-none focus:border-[var(--accent)]"
            />
          </label>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <label className="block">
            <span className="text-sm font-semibold text-[var(--foreground)]">Franquia</span>
            <select
              name="franchiseId"
              defaultValue={product.franchise_id ?? ""}
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
            <span className="text-sm font-semibold text-[var(--foreground)]">Fornecedor/marca</span>
            <select
              name="supplierId"
              defaultValue={product.supplier_id ?? ""}
              className="mt-2 h-11 w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 text-sm outline-none focus:border-[var(--accent)]"
            >
              <option value="">Sem fornecedor</option>
              {suppliers.map((supplier) => (
                <option key={supplier.id} value={supplier.id}>
                  {supplier.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-sm font-semibold text-[var(--foreground)]">Status</span>
            <select
              name="status"
              defaultValue={product.status}
              className="mt-2 h-11 w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 text-sm outline-none focus:border-[var(--accent)]"
            >
              <option value="active">Ativo</option>
              <option value="inactive">Inativo</option>
              <option value="archived">Arquivado</option>
            </select>
          </label>
          <label className="block">
            <span className="text-sm font-semibold text-[var(--foreground)]">Numero Funko</span>
            <input
              name="funkoNumber"
              defaultValue={product.funko_number ?? ""}
              className="mt-2 h-11 w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 text-sm outline-none focus:border-[var(--accent)]"
            />
          </label>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <label className="block">
            <span className="text-sm font-semibold text-[var(--foreground)]">Categoria</span>
            <input
              name="categoryName"
              defaultValue={product.category_name ?? ""}
              className="mt-2 h-11 w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 text-sm outline-none focus:border-[var(--accent)]"
            />
          </label>
          <label className="block">
            <span className="text-sm font-semibold text-[var(--foreground)]">Subcategoria</span>
            <input
              name="subcategoryName"
              defaultValue={product.subcategory_name ?? ""}
              className="mt-2 h-11 w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 text-sm outline-none focus:border-[var(--accent)]"
            />
          </label>
          <label className="block">
            <span className="text-sm font-semibold text-[var(--foreground)]">Codigo externo</span>
            <input
              name="externalCatalogCode"
              defaultValue={product.external_catalog_code ?? ""}
              className="mt-2 h-11 w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 text-sm outline-none focus:border-[var(--accent)]"
            />
          </label>
        </div>

        <div className="grid gap-4 md:grid-cols-[96px_1fr] md:items-end">
          <div className="relative flex aspect-square w-24 items-center justify-center overflow-hidden rounded-md border border-[var(--border)] bg-slate-950/60">
            {canPreviewImage ? (
              <Image src={imageUrl} alt={product.name} fill sizes="96px" className="object-contain p-2" />
            ) : (
              <span className="text-xs font-semibold text-[var(--muted)]">Sem imagem</span>
            )}
          </div>
          <label className="block">
            <span className="text-sm font-semibold text-[var(--foreground)]">Imagem principal URL</span>
            <input
              name="mainImageUrl"
              type="url"
              value={imageUrl}
              onChange={(event) => setImageUrl(event.target.value)}
              className="mt-2 h-11 w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 text-sm outline-none focus:border-[var(--accent)]"
            />
          </label>
        </div>

        <label className="block">
          <span className="text-sm font-semibold text-[var(--foreground)]">Descricao</span>
          <textarea
            name="description"
            defaultValue={product.description ?? ""}
            className="mt-2 min-h-28 w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
          />
        </label>

        {message ? <p className="text-sm font-semibold text-[var(--foreground)]">{message}</p> : null}
        {error ? <p className="text-sm font-semibold text-red-300">{error}</p> : null}
        <button
          disabled={isSubmitting}
          className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-[var(--accent)] px-4 text-sm font-black text-[#020617] hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60 md:w-auto"
        >
          <Save size={16} aria-hidden="true" />
          {isSubmitting ? "Salvando..." : "Salvar produto"}
        </button>
      </form>

      <section className="grid gap-4">
        <h2 className="text-lg font-bold text-[var(--foreground)]">Variantes</h2>
        {(product.product_variants ?? []).map((variant) => (
          <VariantForm
            key={variant.id}
            endpoint={`/api/v1/admin/product-variants/${variant.id}`}
            method="PATCH"
            onSaved={onSaved}
            variant={variant}
          />
        ))}
      </section>

      <section className="grid gap-4">
        <h2 className="text-lg font-bold text-[var(--foreground)]">Nova variante</h2>
        <VariantForm
          endpoint={`/api/v1/admin/products/${product.id}/variants`}
          method="POST"
          onSaved={onSaved}
          productId={product.id}
        />
      </section>
    </div>
  );
}
