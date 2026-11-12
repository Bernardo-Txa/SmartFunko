"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Save, X } from "lucide-react";
import { SmartButtonLoading } from "@/components/ui/smart-loading";
import { formatPhoneNumber } from "@/lib/format";

type AccountCustomer = {
  address_complement: string | null;
  address_number: string | null;
  city: string | null;
  cpf: string | null;
  instagram: string | null;
  name: string;
  neighborhood: string | null;
  phone: string | null;
  postal_code: string | null;
  state: string | null;
  status?: string | null;
  street: string | null;
} | null;

type AddressFields = {
  city: string;
  neighborhood: string;
  state: string;
  street: string;
};

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

function formatPostalCode(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 8);
  return digits.length > 5 ? `${digits.slice(0, 5)}-${digits.slice(5)}` : digits;
}

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
  const [phoneInput, setPhoneInput] = useState(formatPhoneNumber(customer?.phone ?? ""));
  const [postalCode, setPostalCode] = useState(formatPostalCode(customer?.postal_code ?? ""));
  const [address, setAddress] = useState<AddressFields>({
    city: customer?.city ?? "",
    neighborhood: customer?.neighborhood ?? "",
    state: customer?.state ?? "",
    street: customer?.street ?? "",
  });
  const [isLookingUpPostalCode, setIsLookingUpPostalCode] = useState(false);
  const [postalCodeMessage, setPostalCodeMessage] = useState("");

  function resetAddress() {
    setPostalCode(formatPostalCode(customer?.postal_code ?? ""));
    setAddress({
      city: customer?.city ?? "",
      neighborhood: customer?.neighborhood ?? "",
      state: customer?.state ?? "",
      street: customer?.street ?? "",
    });
    setPostalCodeMessage("");
  }

  async function lookupPostalCode() {
    const digits = postalCode.replace(/\D/g, "");

    if (digits.length !== 8) {
      setPostalCodeMessage("Informe um CEP com 8 números.");
      return;
    }

    setIsLookingUpPostalCode(true);
    setPostalCodeMessage("");

    try {
      const response = await fetch(`/api/v1/postal-code/${digits}`, { cache: "no-store" });
      const body = (await response.json()) as { data?: AddressFields; error?: { message?: string } };

      if (!response.ok || !body.data) {
        setPostalCodeMessage(body.error?.message ?? "CEP não encontrado.");
        return;
      }

      setAddress(body.data);
      setPostalCodeMessage("Endereço encontrado. Confira os dados antes de salvar.");
    } catch {
      setPostalCodeMessage("Não foi possível consultar o CEP agora. Preencha manualmente.");
    } finally {
      setIsLookingUpPostalCode(false);
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");
    setIsSubmitting(true);

    try {
      const formData = new FormData(event.currentTarget);
      const response = await fetch("/api/v1/me", {
        body: JSON.stringify({
          address_complement: String(formData.get("address_complement") ?? ""),
          address_number: String(formData.get("address_number") ?? ""),
          city: address.city,
          cpf: String(formData.get("cpf") ?? ""),
          instagram: String(formData.get("instagram") ?? ""),
          name: String(formData.get("name") ?? ""),
          neighborhood: address.neighborhood,
          phone: phoneInput,
          postal_code: postalCode,
          state: address.state,
          street: address.street,
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
              setPhoneInput(formatPhoneNumber(customer.phone ?? ""));
              resetAddress();
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
            <dd className="text-[var(--muted)]">{formatPhoneNumber(customer.phone) || "Nao informado"}</dd>
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
          <div className="sm:col-span-2">
            <dt className="font-semibold text-[var(--foreground)]">Endereço</dt>
            <dd className="text-[var(--muted)]">
              {customer.street
                ? [
                    `${customer.street}${customer.address_number ? `, ${customer.address_number}` : ""}`,
                    customer.address_complement,
                    customer.neighborhood,
                    [customer.city, customer.state].filter(Boolean).join("/"),
                    customer.postal_code ? `CEP ${formatPostalCode(customer.postal_code)}` : null,
                  ].filter(Boolean).join(" · ")
                : "Não informado"}
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
                inputMode="tel"
                maxLength={15}
                value={phoneInput}
                onChange={(event) => setPhoneInput(formatPhoneNumber(event.target.value))}
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
          <fieldset className="grid gap-4 rounded-lg border border-[var(--border)] p-4">
            <legend className="px-2 text-sm font-bold text-[var(--foreground)]">Endereço</legend>
            <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-end">
              <label className="block flex-1">
                <span className="text-sm font-semibold text-[var(--foreground)]">CEP</span>
                <input name="postal_code" inputMode="numeric" maxLength={9} value={postalCode} onChange={(event) => { setPostalCode(formatPostalCode(event.target.value)); setPostalCodeMessage(""); }} onBlur={() => void lookupPostalCode()} placeholder="00000-000" className="mt-2 h-11 w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 text-sm outline-none focus:border-[var(--accent)]" />
              </label>
              <button type="button" disabled={isLookingUpPostalCode} onClick={() => void lookupPostalCode()} className="h-11 rounded-md border border-[var(--border)] px-4 text-sm font-bold text-[var(--foreground)] hover:border-[var(--accent)] disabled:opacity-60">
                {isLookingUpPostalCode ? "Buscando..." : "Buscar CEP"}
              </button>
            </div>
            {postalCodeMessage ? <p className="text-xs text-[var(--muted)]" aria-live="polite">{postalCodeMessage}</p> : null}
            <label className="block">
              <span className="text-sm font-semibold text-[var(--foreground)]">Logradouro</span>
              <input name="street" value={address.street} onChange={(event) => setAddress((current) => ({ ...current, street: event.target.value }))} className="mt-2 h-11 w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 text-sm outline-none focus:border-[var(--accent)]" />
            </label>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="text-sm font-semibold text-[var(--foreground)]">Número</span>
                <input name="address_number" defaultValue={customer.address_number ?? ""} className="mt-2 h-11 w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 text-sm outline-none focus:border-[var(--accent)]" />
              </label>
              <label className="block">
                <span className="text-sm font-semibold text-[var(--foreground)]">Complemento</span>
                <input name="address_complement" defaultValue={customer.address_complement ?? ""} placeholder="Opcional" className="mt-2 h-11 w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 text-sm outline-none focus:border-[var(--accent)]" />
              </label>
            </div>
            <label className="block">
              <span className="text-sm font-semibold text-[var(--foreground)]">Bairro</span>
              <input name="neighborhood" value={address.neighborhood} onChange={(event) => setAddress((current) => ({ ...current, neighborhood: event.target.value }))} className="mt-2 h-11 w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 text-sm outline-none focus:border-[var(--accent)]" />
            </label>
            <div className="grid gap-4 sm:grid-cols-[1fr_100px]">
              <label className="block">
                <span className="text-sm font-semibold text-[var(--foreground)]">Cidade</span>
                <input name="city" value={address.city} onChange={(event) => setAddress((current) => ({ ...current, city: event.target.value }))} className="mt-2 h-11 w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 text-sm outline-none focus:border-[var(--accent)]" />
              </label>
              <label className="block">
                <span className="text-sm font-semibold text-[var(--foreground)]">UF</span>
                <input name="state" maxLength={2} value={address.state} onChange={(event) => setAddress((current) => ({ ...current, state: event.target.value.toUpperCase().slice(0, 2) }))} className="mt-2 h-11 w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 text-sm uppercase outline-none focus:border-[var(--accent)]" />
              </label>
            </div>
          </fieldset>
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
                setPhoneInput(formatPhoneNumber(customer.phone ?? ""));
                resetAddress();
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
