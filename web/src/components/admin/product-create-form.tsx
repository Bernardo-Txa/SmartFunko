"use client";

import Image from "next/image";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";

type SupplierOption = {
  id: string;
  name: string;
};

export function ProductCreateForm({ suppliers = [] }: { suppliers?: SupplierOption[] }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [mainImagePreview, setMainImagePreview] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const canPreviewImage = /^https?:\/\//.test(mainImagePreview);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);
    const categoryName = String(formData.get("categoryName") ?? "").trim();
    const name = String(formData.get("name") ?? "");
    const description = String(formData.get("description") ?? "");
    const externalCatalogCode = String(formData.get("externalCatalogCode") ?? "").trim();
    const funkoNumber = String(formData.get("funkoNumber") ?? "").trim();
    const mainImageUrl = String(formData.get("mainImageUrl") ?? "").trim();
    const slug = String(formData.get("slug") ?? "").trim();
    const sku = String(formData.get("sku") ?? "");
    const subcategoryName = String(formData.get("subcategoryName") ?? "").trim();
    const supplierId = String(formData.get("supplierId") ?? "").trim();
    const salePrice = Number(formData.get("salePrice") ?? 0);
    const marketPrice = Number(formData.get("marketPrice") || 0);
    const estimatedCost = Number(formData.get("estimatedCost") || 0);
    const source = String(formData.get("source") ?? "national");
    const variantStatus = String(formData.get("status") ?? "order_only");
    const type = String(formData.get("type") ?? "common");
    const specialLabel = String(formData.get("specialLabel") ?? "").trim();
    const specialTags = String(formData.get("specialTags") ?? "")
      .split(/[|,]/)
      .map((entry) => entry.trim())
      .filter(Boolean);

    try {
      const productResponse = await fetch("/api/v1/admin/products", {
        body: JSON.stringify({
          categoryName: categoryName || null,
          description: description || null,
          externalCatalogCode: externalCatalogCode || sku || null,
          franchiseId: null,
          funkoNumber: funkoNumber || null,
          mainImageUrl: mainImageUrl || null,
          name,
          slug: slug || undefined,
          status: "active",
          subcategoryName: subcategoryName || null,
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
          estimatedCost: estimatedCost || null,
          marketPrice: marketPrice || null,
          salePrice,
          sku,
          source,
          specialLabel: specialLabel || null,
          specialTags,
          status: variantStatus,
          type,
        }),
        headers: { "content-type": "application/json" },
        method: "POST",
      });
      const variantBody = await variantResponse.json();

      if (!variantResponse.ok) {
        throw new Error(variantBody.error?.message ?? "Produto criado, mas variante falhou");
      }

      event.currentTarget.reset();
      setMainImagePreview("");
      setMessage("Produto e variante criados.");
      router.refresh();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Falha ao criar produto");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5">
      <h2 className="text-lg font-bold text-[var(--foreground)]">Novo produto rapido</h2>
      <form onSubmit={handleSubmit} className="mt-4 grid gap-4">
        <div className="grid gap-4 md:grid-cols-2">
          <label className="block">
            <span className="text-sm font-semibold text-[var(--foreground)]">Nome</span>
            <input
              name="name"
              required
              className="mt-2 h-11 w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 text-sm outline-none focus:border-[var(--accent)]"
            />
          </label>
          <label className="block">
            <span className="text-sm font-semibold text-[var(--foreground)]">Imagem URL</span>
            <input
              name="mainImageUrl"
              onChange={(event) => setMainImagePreview(event.target.value.trim())}
              type="url"
              className="mt-2 h-11 w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 text-sm outline-none focus:border-[var(--accent)]"
            />
          </label>
        </div>
        <div className="grid gap-4 md:grid-cols-5">
          <label className="block">
            <span className="text-sm font-semibold text-[var(--foreground)]">Slug</span>
            <input
              name="slug"
              placeholder="opcional"
              className="mt-2 h-11 w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 text-sm outline-none focus:border-[var(--accent)]"
            />
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
              className="mt-2 h-11 w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 text-sm outline-none focus:border-[var(--accent)]"
            />
          </label>
          <label className="block">
            <span className="text-sm font-semibold text-[var(--foreground)]">Linha</span>
            <input
              name="subcategoryName"
              className="mt-2 h-11 w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 text-sm outline-none focus:border-[var(--accent)]"
            />
          </label>
          <label className="block">
            <span className="text-sm font-semibold text-[var(--foreground)]">Fornecedor/marca</span>
            <select
              name="supplierId"
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
        </div>
        <div className="grid gap-3 rounded-lg border border-[var(--border)] bg-[var(--background)] p-3 md:grid-cols-[96px_1fr] md:items-center">
          <div className="relative flex aspect-square w-24 items-center justify-center overflow-hidden rounded-md border border-[var(--border)] bg-slate-950/60">
            {canPreviewImage ? (
              <Image
                src={mainImagePreview}
                alt="Preview do produto"
                fill
                sizes="96px"
                className="object-contain p-2"
              />
            ) : (
              <span className="text-xs font-semibold text-[var(--muted)]">Sem imagem</span>
            )}
          </div>
          <strong className="text-sm text-[var(--foreground)]">Preview da imagem principal</strong>
        </div>
        <label className="block">
          <span className="text-sm font-semibold text-[var(--foreground)]">Descricao</span>
          <textarea
            name="description"
            className="mt-2 min-h-20 w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
          />
        </label>
        <div className="grid gap-4 md:grid-cols-5">
          <label className="block">
            <span className="text-sm font-semibold text-[var(--foreground)]">SKU</span>
            <input
              name="sku"
              required
              className="mt-2 h-11 w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 text-sm outline-none focus:border-[var(--accent)]"
            />
          </label>
          <label className="block">
            <span className="text-sm font-semibold text-[var(--foreground)]">Preco</span>
            <input
              name="salePrice"
              required
              min={0}
              step="0.01"
              type="number"
              className="mt-2 h-11 w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 text-sm outline-none focus:border-[var(--accent)]"
            />
          </label>
          <label className="block">
            <span className="text-sm font-semibold text-[var(--foreground)]">Mercado</span>
            <input
              name="marketPrice"
              min={0}
              step="0.01"
              type="number"
              className="mt-2 h-11 w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 text-sm outline-none focus:border-[var(--accent)]"
            />
          </label>
          <label className="block">
            <span className="text-sm font-semibold text-[var(--foreground)]">Custo</span>
            <input
              name="estimatedCost"
              min={0}
              step="0.01"
              type="number"
              className="mt-2 h-11 w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 text-sm outline-none focus:border-[var(--accent)]"
            />
          </label>
          <label className="block">
            <span className="text-sm font-semibold text-[var(--foreground)]">Codigo catalogo</span>
            <input
              name="externalCatalogCode"
              className="mt-2 h-11 w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 text-sm outline-none focus:border-[var(--accent)]"
            />
          </label>
        </div>
        <div className="grid gap-4 md:grid-cols-4">
          <label className="block">
            <span className="text-sm font-semibold text-[var(--foreground)]">Origem</span>
            <select
              name="source"
              defaultValue="national"
              className="mt-2 h-11 w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 text-sm outline-none focus:border-[var(--accent)]"
            >
              <option value="own_stock">Pronta-entrega</option>
              <option value="national">Nacional</option>
              <option value="international">Importado</option>
              <option value="preorder">Pré-venda</option>
            </select>
          </label>
          <label className="block">
            <span className="text-sm font-semibold text-[var(--foreground)]">Tipo</span>
            <select
              name="type"
              defaultValue="common"
              className="mt-2 h-11 w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 text-sm outline-none focus:border-[var(--accent)]"
            >
              <option value="common">Comum</option>
              <option value="exclusive">Exclusivo</option>
              <option value="chase">Chase</option>
              <option value="glow">Glow</option>
              <option value="special">Especial</option>
            </select>
          </label>
          <label className="block">
            <span className="text-sm font-semibold text-[var(--foreground)]">Status</span>
            <select
              name="status"
              defaultValue="order_only"
              className="mt-2 h-11 w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 text-sm outline-none focus:border-[var(--accent)]"
            >
              <option value="available">Disponível</option>
              <option value="order_only">Sob encomenda</option>
              <option value="preorder">Pré-venda</option>
              <option value="sold_out">Esgotado</option>
              <option value="hidden">Oculto</option>
            </select>
          </label>
          <label className="block md:col-span-2">
            <span className="text-sm font-semibold text-[var(--foreground)]">Special</span>
            <input
              name="specialLabel"
              placeholder="Exclusivo"
              className="mt-2 h-11 w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 text-sm outline-none focus:border-[var(--accent)]"
            />
          </label>
          <label className="block md:col-span-2">
            <span className="text-sm font-semibold text-[var(--foreground)]">Tags special</span>
            <input
              name="specialTags"
              placeholder="Chase, Glow, Limitado"
              className="mt-2 h-11 w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 text-sm outline-none focus:border-[var(--accent)]"
            />
          </label>
        </div>
        {message ? <p className="text-sm font-semibold text-[var(--foreground)]">{message}</p> : null}
        {error ? <p className="text-sm font-semibold text-red-700">{error}</p> : null}
        <button
          disabled={isSubmitting}
          className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-[var(--accent)] px-4 text-sm font-black text-[#020617] hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60 md:w-auto"
        >
          <Plus size={16} />
          {isSubmitting ? "Criando..." : "Criar produto"}
        </button>
      </form>
    </section>
  );
}
