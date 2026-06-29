"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Save, X } from "lucide-react";
import { SmartButtonLoading } from "@/components/ui/smart-loading";

type AccountCustomer = {
  cpf: string | null;
  instagram: string | null;
  name: string;
  phone: string | null;
  status?: string | null;
} | null;

type ApiResult = {
  error?: {
    message?: string;
  };
};

const customerStatusLabels: Record<string, string> = {
  active: "Ativo",
  blocked: "Bloqueado",
  vip: "VIP",
};

export function AccountProfileForm({
  customer,
  email,
  fallbackName,
}: {
  customer: AccountCustomer;
  email: string | null;
  fallbackName: string;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");
    setIsSubmitting(true);

    try {
      const formData = new FormData(event.currentTarget);
      const response = await fetch("/api/v1/me", {
        body: JSON.stringify({
          cpf: String(formData.get("cpf") ?? ""),
          instagram: String(formData.get("instagram") ?? ""),
          name: String(formData.get("name") ?? ""),
          phone: String(formData.get("phone") ?? ""),
        }),
        headers: { "content-type": "application/json" },
        method: "PATCH",
      });
      const payload = (await response.json().catch(() => ({}))) as ApiResult;

      if (!response.ok) {
        throw new Error(payload.error?.message ?? "Falha ao salvar dados");
      }

      setMessage("Dados atualizados.");
      setEditing(false);
      router.refresh();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Falha ao salvar dados");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!customer) {
    return (
      <section className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5 md:col-span-2">
        <h2 className="text-lg font-bold text-[var(--foreground)]">Cadastro</h2>
        <p className="mt-2 text-sm text-[var(--muted)]">
          Nenhum cadastro de cliente vinculado a este login ainda.
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5 md:col-span-2">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg font-bold text-[var(--foreground)]">Cadastro</h2>
          <p className="mt-1 text-sm text-[var(--muted)]">
            E-mail de login somente leitura aqui. Para alterar, use Segurança da conta.
          </p>
        </div>
        {!editing ? (
          <button
            type="button"
            onClick={() => {
              setEditing(true);
              setError("");
              setMessage("");
            }}
            className="inline-flex h-10 w-fit items-center justify-center gap-2 rounded-md border border-[var(--border)] px-3 text-sm font-semibold text-[var(--foreground)] hover:bg-[var(--surface-strong)]"
          >
            <Pencil size={16} aria-hidden="true" />
            Editar dados
          </button>
        ) : null}
      </div>

      {!editing ? (
        <dl className="mt-5 grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="font-semibold text-[var(--foreground)]">Nome</dt>
            <dd className="text-[var(--muted)]">{customer.name || fallbackName}</dd>
          </div>
          <div>
            <dt className="font-semibold text-[var(--foreground)]">E-mail</dt>
            <dd className="text-[var(--muted)]">{email ?? "Nao informado"}</dd>
          </div>
          <div>
            <dt className="font-semibold text-[var(--foreground)]">Telefone</dt>
            <dd className="text-[var(--muted)]">{customer.phone ?? "Nao informado"}</dd>
          </div>
          <div>
            <dt className="font-semibold text-[var(--foreground)]">CPF</dt>
            <dd className="text-[var(--muted)]">{customer.cpf ?? "Nao informado"}</dd>
          </div>
          <div>
            <dt className="font-semibold text-[var(--foreground)]">Instagram</dt>
            <dd className="text-[var(--muted)]">{customer.instagram ?? "Nao informado"}</dd>
          </div>
          <div>
            <dt className="font-semibold text-[var(--foreground)]">Status</dt>
            <dd className="text-[var(--muted)]">
              {customer.status ? customerStatusLabels[customer.status] ?? customer.status : "Nao informado"}
            </dd>
          </div>
        </dl>
      ) : (
        <form onSubmit={handleSubmit} className="mt-5 grid gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="text-sm font-semibold text-[var(--foreground)]">Nome</span>
              <input
                name="name"
                required
                defaultValue={customer.name || fallbackName}
                className="mt-2 h-11 w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 text-sm outline-none focus:border-[var(--accent)]"
              />
            </label>
            <label className="block">
              <span className="text-sm font-semibold text-[var(--foreground)]">E-mail</span>
              <input
                value={email ?? ""}
                readOnly
                className="mt-2 h-11 w-full cursor-not-allowed rounded-md border border-[var(--border)] bg-[var(--surface-strong)] px-3 text-sm text-[var(--muted)] outline-none"
              />
            </label>
            <label className="block">
              <span className="text-sm font-semibold text-[var(--foreground)]">Telefone</span>
              <input
                name="phone"
                defaultValue={customer.phone ?? ""}
                placeholder="(00) 00000-0000"
                className="mt-2 h-11 w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 text-sm outline-none focus:border-[var(--accent)]"
              />
            </label>
            <label className="block">
              <span className="text-sm font-semibold text-[var(--foreground)]">CPF</span>
              <input
                name="cpf"
                defaultValue={customer.cpf ?? ""}
                placeholder="000.000.000-00"
                className="mt-2 h-11 w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 text-sm outline-none focus:border-[var(--accent)]"
              />
            </label>
            <label className="block sm:col-span-2">
              <span className="text-sm font-semibold text-[var(--foreground)]">Instagram</span>
              <input
                name="instagram"
                defaultValue={customer.instagram ?? ""}
                placeholder="@seuperfil"
                className="mt-2 h-11 w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 text-sm outline-none focus:border-[var(--accent)]"
              />
            </label>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-[var(--accent)] px-4 text-sm font-black text-[#020617] hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? <SmartButtonLoading message="Salvando..." /> : <><Save size={16} aria-hidden="true" />Salvar alterações</>}
            </button>
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => {
                setEditing(false);
                setError("");
              }}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-[var(--border)] px-4 text-sm font-semibold text-[var(--foreground)] hover:bg-[var(--surface-strong)] disabled:cursor-not-allowed disabled:opacity-60"
            >
              <X size={16} aria-hidden="true" />
              Cancelar
            </button>
          </div>
        </form>
      )}

      {message ? <p className="mt-4 text-sm font-semibold text-emerald-200">{message}</p> : null}
      {error ? <p className="mt-4 text-sm font-semibold text-red-300">{error}</p> : null}
    </section>
  );
}
