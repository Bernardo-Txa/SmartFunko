"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Save } from "lucide-react";
import { SmartButtonLoading } from "@/components/ui/smart-loading";

export type SupplierFormData = {
  accent_color: string | null;
  banner_url: string | null;
  description: string | null;
  id?: string;
  logo_url: string | null;
  name: string;
  slug: string;
  sort_order: number;
  status: "active" | "inactive" | "hidden";
  website_url: string | null;
};

type Props = {
  mode: "create" | "edit";
  supplier?: SupplierFormData;
};

function toPayload(formData: FormData) {
  return {
    accentColor: String(formData.get("accentColor") ?? "").trim() || null,
    bannerUrl: String(formData.get("bannerUrl") ?? "").trim() || null,
    description: String(formData.get("description") ?? "").trim() || null,
    logoUrl: String(formData.get("logoUrl") ?? "").trim() || null,
    name: String(formData.get("name") ?? "").trim(),
    slug: String(formData.get("slug") ?? "").trim() || undefined,
    sortOrder: Number(formData.get("sortOrder") ?? 0),
    status: String(formData.get("status") ?? "active"),
    websiteUrl: String(formData.get("websiteUrl") ?? "").trim() || null,
  };
}

export function SupplierForm({ mode, supplier }: Props) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");
    setIsSubmitting(true);

    try {
      const response = await fetch(
        mode === "edit" && supplier?.id
          ? `/api/v1/admin/suppliers/${supplier.id}`
          : "/api/v1/admin/suppliers",
        {
          body: JSON.stringify(toPayload(new FormData(event.currentTarget))),
          headers: { "content-type": "application/json" },
          method: mode === "edit" ? "PATCH" : "POST",
        },
      );
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error?.message ?? "Falha ao salvar fornecedor");
      }

      setMessage("Fornecedor salvo.");
      router.refresh();

      if (mode === "create") {
        router.push(`/admin/fornecedores/${payload.data.id}`);
      }
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Falha ao salvar fornecedor");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-4 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5">
      <div className="grid gap-4 md:grid-cols-2">
        <label className="block">
          <span className="text-sm font-semibold text-[var(--foreground)]">Nome</span>
          <input
            name="name"
            required
            defaultValue={supplier?.name ?? ""}
            className="mt-2 h-11 w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 text-sm outline-none focus:border-[var(--accent)]"
          />
        </label>
        <label className="block">
          <span className="text-sm font-semibold text-[var(--foreground)]">Slug</span>
          <input
            name="slug"
            defaultValue={supplier?.slug ?? ""}
            className="mt-2 h-11 w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 text-sm outline-none focus:border-[var(--accent)]"
          />
        </label>
      </div>
      <label className="block">
        <span className="text-sm font-semibold text-[var(--foreground)]">Descricao</span>
        <textarea
          name="description"
          defaultValue={supplier?.description ?? ""}
          className="mt-2 min-h-24 w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
        />
      </label>
      <div className="grid gap-4 md:grid-cols-2">
        <label className="block">
          <span className="text-sm font-semibold text-[var(--foreground)]">Logo URL</span>
          <input
            name="logoUrl"
            placeholder="/brand/piticas.webp ou https://..."
            defaultValue={supplier?.logo_url ?? ""}
            className="mt-2 h-11 w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 text-sm outline-none focus:border-[var(--accent)]"
          />
        </label>
        <label className="block">
          <span className="text-sm font-semibold text-[var(--foreground)]">Banner URL</span>
          <input
            name="bannerUrl"
            placeholder="/brand/banner.webp ou https://..."
            defaultValue={supplier?.banner_url ?? ""}
            className="mt-2 h-11 w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 text-sm outline-none focus:border-[var(--accent)]"
          />
        </label>
      </div>
      <div className="grid gap-4 md:grid-cols-4">
        <label className="block">
          <span className="text-sm font-semibold text-[var(--foreground)]">Cor de destaque</span>
          <input
            name="accentColor"
            placeholder="#00d4ff"
            defaultValue={supplier?.accent_color ?? ""}
            className="mt-2 h-11 w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 text-sm outline-none focus:border-[var(--accent)]"
          />
        </label>
        <label className="block">
          <span className="text-sm font-semibold text-[var(--foreground)]">Site</span>
          <input
            name="websiteUrl"
            type="url"
            defaultValue={supplier?.website_url ?? ""}
            className="mt-2 h-11 w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 text-sm outline-none focus:border-[var(--accent)]"
          />
        </label>
        <label className="block">
          <span className="text-sm font-semibold text-[var(--foreground)]">Ordem</span>
          <input
            name="sortOrder"
            type="number"
            defaultValue={supplier?.sort_order ?? 0}
            className="mt-2 h-11 w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 text-sm outline-none focus:border-[var(--accent)]"
          />
        </label>
        <label className="block">
          <span className="text-sm font-semibold text-[var(--foreground)]">Status</span>
          <select
            name="status"
            defaultValue={supplier?.status ?? "active"}
            className="mt-2 h-11 w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 text-sm outline-none focus:border-[var(--accent)]"
          >
            <option value="active">Ativo</option>
            <option value="inactive">Inativo</option>
            <option value="hidden">Oculto</option>
          </select>
        </label>
      </div>
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
            Salvar fornecedor
          </>
        )}
      </button>
    </form>
  );
}
