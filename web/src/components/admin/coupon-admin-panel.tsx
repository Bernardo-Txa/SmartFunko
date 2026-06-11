"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { BadgePercent, Power, Save } from "lucide-react";
import { SmartButtonLoading } from "@/components/ui/smart-loading";
import { formatCurrency, formatDate } from "@/lib/format";

export type DiscountCouponRow = {
  id: string;
  code: string;
  description: string | null;
  discount_type: "fixed" | "percent";
  value: number | string;
  max_discount: number | string | null;
  min_order_total: number | string;
  usage_limit: number | null;
  used_count: number;
  is_active: boolean;
  starts_at: string | null;
  expires_at: string | null;
};

type Props = {
  coupons: DiscountCouponRow[];
};

function nullableNumber(value: FormDataEntryValue | null) {
  const text = String(value ?? "").trim();
  return text ? Number(text) : null;
}

function nullableDate(value: FormDataEntryValue | null) {
  const text = String(value ?? "").trim();
  return text ? new Date(text).toISOString() : null;
}

function toPayload(formData: FormData) {
  return {
    code: String(formData.get("code") ?? "").trim(),
    description: String(formData.get("description") ?? "").trim() || null,
    discountType: String(formData.get("discountType") ?? "percent"),
    expiresAt: nullableDate(formData.get("expiresAt")),
    isActive: formData.get("isActive") === "on",
    maxDiscount: nullableNumber(formData.get("maxDiscount")),
    minOrderTotal: Number(formData.get("minOrderTotal") ?? 0),
    startsAt: nullableDate(formData.get("startsAt")),
    usageLimit: nullableNumber(formData.get("usageLimit")),
    value: Number(formData.get("value") ?? 0),
  };
}

function normalizeCouponCode(code: string) {
  return code
    .trim()
    .toUpperCase()
    .replaceAll(" ", "")
    .replace(/[^A-Z0-9_-]/g, "");
}

function formatCouponValue(coupon: DiscountCouponRow) {
  if (coupon.discount_type === "percent") {
    return `${Number(coupon.value).toLocaleString("pt-BR")}%`;
  }

  return formatCurrency(Number(coupon.value));
}

function formatUsage(coupon: DiscountCouponRow) {
  return coupon.usage_limit ? `${coupon.used_count}/${coupon.usage_limit}` : `${coupon.used_count}/sem limite`;
}

export function CouponAdminPanel({ coupons }: Props) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const activeCount = useMemo(() => coupons.filter((coupon) => coupon.is_active).length, [coupons]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    setError("");
    setMessage("");
    setIsSubmitting(true);

    try {
      const payload = toPayload(new FormData(form));
      const code = normalizeCouponCode(payload.code);

      if (coupons.some((coupon) => coupon.code === code)) {
        throw new Error("Ja existe um cupom com este codigo. Use outro codigo ou ative/desative o cupom existente.");
      }

      const response = await fetch("/api/v1/admin/coupons", {
        body: JSON.stringify({ ...payload, code }),
        headers: { "content-type": "application/json" },
        method: "POST",
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error?.message ?? "Falha ao criar cupom");
      }

      form.reset();
      setMessage("Cupom criado.");
      router.refresh();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Falha ao criar cupom");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function toggleCoupon(coupon: DiscountCouponRow) {
    setError("");
    setMessage("");

    try {
      const response = await fetch(`/api/v1/admin/coupons/${coupon.id}`, {
        body: JSON.stringify({ isActive: !coupon.is_active }),
        headers: { "content-type": "application/json" },
        method: "PATCH",
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error?.message ?? "Falha ao atualizar cupom");
      }

      setMessage("Cupom atualizado.");
      router.refresh();
    } catch (toggleError) {
      setError(toggleError instanceof Error ? toggleError.message : "Falha ao atualizar cupom");
    }
  }

  return (
    <div className="grid gap-5">
      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5">
          <span className="text-sm font-semibold text-[var(--muted)]">Cupons cadastrados</span>
          <strong className="mt-3 block text-2xl text-[var(--foreground)]">{coupons.length}</strong>
        </div>
        <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5">
          <span className="text-sm font-semibold text-[var(--muted)]">Ativos</span>
          <strong className="mt-3 block text-2xl text-[var(--foreground)]">{activeCount}</strong>
        </div>
        <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5">
          <span className="text-sm font-semibold text-[var(--muted)]">Usos registrados</span>
          <strong className="mt-3 block text-2xl text-[var(--foreground)]">
            {coupons.reduce((sum, coupon) => sum + coupon.used_count, 0)}
          </strong>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="grid gap-4 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5">
        <div className="flex items-center gap-2">
          <BadgePercent size={18} className="text-[var(--accent)]" aria-hidden="true" />
          <h2 className="text-lg font-bold text-[var(--foreground)]">Novo cupom</h2>
        </div>
        <div className="grid gap-4 md:grid-cols-4">
          <label className="block">
            <span className="text-sm font-semibold text-[var(--foreground)]">Código</span>
            <input
              name="code"
              required
              placeholder="SMART10"
              className="mt-2 h-11 w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 text-sm font-bold uppercase outline-none focus:border-[var(--accent)]"
            />
          </label>
          <label className="block">
            <span className="text-sm font-semibold text-[var(--foreground)]">Tipo</span>
            <select
              name="discountType"
              defaultValue="percent"
              className="mt-2 h-11 w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 text-sm outline-none focus:border-[var(--accent)]"
            >
              <option value="percent">Percentual</option>
              <option value="fixed">Valor fixo</option>
            </select>
          </label>
          <label className="block">
            <span className="text-sm font-semibold text-[var(--foreground)]">Valor</span>
            <input
              name="value"
              required
              min="0.01"
              step="0.01"
              type="number"
              className="mt-2 h-11 w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 text-sm outline-none focus:border-[var(--accent)]"
            />
          </label>
          <label className="block">
            <span className="text-sm font-semibold text-[var(--foreground)]">Desconto máximo</span>
            <input
              name="maxDiscount"
              min="0.01"
              step="0.01"
              type="number"
              className="mt-2 h-11 w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 text-sm outline-none focus:border-[var(--accent)]"
            />
          </label>
        </div>
        <div className="grid gap-4 md:grid-cols-4">
          <label className="block">
            <span className="text-sm font-semibold text-[var(--foreground)]">Pedido mínimo</span>
            <input
              name="minOrderTotal"
              min="0"
              step="0.01"
              type="number"
              defaultValue="0"
              className="mt-2 h-11 w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 text-sm outline-none focus:border-[var(--accent)]"
            />
          </label>
          <label className="block">
            <span className="text-sm font-semibold text-[var(--foreground)]">Limite de uso</span>
            <input
              name="usageLimit"
              min="1"
              type="number"
              className="mt-2 h-11 w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 text-sm outline-none focus:border-[var(--accent)]"
            />
          </label>
          <label className="block">
            <span className="text-sm font-semibold text-[var(--foreground)]">Início</span>
            <input
              name="startsAt"
              type="datetime-local"
              className="mt-2 h-11 w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 text-sm outline-none focus:border-[var(--accent)]"
            />
          </label>
          <label className="block">
            <span className="text-sm font-semibold text-[var(--foreground)]">Expiração</span>
            <input
              name="expiresAt"
              type="datetime-local"
              className="mt-2 h-11 w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 text-sm outline-none focus:border-[var(--accent)]"
            />
          </label>
        </div>
        <label className="block">
          <span className="text-sm font-semibold text-[var(--foreground)]">Descrição interna</span>
          <textarea
            name="description"
            className="mt-2 min-h-20 w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
          />
        </label>
        <label className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--foreground)]">
          <input name="isActive" type="checkbox" defaultChecked className="h-4 w-4 accent-[var(--accent)]" />
          Ativo
        </label>
        {message ? <p className="text-sm font-semibold text-[var(--foreground)]">{message}</p> : null}
        {error ? <p className="text-sm font-semibold text-red-300">{error}</p> : null}
        <button
          disabled={isSubmitting}
          className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-[var(--accent)] px-4 text-sm font-black text-[#020617] hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60 md:w-auto"
        >
          {isSubmitting ? (
            <SmartButtonLoading message="Criando..." />
          ) : (
            <>
              <Save size={16} aria-hidden="true" />
              Criar cupom
            </>
          )}
        </button>
      </form>

      <div className="overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--surface)]">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-[var(--border)] text-xs uppercase text-[var(--muted)]">
              <tr>
                <th className="px-4 py-3">Cupom</th>
                <th className="px-4 py-3">Desconto</th>
                <th className="px-4 py-3">Pedido mínimo</th>
                <th className="px-4 py-3">Uso</th>
                <th className="px-4 py-3">Validade</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {coupons.map((coupon) => (
                <tr key={coupon.id}>
                  <td className="px-4 py-3">
                    <strong className="text-[var(--foreground)]">{coupon.code}</strong>
                    {coupon.description ? (
                      <p className="mt-1 max-w-xs text-xs text-[var(--muted)]">{coupon.description}</p>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 text-[var(--foreground)]">
                    {formatCouponValue(coupon)}
                    {coupon.max_discount ? (
                      <span className="block text-xs text-[var(--muted)]">
                        Máx. {formatCurrency(Number(coupon.max_discount))}
                      </span>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 text-[var(--muted)]">
                    {formatCurrency(Number(coupon.min_order_total))}
                  </td>
                  <td className="px-4 py-3 text-[var(--muted)]">{formatUsage(coupon)}</td>
                  <td className="px-4 py-3 text-[var(--muted)]">
                    {coupon.starts_at ? formatDate(coupon.starts_at) : "Agora"}
                    {" - "}
                    {coupon.expires_at ? formatDate(coupon.expires_at) : "sem expiração"}
                  </td>
                  <td className="px-4 py-3">
                    <span className={coupon.is_active ? "text-emerald-300" : "text-[var(--muted)]"}>
                      {coupon.is_active ? "Ativo" : "Inativo"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => toggleCoupon(coupon)}
                      className="inline-flex h-9 items-center justify-center gap-2 rounded-md border border-[var(--border)] px-3 text-xs font-bold text-[var(--foreground)] hover:bg-[var(--surface-strong)]"
                    >
                      <Power size={14} aria-hidden="true" />
                      {coupon.is_active ? "Desativar" : "Ativar"}
                    </button>
                  </td>
                </tr>
              ))}
              {coupons.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-6 text-center text-sm text-[var(--muted)]">
                    Nenhum cupom cadastrado.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
