"use client";

import Image from "next/image";
import Link from "next/link";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowDown,
  ArrowUp,
  Eye,
  ImageIcon,
  Plus,
  Save,
  Star,
  Trash2,
  UploadCloud,
} from "lucide-react";
import { SmartButtonLoading } from "@/components/ui/smart-loading";
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

type ProductImage = {
  created_at?: string;
  id: string;
  image_url: string;
  product_id: string;
  sort_order: number;
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
  product_images?: ProductImage[] | null;
  product_variants?: ProductVariant[] | null;
  slug: string;
  status: "active" | "inactive" | "archived";
  subcategory_name: string | null;
  supplier_id: string | null;
};

type ApiPayload<T = { id?: string }> = {
  data?: T;
  error?: {
    message?: string;
  };
};

type ProductImageApi = {
  id: string;
  imageUrl: string;
  productId: string;
  sortOrder: number;
};

type ProductMainApi = {
  product?: {
    id: string;
    mainImageUrl: string | null;
  };
};

type ProductImageUploadApi = ProductMainApi & {
  image: ProductImageApi;
};

type ProductImagesApi = ProductMainApi & {
  images?: ProductImageApi[];
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

const allowedImageTypes = ["image/jpeg", "image/png", "image/webp", "image/avif"];
const maxImageSizeBytes = 5 * 1024 * 1024;

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

function sortProductImages(images: ProductImage[] | null | undefined) {
  return (images ?? [])
    .slice()
    .sort((first, second) => {
      if (first.sort_order !== second.sort_order) {
        return first.sort_order - second.sort_order;
      }

      return (first.created_at ?? "").localeCompare(second.created_at ?? "");
    });
}

function productImageFromApi(image: ProductImageApi): ProductImage {
  return {
    id: image.id,
    image_url: image.imageUrl,
    product_id: image.productId,
    sort_order: image.sortOrder,
  };
}

function validateClientImageFile(file: File) {
  if (!allowedImageTypes.includes(file.type)) {
    return "Tipo de imagem nao permitido.";
  }

  if (file.size > maxImageSizeBytes) {
    return "Imagem deve ter ate 5MB.";
  }

  return "";
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
        {isSubmitting ? (
          <SmartButtonLoading message="Salvando..." />
        ) : (
          <>
            {method === "POST" ? <Plus size={16} aria-hidden="true" /> : <Save size={16} aria-hidden="true" />}
            {method === "POST" ? "Criar variante" : "Salvar variante"}
          </>
        )}
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
  const uploadFormRef = useRef<HTMLFormElement | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [imageUrl, setImageUrl] = useState(product.main_image_url ?? "");
  const [productImages, setProductImages] = useState<ProductImage[]>(() =>
    sortProductImages(product.product_images),
  );
  const [selectedUploadFile, setSelectedUploadFile] = useState<File | null>(null);
  const [uploadAsMain, setUploadAsMain] = useState(true);
  const [imageMessage, setImageMessage] = useState("");
  const [imageError, setImageError] = useState("");
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [imageAction, setImageAction] = useState("");
  const [slug, setSlug] = useState(product.slug);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const canPreviewImage = /^https?:\/\//.test(imageUrl);
  const currentMainImageUrl = imageUrl.trim();

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

  function onUploadFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    setImageError("");
    setImageMessage("");

    if (!file) {
      setSelectedUploadFile(null);
      return;
    }

    const validationError = validateClientImageFile(file);

    if (validationError) {
      setSelectedUploadFile(null);
      setImageError(validationError);
      event.target.value = "";
      return;
    }

    setSelectedUploadFile(file);
  }

  async function submitImageUpload(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setImageError("");
    setImageMessage("");

    if (!selectedUploadFile) {
      setImageError("Selecione uma imagem.");
      return;
    }

    const validationError = validateClientImageFile(selectedUploadFile);

    if (validationError) {
      setImageError(validationError);
      return;
    }

    const formData = new FormData();
    formData.append("file", selectedUploadFile);
    formData.append("setAsMain", String(uploadAsMain));
    setIsUploadingImage(true);

    try {
      const response = await fetch(`/api/v1/admin/products/${product.id}/images`, {
        body: formData,
        method: "POST",
      });
      const body = (await response.json()) as ApiPayload<ProductImageUploadApi>;

      if (!response.ok || !body.data?.image) {
        throw new Error(body.error?.message ?? "Falha ao enviar imagem");
      }

      const uploadedImage = body.data.image;
      const uploadedProduct = body.data.product;

      setProductImages((currentImages) =>
        sortProductImages([...currentImages, productImageFromApi(uploadedImage)]),
      );

      if (uploadedProduct) {
        setImageUrl(uploadedProduct.mainImageUrl ?? "");
      }

      uploadFormRef.current?.reset();
      setSelectedUploadFile(null);
      setUploadAsMain(true);
      setImageMessage("Imagem enviada.");
      router.refresh();
    } catch (uploadError) {
      setImageError(uploadError instanceof Error ? uploadError.message : "Falha ao enviar imagem");
    } finally {
      setIsUploadingImage(false);
    }
  }

  async function defineMainImage(image: ProductImage) {
    setImageError("");
    setImageMessage("");
    setImageAction(`main:${image.id}`);

    try {
      const response = await fetch(
        `/api/v1/admin/products/${product.id}/images/${image.id}/main`,
        { method: "PATCH" },
      );
      const body = (await response.json()) as ApiPayload<ProductMainApi>;

      if (!response.ok || !body.data?.product) {
        throw new Error(body.error?.message ?? "Falha ao definir imagem principal");
      }

      const updatedProduct = body.data.product;

      setImageUrl(updatedProduct.mainImageUrl ?? "");
      setImageMessage("Imagem principal atualizada.");
      router.refresh();
    } catch (mainError) {
      setImageError(mainError instanceof Error ? mainError.message : "Falha ao definir imagem principal");
    } finally {
      setImageAction("");
    }
  }

  async function removeImage(image: ProductImage) {
    if (!window.confirm("Remover esta imagem da galeria?")) {
      return;
    }

    setImageError("");
    setImageMessage("");
    setImageAction(`delete:${image.id}`);

    try {
      const response = await fetch(
        `/api/v1/admin/products/${product.id}/images/${image.id}`,
        { method: "DELETE" },
      );
      const body = (await response.json()) as ApiPayload<ProductImagesApi>;

      if (!response.ok) {
        throw new Error(body.error?.message ?? "Falha ao remover imagem");
      }

      setProductImages(
        body.data?.images
          ? sortProductImages(body.data.images.map(productImageFromApi))
          : productImages.filter((productImage) => productImage.id !== image.id),
      );

      if (body.data?.product) {
        setImageUrl(body.data.product.mainImageUrl ?? "");
      }

      setImageMessage("Imagem removida.");
      router.refresh();
    } catch (deleteError) {
      setImageError(deleteError instanceof Error ? deleteError.message : "Falha ao remover imagem");
    } finally {
      setImageAction("");
    }
  }

  async function moveImage(index: number, direction: -1 | 1) {
    const targetIndex = index + direction;

    if (targetIndex < 0 || targetIndex >= productImages.length) {
      return;
    }

    const reordered = [...productImages];
    [reordered[index], reordered[targetIndex]] = [reordered[targetIndex], reordered[index]];
    const imageIds = reordered.map((image) => image.id);

    setImageError("");
    setImageMessage("");
    setImageAction("reorder");

    try {
      const response = await fetch(`/api/v1/admin/products/${product.id}/images/reorder`, {
        body: JSON.stringify({ imageIds }),
        headers: { "content-type": "application/json" },
        method: "PATCH",
      });
      const body = (await response.json()) as ApiPayload<ProductImagesApi>;

      if (!response.ok) {
        throw new Error(body.error?.message ?? "Falha ao reordenar imagens");
      }

      setProductImages(
        body.data?.images
          ? sortProductImages(body.data.images.map(productImageFromApi))
          : reordered.map((image, sortOrder) => ({ ...image, sort_order: sortOrder })),
      );
      setImageMessage("Ordem atualizada.");
      router.refresh();
    } catch (reorderError) {
      setImageError(reorderError instanceof Error ? reorderError.message : "Falha ao reordenar imagens");
    } finally {
      setImageAction("");
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
            <p className="mt-2 break-all text-xs text-[var(--muted)]">
              {currentMainImageUrl || "Sem URL principal"}
            </p>
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
          {isSubmitting ? (
            <SmartButtonLoading message="Salvando..." />
          ) : (
            <>
              <Save size={16} aria-hidden="true" />
              Salvar produto
            </>
          )}
        </button>
      </form>

      <section className="grid gap-5 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <h2 className="text-lg font-bold text-[var(--foreground)]">Imagens do produto</h2>
          <Link
            href={`/produto/${slug || product.slug}`}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-[var(--border)] px-3 text-sm font-semibold text-[var(--foreground)] hover:bg-[var(--surface-strong)]"
          >
            <Eye size={16} aria-hidden="true" />
            Ver no catalogo
          </Link>
        </div>

        <div className="grid gap-5 lg:grid-cols-[220px_1fr]">
          <div>
            <div className="relative flex aspect-[4/5] w-full items-center justify-center overflow-hidden rounded-md border border-[var(--border)] bg-slate-950/60">
              {canPreviewImage ? (
                <Image src={imageUrl} alt={product.name} fill sizes="220px" className="object-contain p-3" />
              ) : (
                <div className="grid justify-items-center gap-2 text-[var(--muted)]">
                  <ImageIcon size={26} aria-hidden="true" />
                  <span className="text-xs font-semibold">Sem imagem</span>
                </div>
              )}
            </div>
          </div>

          <div className="grid gap-4">
            <form
              ref={uploadFormRef}
              onSubmit={submitImageUpload}
              className="grid gap-4 rounded-lg border border-[var(--border)] bg-[var(--background)] p-4"
            >
              <div className="grid gap-4 md:grid-cols-[1fr_auto] md:items-end">
                <label className="block">
                  <span className="text-sm font-semibold text-[var(--foreground)]">Upload de imagem</span>
                  <input
                    name="file"
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/avif"
                    onChange={onUploadFileChange}
                    className="mt-2 w-full rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--foreground)] file:mr-3 file:rounded-md file:border-0 file:bg-[var(--accent)] file:px-3 file:py-2 file:text-xs file:font-black file:text-[#020617]"
                  />
                </label>
                <button
                  disabled={isUploadingImage || Boolean(imageAction)}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-[var(--accent)] px-4 text-sm font-black text-[#020617] hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isUploadingImage ? (
                    <SmartButtonLoading message="Enviando..." />
                  ) : (
                    <>
                      <UploadCloud size={16} aria-hidden="true" />
                      Enviar imagem
                    </>
                  )}
                </button>
              </div>
              <label className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--foreground)]">
                <input
                  type="checkbox"
                  checked={uploadAsMain}
                  onChange={(event) => setUploadAsMain(event.target.checked)}
                  className="h-4 w-4 rounded border-[var(--border)]"
                />
                Definir como principal
              </label>
              {selectedUploadFile ? (
                <p className="text-xs text-[var(--muted)]">
                  {selectedUploadFile.name} · {(selectedUploadFile.size / 1024 / 1024).toFixed(2)}MB
                </p>
              ) : null}
            </form>

            {imageMessage ? <p className="text-sm font-semibold text-[var(--foreground)]">{imageMessage}</p> : null}
            {imageError ? <p className="text-sm font-semibold text-red-300">{imageError}</p> : null}
          </div>
        </div>

        {productImages.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {productImages.map((image, index) => {
              const isMainImage = image.image_url === currentMainImageUrl;

              return (
                <div
                  key={image.id}
                  className="grid gap-3 rounded-lg border border-[var(--border)] bg-[var(--background)] p-3"
                >
                  <div className="relative flex aspect-square items-center justify-center overflow-hidden rounded-md border border-[var(--border)] bg-slate-950/60">
                    <Image
                      src={image.image_url}
                      alt={`${product.name} ${index + 1}`}
                      fill
                      sizes="(min-width: 1280px) 28vw, (min-width: 768px) 42vw, 100vw"
                      className="object-contain p-2"
                    />
                    {isMainImage ? (
                      <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-yellow-300 px-2 py-1 text-[10px] font-black uppercase text-slate-950">
                        <Star size={12} aria-hidden="true" />
                        Principal
                      </span>
                    ) : null}
                  </div>
                  <p className="line-clamp-2 break-all text-xs text-[var(--muted)]">{image.image_url}</p>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={isMainImage || isUploadingImage || Boolean(imageAction)}
                      onClick={() => defineMainImage(image)}
                      className="inline-flex h-9 items-center gap-2 rounded-md border border-[var(--border)] px-3 text-xs font-semibold text-[var(--foreground)] hover:bg-[var(--surface-strong)] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <Star size={14} aria-hidden="true" />
                      Principal
                    </button>
                    <button
                      type="button"
                      disabled={index === 0 || isUploadingImage || Boolean(imageAction)}
                      onClick={() => moveImage(index, -1)}
                      className="inline-flex h-9 items-center gap-2 rounded-md border border-[var(--border)] px-3 text-xs font-semibold text-[var(--foreground)] hover:bg-[var(--surface-strong)] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <ArrowUp size={14} aria-hidden="true" />
                      Subir
                    </button>
                    <button
                      type="button"
                      disabled={index === productImages.length - 1 || isUploadingImage || Boolean(imageAction)}
                      onClick={() => moveImage(index, 1)}
                      className="inline-flex h-9 items-center gap-2 rounded-md border border-[var(--border)] px-3 text-xs font-semibold text-[var(--foreground)] hover:bg-[var(--surface-strong)] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <ArrowDown size={14} aria-hidden="true" />
                      Descer
                    </button>
                    <button
                      type="button"
                      disabled={isUploadingImage || Boolean(imageAction)}
                      onClick={() => removeImage(image)}
                      className="inline-flex h-9 items-center gap-2 rounded-md border border-red-300/40 px-3 text-xs font-semibold text-red-200 hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <Trash2 size={14} aria-hidden="true" />
                      Remover
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-[var(--border)] bg-[var(--background)] p-4 text-sm text-[var(--muted)]">
            Nenhuma imagem na galeria.
          </div>
        )}
      </section>

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
