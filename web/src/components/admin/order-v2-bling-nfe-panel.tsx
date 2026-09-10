"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertTriangle, ExternalLink, FileText, Send } from "lucide-react";

export type OrderV2BlingNfeIssue = {
  accessKey: string | null;
  blingNfeId: string | null;
  blingNumber: string | null;
  createdAt: string;
  danfeUrl: string | null;
  emittedAt: string | null;
  errorMessage: string | null;
  id: string;
  orderId: string;
  pdfUrl: string | null;
  sentAt: string | null;
  status: "draft" | "created" | "sent" | "authorized" | "rejected" | "cancelled" | "failed";
  updatedAt: string;
  xmlUrl: string | null;
};

type Props = {
  fulfillmentStatus: string;
  issue: OrderV2BlingNfeIssue | null;
  orderId: string;
  paymentStatus: string;
};

type ApiResponse = {
  error?: {
    message?: string;
  };
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

async function postJson(endpoint: string, body: Record<string, unknown> = {}) {
  const response = await fetch(endpoint, {
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
    method: "POST",
  });
  const payload = (await response.json()) as ApiResponse;

  if (!response.ok) {
    throw new Error(payload.error?.message ?? "Falha na acao");
  }
}

function onlyDigits(value: string) {
  return value.replace(/\D/g, "");
}

export function OrderV2BlingNfePanel({ fulfillmentStatus, issue, orderId, paymentStatus }: Props) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [numero, setNumero] = useState(issue?.blingNumber ?? "");
  const [enviarEmail, setEnviarEmail] = useState(false);
  const canCreate = paymentStatus === "pago" && fulfillmentStatus !== "cancelado" && !issue?.blingNfeId;
  const canSend = Boolean(issue?.blingNfeId) && !["authorized", "cancelled"].includes(issue?.status ?? "draft");
  const normalizedNumero = onlyDigits(numero);

  async function run(action: () => Promise<void>) {
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

      <div className="mt-4 grid gap-3 md:grid-cols-[180px_minmax(0,1fr)]">
        <label className="block">
          <span className="text-sm font-semibold text-[var(--foreground)]">Numero NF-e</span>
          <input
            value={numero}
            onChange={(event) => setNumero(onlyDigits(event.target.value).slice(0, 9))}
            disabled={isSubmitting || Boolean(issue?.blingNfeId)}
            inputMode="numeric"
            className="mt-2 h-11 w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 text-sm outline-none focus:border-[var(--accent)] disabled:opacity-60"
          />
        </label>

        <div className="flex flex-wrap items-end gap-2">
          <button
            type="button"
            disabled={isSubmitting || !canCreate || !normalizedNumero}
            onClick={() => run(() => postJson(`/api/v1/admin/orders-v2/${orderId}/bling-nfe`, { numero: normalizedNumero }))}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-[var(--accent)] px-4 text-sm font-black text-slate-950 hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <FileText size={16} aria-hidden="true" />
            Criar NF-e
          </button>

          <button
            type="button"
            disabled={isSubmitting || !canSend}
            onClick={() => run(() => postJson(`/api/v1/admin/orders-v2/${orderId}/bling-nfe/send`, { enviarEmail }))}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-md border border-[var(--border)] px-4 text-sm font-semibold text-[var(--foreground)] hover:bg-[var(--surface-strong)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Send size={16} aria-hidden="true" />
            Enviar Sefaz
          </button>

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
            <dt className="text-[var(--muted)]">Chave de acesso</dt>
            <dd className="break-all text-[var(--foreground)]">{issue.accessKey ?? "-"}</dd>
          </div>
        </dl>
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
