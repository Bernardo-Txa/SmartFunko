"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertTriangle, CheckCircle2, ExternalLink, FileText, KeyRound, RefreshCw, Send, XCircle } from "lucide-react";

export type OrderV2BlingNfeIssue = {
  accessKey: string | null;
  blingNfeId: string | null;
  blingNumber: string | null;
  blingSeries: string | null;
  createdAt: string;
  danfeUrl: string | null;
  emittedAt: string | null;
  errorMessage: string | null;
  id: string;
  lastSyncedAt: string | null;
  orderId: string;
  pdfUrl: string | null;
  sentAt: string | null;
  status: "draft" | "created" | "sent" | "authorized" | "rejected" | "cancelled" | "failed";
  updatedAt: string;
  xmlUrl: string | null;
};

type Props = {
  blingOAuthStatus?: "connected" | "error" | null;
  fulfillmentStatus: string;
  issue: OrderV2BlingNfeIssue | null;
  orderId: string;
  paymentStatus: string;
};

type ApiResponse = {
  data?: unknown;
  error?: {
    message?: string;
  };
};

type BlingNfeValidationCheck = {
  key: string;
  label: string;
  message: string;
  status: "error" | "ok" | "warning";
};

type BlingNfeValidation = {
  canCreate: boolean;
  checks: BlingNfeValidationCheck[];
  nextNumber: string | null;
  payloadPreview: {
    dataOperacao: string;
    itens: number;
    naturezaOperacaoId: number;
    numero: string;
    parcelaValor: number | null;
    tipoPessoa: "F" | "J" | "E";
    totalItens: number;
  } | null;
};

const statusLabels: Record<OrderV2BlingNfeIssue["status"], string> = {
  authorized: "Autorizada",
  cancelled: "Cancelada",
  created: "Criada",
  draft: "Rascunho",
  failed: "Falha",
  rejected: "Rejeitada",
  sent: "Enviada",
};

const statusClassNames: Record<OrderV2BlingNfeIssue["status"], string> = {
  authorized: "border-emerald-300/40 bg-emerald-300/10 text-emerald-100",
  cancelled: "border-slate-300/20 bg-slate-300/10 text-slate-100",
  created: "border-cyan-300/40 bg-cyan-300/10 text-cyan-100",
  draft: "border-slate-300/20 bg-slate-300/10 text-slate-100",
  failed: "border-red-300/40 bg-red-300/10 text-red-100",
  rejected: "border-red-300/40 bg-red-300/10 text-red-100",
  sent: "border-yellow-300/40 bg-yellow-300/10 text-yellow-100",
};

async function requestJson<T>(endpoint: string, init: RequestInit = {}) {
  const headers = new Headers(init.headers);

  if (init.body) {
    headers.set("content-type", "application/json");
  }

  const response = await fetch(endpoint, {
    ...init,
    headers,
  });
  const payload = (await response.json()) as ApiResponse;

  if (!response.ok) {
    throw new Error(payload.error?.message ?? "Falha na acao");
  }

  return payload.data as T;
}

async function postJson(endpoint: string, body: Record<string, unknown> = {}) {
  return requestJson<unknown>(endpoint, {
    body: JSON.stringify(body),
    method: "POST",
  });
}

function onlyDigits(value: string) {
  return value.replace(/\D/g, "");
}

function formatDateTime(value: string | null | undefined) {
  if (!value) {
    return "-";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

function validationClassName(status: BlingNfeValidationCheck["status"]) {
  if (status === "ok") {
    return "border-emerald-300/30 bg-emerald-400/10 text-emerald-100";
  }

  if (status === "warning") {
    return "border-yellow-300/30 bg-yellow-400/10 text-yellow-100";
  }

  return "border-red-300/30 bg-red-400/10 text-red-100";
}

function ValidationIcon({ status }: { status: BlingNfeValidationCheck["status"] }) {
  if (status === "ok") {
    return <CheckCircle2 size={15} aria-hidden="true" className="mt-0.5 shrink-0" />;
  }

  if (status === "warning") {
    return <AlertTriangle size={15} aria-hidden="true" className="mt-0.5 shrink-0" />;
  }

  return <XCircle size={15} aria-hidden="true" className="mt-0.5 shrink-0" />;
}

export function OrderV2BlingNfePanel({ blingOAuthStatus, fulfillmentStatus, issue, orderId, paymentStatus }: Props) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [numero, setNumero] = useState(issue?.blingNumber ?? "");
  const [enviarEmail, setEnviarEmail] = useState(false);
  const [validation, setValidation] = useState<BlingNfeValidation | null>(null);
  const canCreate = paymentStatus === "pago" && fulfillmentStatus !== "cancelado" && !issue?.blingNfeId;
  const canSend = Boolean(issue?.blingNfeId) && !["authorized", "cancelled"].includes(issue?.status ?? "draft");
  const normalizedNumero = onlyDigits(numero);

  async function run(action: () => Promise<unknown>) {
    setError("");
    setIsSubmitting(true);

    try {
      await action();
      router.refresh();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Falha na acao");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function validateNfe() {
    setError("");
    setIsValidating(true);

    try {
      const result = await requestJson<BlingNfeValidation>(`/api/v1/admin/orders-v2/${orderId}/bling-nfe/validate`);
      setValidation(result);

      if (!numero && result.nextNumber) {
        setNumero(result.nextNumber);
      }
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Falha ao validar NF-e");
    } finally {
      setIsValidating(false);
    }
  }

  return (
    <section className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-[var(--foreground)]">Nota fiscal Bling</h2>
          <p className="mt-1 text-sm text-[var(--muted)]">
            {issue?.blingNfeId ? `ID Bling ${issue.blingNfeId}` : "Nenhuma NF-e criada para este pedido."}
          </p>
        </div>
        {issue ? (
          <span className={`inline-flex h-8 items-center rounded-full border px-3 text-xs font-black uppercase ${statusClassNames[issue.status]}`}>
            {statusLabels[issue.status]}
          </span>
        ) : null}
      </div>

      {blingOAuthStatus ? (
        <p className={`mt-4 flex items-start gap-2 rounded-md border p-3 text-sm font-semibold ${
          blingOAuthStatus === "connected"
            ? "border-emerald-300/30 bg-emerald-400/10 text-emerald-100"
            : "border-red-300/30 bg-red-400/10 text-red-100"
        }`}
        >
          {blingOAuthStatus === "connected" ? (
            <CheckCircle2 className="mt-0.5 shrink-0" size={16} aria-hidden="true" />
          ) : (
            <AlertTriangle className="mt-0.5 shrink-0" size={16} aria-hidden="true" />
          )}
          <span>
            {blingOAuthStatus === "connected"
              ? "Bling conectado. Agora valide ou crie a NF-e novamente."
              : "Nao foi possivel conectar o Bling. Confira o redirect URI e tente de novo."}
          </span>
        </p>
      ) : null}

      <div className="mt-4 grid gap-3 md:grid-cols-[180px_minmax(0,1fr)]">
        <label className="block">
          <span className="text-sm font-semibold text-[var(--foreground)]">Numero NF-e</span>
          <input
            value={numero}
            onChange={(event) => setNumero(onlyDigits(event.target.value).slice(0, 9))}
            disabled={isSubmitting || Boolean(issue?.blingNfeId)}
            inputMode="numeric"
            placeholder="Automatico"
            className="mt-2 h-11 w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 text-sm outline-none focus:border-[var(--accent)] disabled:opacity-60"
          />
          {!issue?.blingNfeId ? (
            <span className="mt-1 block text-xs text-[var(--muted)]">Em branco usa o proximo numero encontrado.</span>
          ) : null}
        </label>

        <div className="flex flex-wrap items-end gap-2">
          <button
            type="button"
            disabled={isSubmitting || isValidating || !canCreate}
            onClick={() => run(() => postJson(`/api/v1/admin/orders-v2/${orderId}/bling-nfe`, { numero: normalizedNumero }))}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-[var(--accent)] px-4 text-sm font-black text-slate-950 hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <FileText size={16} aria-hidden="true" />
            Criar NF-e
          </button>

          <button
            type="button"
            disabled={isSubmitting || isValidating}
            onClick={validateNfe}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-md border border-[var(--border)] px-4 text-sm font-semibold text-[var(--foreground)] hover:bg-[var(--surface-strong)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            <CheckCircle2 size={16} aria-hidden="true" />
            {isValidating ? "Validando..." : "Validar"}
          </button>

          <Link
            href={`/api/v1/admin/bling/oauth/start?next=${encodeURIComponent(`/admin/v2/pedidos/${orderId}`)}`}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-md border border-[var(--border)] px-4 text-sm font-semibold text-[var(--foreground)] hover:bg-[var(--surface-strong)]"
          >
            <KeyRound size={16} aria-hidden="true" />
            Conectar Bling
          </Link>

          <button
            type="button"
            disabled={isSubmitting || isValidating || !canSend}
            onClick={() => run(() => postJson(`/api/v1/admin/orders-v2/${orderId}/bling-nfe/send`, { enviarEmail }))}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-md border border-[var(--border)] px-4 text-sm font-semibold text-[var(--foreground)] hover:bg-[var(--surface-strong)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Send size={16} aria-hidden="true" />
            Enviar Sefaz
          </button>

          {issue?.blingNfeId ? (
            <button
              type="button"
              disabled={isSubmitting || isValidating}
              onClick={() => run(() => postJson(`/api/v1/admin/orders-v2/${orderId}/bling-nfe/sync`))}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-md border border-[var(--border)] px-4 text-sm font-semibold text-[var(--foreground)] hover:bg-[var(--surface-strong)] disabled:cursor-not-allowed disabled:opacity-60"
            >
              <RefreshCw size={16} aria-hidden="true" />
              Atualizar Bling
            </button>
          ) : null}

          <label className="inline-flex h-11 items-center gap-2 rounded-md border border-[var(--border)] px-3 text-sm font-semibold text-[var(--foreground)]">
            <input
              checked={enviarEmail}
              onChange={(event) => setEnviarEmail(event.target.checked)}
              type="checkbox"
              className="h-4 w-4 accent-[var(--accent)]"
            />
            E-mail Bling
          </label>
        </div>
      </div>

      {issue ? (
        <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-[var(--muted)]">Numero</dt>
            <dd className="font-semibold text-[var(--foreground)]">{issue.blingNumber ?? "-"}</dd>
          </div>
          <div>
            <dt className="text-[var(--muted)]">Serie</dt>
            <dd className="font-semibold text-[var(--foreground)]">{issue.blingSeries ?? "-"}</dd>
          </div>
          <div>
            <dt className="text-[var(--muted)]">Chave de acesso</dt>
            <dd className="break-all text-[var(--foreground)]">{issue.accessKey ?? "-"}</dd>
          </div>
          <div>
            <dt className="text-[var(--muted)]">Ultima consulta</dt>
            <dd className="text-[var(--foreground)]">{formatDateTime(issue.lastSyncedAt)}</dd>
          </div>
        </dl>
      ) : null}

      {validation ? (
        <div className="mt-4 rounded-lg border border-[var(--border)] bg-[var(--background)] p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <strong className="text-sm text-[var(--foreground)]">
              {validation.canCreate ? "Pronto para criar NF-e" : "Pendencias para NF-e"}
            </strong>
            {validation.nextNumber ? (
              <span className="text-xs font-semibold text-[var(--muted)]">Proximo numero: {validation.nextNumber}</span>
            ) : null}
          </div>

          {validation.payloadPreview ? (
            <dl className="mt-3 grid gap-2 text-xs sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <dt className="text-[var(--muted)]">Natureza</dt>
                <dd className="font-semibold text-[var(--foreground)]">{validation.payloadPreview.naturezaOperacaoId}</dd>
              </div>
              <div>
                <dt className="text-[var(--muted)]">Itens</dt>
                <dd className="font-semibold text-[var(--foreground)]">{validation.payloadPreview.itens}</dd>
              </div>
              <div>
                <dt className="text-[var(--muted)]">Pessoa</dt>
                <dd className="font-semibold text-[var(--foreground)]">{validation.payloadPreview.tipoPessoa}</dd>
              </div>
              <div>
                <dt className="text-[var(--muted)]">Parcela</dt>
                <dd className="font-semibold text-[var(--foreground)]">
                  {validation.payloadPreview.parcelaValor === null
                    ? "-"
                    : new Intl.NumberFormat("pt-BR", { currency: "BRL", style: "currency" }).format(validation.payloadPreview.parcelaValor)}
                </dd>
              </div>
            </dl>
          ) : null}

          <ul className="mt-3 grid gap-2">
            {validation.checks.map((check) => (
              <li key={check.key} className={`flex items-start gap-2 rounded-md border px-3 py-2 text-xs ${validationClassName(check.status)}`}>
                <ValidationIcon status={check.status} />
                <span>
                  <strong>{check.label}:</strong> {check.message}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {issue?.danfeUrl || issue?.pdfUrl ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {issue.danfeUrl ? (
            <Link
              href={issue.danfeUrl}
              target="_blank"
              className="inline-flex h-10 items-center gap-2 rounded-md border border-[var(--border)] px-3 text-sm font-semibold text-[var(--foreground)] hover:bg-[var(--surface-strong)]"
            >
              <ExternalLink size={15} aria-hidden="true" />
              DANFE
            </Link>
          ) : null}
          {issue.pdfUrl ? (
            <Link
              href={issue.pdfUrl}
              target="_blank"
              className="inline-flex h-10 items-center gap-2 rounded-md border border-[var(--border)] px-3 text-sm font-semibold text-[var(--foreground)] hover:bg-[var(--surface-strong)]"
            >
              <ExternalLink size={15} aria-hidden="true" />
              PDF
            </Link>
          ) : null}
        </div>
      ) : null}

      {issue?.errorMessage || error ? (
        <p className="mt-4 flex items-start gap-2 rounded-md border border-red-300/30 bg-red-400/10 p-3 text-sm font-semibold text-red-100">
          <AlertTriangle className="mt-0.5 shrink-0" size={16} aria-hidden="true" />
          <span>{error || issue?.errorMessage}</span>
        </p>
      ) : null}
    </section>
  );
}
