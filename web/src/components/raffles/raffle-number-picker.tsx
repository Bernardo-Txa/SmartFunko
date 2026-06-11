"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { clsx } from "clsx";
import { ExternalLink, Search, Ticket, X } from "lucide-react";
import { SmartButtonLoading } from "@/components/ui/smart-loading";
import { formatCurrency } from "@/lib/format";

type RaffleNumber = {
  id: string;
  label: string;
  number: number;
  status: string;
};

type ReservationResult = {
  numbers: string[];
  orderId: string;
  orderNumber: string;
  paymentLinkUrl: string | null;
  paymentStatus: "pending";
  reservedUntil: string;
  totalAmount: number;
};

export function RaffleNumberPicker({
  numbers,
  pricePerNumber,
  slug,
}: {
  numbers: RaffleNumber[];
  pricePerNumber: number;
  slug: string;
}) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [result, setResult] = useState<ReservationResult | null>(null);
  const [selected, setSelected] = useState<number[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const visibleNumbers = useMemo(() => {
    const trimmed = query.trim();
    const filtered = trimmed
      ? numbers.filter((item) => item.label.includes(trimmed) || String(item.number).includes(trimmed))
      : numbers;

    return filtered.slice(0, 300);
  }, [numbers, query]);

  function toggleNumber(number: RaffleNumber) {
    if (number.status !== "available") {
      return;
    }

    setSelected((current) =>
      current.includes(number.number)
        ? current.filter((item) => item !== number.number)
        : [...current, number.number].sort((first, second) => first - second),
    );
  }

  async function reserveNumbers() {
    setError("");
    setResult(null);
    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/v1/me/raffles/${slug}/reserve`, {
        body: JSON.stringify({ numbers: selected }),
        headers: { "content-type": "application/json" },
        method: "POST",
      });

      if (response.status === 401 || response.status === 403) {
        router.push(`/login?next=/rifas/${slug}`);
        return;
      }

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error?.message ?? "Falha ao reservar numeros");
      }

      setResult(payload.data);
      setSelected([]);
      router.refresh();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Falha ao reservar numeros");
    } finally {
      setIsSubmitting(false);
    }
  }

  const total = selected.length * pricePerNumber;

  return (
    <div className="grid gap-4">
      <div className="flex flex-col gap-3 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4 md:flex-row md:items-end md:justify-between">
        <label className="block md:w-72">
          <span className="text-sm font-semibold text-[var(--foreground)]">Buscar numero</span>
          <span className="mt-2 flex h-11 items-center gap-2 rounded-md border border-[var(--border)] bg-[var(--background)] px-3">
            <Search size={16} className="text-[var(--muted)]" aria-hidden="true" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              inputMode="numeric"
              placeholder="Ex.: 042"
              className="w-full bg-transparent text-sm outline-none"
            />
          </span>
        </label>
        <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-[var(--muted)]">
          <span className="rounded-md bg-emerald-500/15 px-2 py-1 text-emerald-100">Disponivel</span>
          <span className="rounded-md bg-yellow-300/18 px-2 py-1 text-yellow-100">Aguardando pagamento</span>
          <span className="rounded-md bg-slate-500/15 px-2 py-1 text-slate-300">Comprado</span>
          <span className="rounded-md bg-cyan-500/18 px-2 py-1 text-cyan-100">Selecionado</span>
        </div>
      </div>

      <div className="grid max-h-[36rem] grid-cols-4 gap-2 overflow-y-auto rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3 min-[390px]:grid-cols-5 sm:grid-cols-8 md:grid-cols-10 lg:grid-cols-12">
        {visibleNumbers.map((item) => {
          const isSelected = selected.includes(item.number);
          const isAvailable = item.status === "available";

          return (
            <button
              key={item.id}
              type="button"
              disabled={!isAvailable}
              onClick={() => toggleNumber(item)}
              className={clsx(
                "min-h-11 rounded-md border text-xs font-black transition",
                isSelected
                  ? "border-cyan-200 bg-cyan-300 text-slate-950"
                  : isAvailable
                    ? "border-emerald-300/35 bg-emerald-500/10 text-emerald-100 hover:bg-emerald-400/18"
                    : item.status === "winner"
                      ? "border-yellow-200/60 bg-yellow-300/25 text-yellow-100"
                      : "cursor-not-allowed border-slate-500/20 bg-slate-800/40 text-slate-500",
              )}
            >
              {item.label}
            </button>
          );
        })}
      </div>
      {visibleNumbers.length < numbers.filter((item) => !query.trim() || item.label.includes(query.trim()) || String(item.number).includes(query.trim())).length ? (
        <p className="text-xs text-[var(--muted)]">
          Mostrando 300 numeros. Use a busca para encontrar um numero especifico.
        </p>
      ) : null}

      <div className="sticky bottom-2 rounded-lg border border-cyan-300/28 bg-[#020617]/95 p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] shadow-[0_20px_54px_rgba(2,6,23,0.45)] backdrop-blur sm:bottom-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-semibold text-[var(--foreground)]">
              {selected.length} numero(s) selecionado(s)
            </p>
            <p className="mt-1 text-sm text-[var(--muted)]">
              Total {formatCurrency(total)}. A reserva fica pendente ate a confirmacao do pagamento.
            </p>
          </div>
          <button
            type="button"
            disabled={selected.length === 0 || isSubmitting}
            onClick={reserveNumbers}
            className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-[var(--yellow)] px-4 text-sm font-black text-[#020617] hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60 md:w-auto"
          >
            {isSubmitting ? (
              <SmartButtonLoading message="Reservando..." />
            ) : (
              <>
                <Ticket size={16} aria-hidden="true" />
                Reservar numeros
              </>
            )}
          </button>
        </div>
        {selected.length > 0 ? (
          <div className="mt-3 flex flex-wrap gap-2">
            {selected.map((number) => (
              <button
                key={number}
                type="button"
                onClick={() => setSelected((current) => current.filter((item) => item !== number))}
                className="inline-flex min-h-9 items-center gap-1 rounded-md bg-cyan-300 px-2 text-xs font-black text-slate-950"
              >
                {numbers.find((item) => item.number === number)?.label ?? number}
                <X size={12} aria-hidden="true" />
              </button>
            ))}
          </div>
        ) : null}
        {result ? (
          <div className="mt-3 rounded-md border border-emerald-300/35 bg-emerald-500/10 p-3 text-sm text-emerald-100">
            <p>
              Reserva {result.orderNumber} criada. Numeros {result.numbers.join(", ")} ficam reservados ate{" "}
              {new Date(result.reservedUntil).toLocaleString("pt-BR")}. Total {formatCurrency(result.totalAmount)}.
            </p>
            {result.paymentLinkUrl ? (
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <a
                  href={result.paymentLinkUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-[var(--yellow)] px-4 text-sm font-black text-[#020617] hover:brightness-110"
                >
                  <ExternalLink size={16} aria-hidden="true" />
                  Pagar agora
                </a>
                <span>Você pode pagar com Pix ou cartão pela InfinitePay.</span>
              </div>
            ) : (
              <p className="mt-2">
                O link automatico nao esta disponivel agora. Use a instrucao manual em /conta/rifas ou fale com o atendimento.
              </p>
            )}
          </div>
        ) : null}
        {error ? (
          <p className="mt-3 rounded-md border border-red-300/35 bg-red-500/10 p-3 text-sm font-semibold text-red-200">
            {error}
          </p>
        ) : null}
      </div>
    </div>
  );
}
