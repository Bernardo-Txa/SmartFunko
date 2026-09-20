"use client";

import { useMemo, useState } from "react";
import { Copy, MessageCircle, PackageCheck, Truck } from "lucide-react";
import { formatCurrency, formatPhoneNumber } from "@/lib/format";

type ShippingQuoteContext = {
  competenceLabel: string | null;
  customerName: string | null;
  customerPhone: string | null;
  noteTotal: number;
  orderCount: number;
  productSummary: string;
};

type ShippingQuoteOption = {
  carrierName: string;
  deliveryTime: number | null;
  error: string | null;
  id: string;
  price: number | null;
  serviceName: string;
};

type ApiResponse = {
  data?: {
    quotes?: ShippingQuoteOption[];
  };
  error?: {
    message?: string;
  };
};

type FormState = {
  fromPostalCode: string;
  height: string;
  insuranceValue: string;
  length: string;
  packagingFee: string;
  quantity: string;
  services: string;
  toPostalCode: string;
  useInsuranceValue: boolean;
  weight: string;
  width: string;
};

function digitsOnly(value: string | null | undefined) {
  return String(value ?? "").replace(/\D/g, "");
}

function normalizeWhatsAppPhone(value: string | null | undefined) {
  const digits = digitsOnly(value);

  if (digits.length === 10 || digits.length === 11) {
    return `55${digits}`;
  }

  return digits;
}

function decimalValue(value: string) {
  const parsed = Number(value.replace(",", "."));

  return Number.isFinite(parsed) ? parsed : 0;
}

function buildWhatsAppUrl(phone: string | null, message: string) {
  const digits = normalizeWhatsAppPhone(phone);

  if (!digits) {
    return null;
  }

  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}

function formatDeadline(value: number | null) {
  if (!value) {
    return "Prazo nao informado";
  }

  return `${value} dia(s) uteis`;
}

function buildShippingMessage(input: {
  context: ShippingQuoteContext;
  fromPostalCode: string;
  packagingFee: number;
  quote: ShippingQuoteOption;
  toPostalCode: string;
}) {
  const freight = input.quote.price ?? 0;
  const total = freight + input.packagingFee;
  const lines = [
    `Oi, ${input.context.customerName ?? "tudo bem"}! Segue a cotacao de frete Smart Funkos${input.context.competenceLabel ? ` do fechamento ${input.context.competenceLabel}` : ""}.`,
    `Pedidos: ${input.context.orderCount}`,
    `Itens: ${input.context.productSummary}`,
    `Origem: ${input.fromPostalCode}`,
    `Destino: ${input.toPostalCode}`,
    `Servico: ${input.quote.carrierName} - ${input.quote.serviceName}`,
    `Prazo: ${formatDeadline(input.quote.deliveryTime)}`,
    `Frete: ${formatCurrency(freight)}`,
    `Embalagem: ${formatCurrency(input.packagingFee)}`,
    `Total frete + embalagem: ${formatCurrency(total)}`,
  ];

  return lines.join("\n");
}

export function ShippingQuotePanel({
  context,
  defaultFromPostalCode,
  defaultServices,
}: {
  context: ShippingQuoteContext;
  defaultFromPostalCode: string;
  defaultServices: string;
}) {
  const [form, setForm] = useState<FormState>({
    fromPostalCode: defaultFromPostalCode,
    height: "18",
    insuranceValue: String(context.noteTotal || 0),
    length: "25",
    packagingFee: "0",
    quantity: "1",
    services: defaultServices,
    toPostalCode: "",
    useInsuranceValue: false,
    weight: "0.5",
    width: "18",
  });
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [quotes, setQuotes] = useState<ShippingQuoteOption[]>([]);
  const [selectedQuoteId, setSelectedQuoteId] = useState<string | null>(null);
  const selectedQuote = useMemo(
    () => quotes.find((quote) => quote.id === selectedQuoteId) ?? quotes.find((quote) => quote.price !== null) ?? null,
    [quotes, selectedQuoteId],
  );
  const packagingFee = decimalValue(form.packagingFee);
  const selectedTotal = selectedQuote?.price !== null && selectedQuote?.price !== undefined
    ? selectedQuote.price + packagingFee
    : null;
  const message = selectedQuote
    ? buildShippingMessage({
      context,
      fromPostalCode: form.fromPostalCode,
      packagingFee,
      quote: selectedQuote,
      toPostalCode: form.toPostalCode,
    })
    : "";
  const whatsappUrl = selectedQuote ? buildWhatsAppUrl(context.customerPhone, message) : null;

  function updateField(field: keyof FormState, value: string | boolean) {
    setForm((current) => ({ ...current, [field]: value }));
    setCopied(false);
  }

  async function submitQuote(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setCopied(false);
    setIsLoading(true);

    try {
      const response = await fetch("/api/v1/admin/shipping/superfrete/quote", {
        body: JSON.stringify({
          fromPostalCode: form.fromPostalCode,
          height: decimalValue(form.height),
          insuranceValue: decimalValue(form.insuranceValue),
          length: decimalValue(form.length),
          quantity: Number(form.quantity || 1),
          services: form.services,
          toPostalCode: form.toPostalCode,
          useInsuranceValue: form.useInsuranceValue,
          weight: decimalValue(form.weight),
          width: decimalValue(form.width),
        }),
        headers: { "content-type": "application/json" },
        method: "POST",
      });
      const payload = (await response.json()) as ApiResponse;

      if (!response.ok) {
        throw new Error(payload.error?.message ?? "Falha ao calcular frete");
      }

      const nextQuotes = payload.data?.quotes ?? [];
      setQuotes(nextQuotes);
      setSelectedQuoteId(nextQuotes.find((quote) => quote.price !== null)?.id ?? nextQuotes[0]?.id ?? null);
    } catch (requestError) {
      setQuotes([]);
      setSelectedQuoteId(null);
      setError(requestError instanceof Error ? requestError.message : "Falha ao calcular frete");
    } finally {
      setIsLoading(false);
    }
  }

  async function copyMessage() {
    if (!message) {
      return;
    }

    await navigator.clipboard.writeText(message);
    setCopied(true);
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
      <form onSubmit={submitQuote} className="grid gap-5 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5">
        <div>
          <span className="text-xs font-black uppercase tracking-[0.14em] text-[var(--yellow)]">Dados do pacote</span>
          <h2 className="mt-2 text-xl font-black text-[var(--foreground)]">Calcular SuperFrete</h2>
          <p className="mt-1 text-sm text-[var(--muted)]">Informe CEP, medidas e taxa de embalagem para montar a cobranca do envio.</p>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <label className="block">
            <span className="text-sm font-semibold text-[var(--foreground)]">CEP origem</span>
            <input
              value={form.fromPostalCode}
              onChange={(event) => updateField("fromPostalCode", event.target.value)}
              className="mt-2 h-11 w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 text-sm outline-none focus:border-[var(--accent)]"
              placeholder="00000-000"
            />
          </label>
          <label className="block">
            <span className="text-sm font-semibold text-[var(--foreground)]">CEP destino</span>
            <input
              value={form.toPostalCode}
              onChange={(event) => updateField("toPostalCode", event.target.value)}
              className="mt-2 h-11 w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 text-sm outline-none focus:border-[var(--accent)]"
              placeholder="00000-000"
            />
          </label>
        </div>

        <div className="grid gap-3 md:grid-cols-4">
          <label className="block">
            <span className="text-sm font-semibold text-[var(--foreground)]">Peso kg</span>
            <input
              type="number"
              min="0.01"
              step="0.01"
              value={form.weight}
              onChange={(event) => updateField("weight", event.target.value)}
              className="mt-2 h-11 w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 text-sm outline-none focus:border-[var(--accent)]"
            />
          </label>
          <label className="block">
            <span className="text-sm font-semibold text-[var(--foreground)]">Altura cm</span>
            <input
              type="number"
              min="1"
              step="1"
              value={form.height}
              onChange={(event) => updateField("height", event.target.value)}
              className="mt-2 h-11 w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 text-sm outline-none focus:border-[var(--accent)]"
            />
          </label>
          <label className="block">
            <span className="text-sm font-semibold text-[var(--foreground)]">Largura cm</span>
            <input
              type="number"
              min="1"
              step="1"
              value={form.width}
              onChange={(event) => updateField("width", event.target.value)}
              className="mt-2 h-11 w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 text-sm outline-none focus:border-[var(--accent)]"
            />
          </label>
          <label className="block">
            <span className="text-sm font-semibold text-[var(--foreground)]">Comprimento cm</span>
            <input
              type="number"
              min="1"
              step="1"
              value={form.length}
              onChange={(event) => updateField("length", event.target.value)}
              className="mt-2 h-11 w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 text-sm outline-none focus:border-[var(--accent)]"
            />
          </label>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          <label className="block">
            <span className="text-sm font-semibold text-[var(--foreground)]">Valor declarado</span>
            <input
              type="number"
              min="0"
              step="0.01"
              value={form.insuranceValue}
              onChange={(event) => updateField("insuranceValue", event.target.value)}
              className="mt-2 h-11 w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 text-sm outline-none focus:border-[var(--accent)]"
            />
          </label>
          <label className="block">
            <span className="text-sm font-semibold text-[var(--foreground)]">Taxa embalagem</span>
            <input
              type="number"
              min="0"
              step="0.01"
              value={form.packagingFee}
              onChange={(event) => updateField("packagingFee", event.target.value)}
              className="mt-2 h-11 w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 text-sm outline-none focus:border-[var(--accent)]"
            />
          </label>
          <label className="block">
            <span className="text-sm font-semibold text-[var(--foreground)]">Servicos</span>
            <input
              value={form.services}
              onChange={(event) => updateField("services", event.target.value)}
              className="mt-2 h-11 w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 text-sm outline-none focus:border-[var(--accent)]"
            />
          </label>
        </div>

        <label className="flex items-center gap-2 text-sm font-semibold text-[var(--foreground)]">
          <input
            type="checkbox"
            checked={form.useInsuranceValue}
            onChange={(event) => updateField("useInsuranceValue", event.target.checked)}
            className="h-4 w-4"
          />
          Incluir seguro pelo valor declarado
        </label>

        {error ? <p className="rounded-md border border-red-300/30 bg-red-400/10 p-3 text-sm font-semibold text-red-100">{error}</p> : null}

        <button
          disabled={isLoading}
          className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-[var(--accent)] px-4 text-sm font-black text-slate-950 hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60 md:w-fit"
        >
          <Truck size={16} aria-hidden="true" />
          {isLoading ? "Calculando..." : "Calcular frete"}
        </button>
      </form>

      <aside className="grid content-start gap-4 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5">
        <div>
          <span className="text-xs font-black uppercase tracking-[0.14em] text-[var(--yellow)]">Cliente</span>
          <h2 className="mt-2 text-xl font-black text-[var(--foreground)]">{context.customerName ?? "Frete avulso"}</h2>
          <p className="mt-1 text-sm text-[var(--muted)]">{formatPhoneNumber(context.customerPhone) || "Sem telefone"}</p>
        </div>

        <div className="grid gap-2 rounded-md border border-[var(--border)] bg-[var(--background)] p-3 text-sm">
          <div className="flex justify-between gap-3">
            <span className="text-[var(--muted)]">Pedidos</span>
            <strong className="text-[var(--foreground)]">{context.orderCount}</strong>
          </div>
          <div className="flex justify-between gap-3">
            <span className="text-[var(--muted)]">Valor da nota</span>
            <strong className="text-[var(--foreground)]">{formatCurrency(context.noteTotal)}</strong>
          </div>
          <p className="text-xs text-[var(--muted)]">{context.productSummary}</p>
        </div>

        {quotes.length > 0 ? (
          <div className="grid gap-2">
            <span className="text-xs font-black uppercase tracking-[0.12em] text-[var(--muted)]">Opcoes</span>
            {quotes.map((quote) => {
              const isSelected = selectedQuote?.id === quote.id;

              return (
                <button
                  key={quote.id}
                  type="button"
                  onClick={() => setSelectedQuoteId(quote.id)}
                  className={[
                    "rounded-md border p-3 text-left text-sm transition",
                    isSelected
                      ? "border-cyan-300/60 bg-cyan-300/10"
                      : "border-[var(--border)] bg-[var(--background)] hover:bg-[var(--surface-strong)]",
                  ].join(" ")}
                >
                  <span className="block font-black text-[var(--foreground)]">{quote.carrierName} - {quote.serviceName}</span>
                  <span className="mt-1 block text-xs text-[var(--muted)]">{formatDeadline(quote.deliveryTime)}</span>
                  <strong className="mt-2 block text-lg text-[var(--foreground)]">
                    {quote.price !== null ? formatCurrency(quote.price) : "Sem preco"}
                  </strong>
                  {quote.error ? <span className="mt-1 block text-xs font-semibold text-red-200">{quote.error}</span> : null}
                </button>
              );
            })}
          </div>
        ) : (
          <p className="rounded-md border border-[var(--border)] bg-[var(--background)] p-3 text-sm text-[var(--muted)]">
            Calcule para ver as opcoes de envio.
          </p>
        )}

        {selectedQuote ? (
          <div className="grid gap-2">
            <div className="rounded-md border border-emerald-300/35 bg-emerald-400/10 p-3">
              <span className="text-xs font-black uppercase tracking-[0.12em] text-emerald-100">Total a cobrar</span>
              <strong className="mt-2 block text-2xl text-[var(--foreground)]">
                {selectedTotal !== null ? formatCurrency(selectedTotal) : "Sem total"}
              </strong>
              <span className="mt-1 block text-xs text-[var(--muted)]">Frete + embalagem</span>
            </div>
            <button
              type="button"
              onClick={copyMessage}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-[var(--border)] px-3 text-sm font-semibold text-[var(--foreground)] hover:bg-[var(--surface-strong)]"
            >
              <Copy size={16} aria-hidden="true" />
              {copied ? "Copiado" : "Copiar cobranca"}
            </button>
            {whatsappUrl ? (
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-emerald-400/40 px-3 text-sm font-semibold text-emerald-200 hover:bg-emerald-400/10"
              >
                <MessageCircle size={16} aria-hidden="true" />
                Abrir WhatsApp
              </a>
            ) : null}
          </div>
        ) : null}

        <div className="rounded-md border border-[var(--border)] bg-[var(--background)] p-3 text-xs leading-5 text-[var(--muted)]">
          <PackageCheck className="mb-2" size={16} aria-hidden="true" />
          Esta tela calcula e monta a cobranca do frete. Ela ainda nao altera o valor dos pedidos nem cria checkout automaticamente.
        </div>
      </aside>
    </div>
  );
}
