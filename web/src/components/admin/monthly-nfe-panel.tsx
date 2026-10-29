"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CheckCircle2, ExternalLink, FileCheck2, RefreshCw, Send, XCircle } from "lucide-react";
import { formatCurrency } from "@/lib/format";

type Issue = {
  id: string;
  status: "draft" | "created" | "sent" | "authorized" | "rejected" | "cancelled" | "failed";
  blingNfeId: string | null;
  blingNumber: string | null;
  danfeUrl: string | null;
  pdfUrl: string | null;
  errorMessage: string | null;
};

type Report = {
  competence: { id: string; label: string } | null;
  competencies: Array<{ id: string; label: string }>;
  customers: Array<{
    customer: { id: string; name: string; cpf: string | null; email: string | null };
    issue: Issue | null;
    orders: Array<{ id: string; number: string; total: number }>;
    total: number;
  }>;
  totals: { customers: number; eligibleOrders: number; total: number };
};

type BatchResult = {
  message: string;
  status: "error" | "success";
};

const statusLabels: Record<Issue["status"], string> = {
  authorized: "Autorizada", cancelled: "Cancelada", created: "Criada", draft: "Rascunho",
  failed: "Falha", rejected: "Rejeitada", sent: "Enviada",
};

async function post(endpoint: string, body: Record<string, unknown> = {}) {
  const response = await fetch(endpoint, { body: JSON.stringify(body), headers: { "content-type": "application/json" }, method: "POST" });
  const payload = await response.json() as { error?: { message?: string } };
  if (!response.ok) throw new Error(payload.error?.message ?? "Falha ao processar NF-e");
}

function wait(milliseconds: number) {
  return new Promise((resolve) => window.setTimeout(resolve, milliseconds));
}

export function MonthlyNfePanel({ report }: { report: Report }) {
  const router = useRouter();
  const [busyKey, setBusyKey] = useState("");
  const [error, setError] = useState("");
  const [batchProgress, setBatchProgress] = useState<{ current: number; total: number } | null>(null);
  const [batchResults, setBatchResults] = useState<Record<string, BatchResult>>({});
  const batchCandidates = report.customers.filter((row) => !row.issue?.blingNfeId);
  const batchRunning = busyKey === "batch";

  async function run(key: string, action: () => Promise<void>) {
    setBusyKey(key);
    setError("");
    try { await action(); router.refresh(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Falha ao processar NF-e"); }
    finally { setBusyKey(""); }
  }

  async function createAllInvoices() {
    if (!report.competence || batchRunning || batchCandidates.length === 0) {
      return;
    }

    const confirmed = window.confirm(
      `Criar ${batchCandidates.length} NF-e(s) no Bling, uma por cliente, para ${report.competence.label}?`,
    );

    if (!confirmed) {
      return;
    }

    setBusyKey("batch");
    setError("");
    setBatchResults({});
    setBatchProgress({ current: 0, total: batchCandidates.length });

    for (const [index, row] of batchCandidates.entries()) {
      setBatchProgress({ current: index + 1, total: batchCandidates.length });

      try {
        await post("/api/v1/admin/monthly-nfe", {
          competenceId: report.competence.id,
          customerId: row.customer.id,
        });
        setBatchResults((current) => ({
          ...current,
          [row.customer.id]: {
            message: "NF-e consolidada criada no Bling.",
            status: "success",
          },
        }));
      } catch (cause) {
        setBatchResults((current) => ({
          ...current,
          [row.customer.id]: {
            message: cause instanceof Error ? cause.message : "Falha ao criar NF-e.",
            status: "error",
          },
        }));
      }

      if (index < batchCandidates.length - 1) {
        await wait(750);
      }
    }

    setBusyKey("");
    router.refresh();
  }

  return (
    <div className="grid gap-5">
      <section className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5">
        <form className="flex flex-wrap items-end gap-3" method="get">
          <label className="min-w-64 flex-1">
            <span className="text-sm font-semibold text-[var(--foreground)]">Competência</span>
            <select name="competenceId" defaultValue={report.competence?.id ?? ""} className="mt-2 h-11 w-full rounded-md border border-[var(--border)] px-3">
              {report.competencies.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
            </select>
          </label>
          <button className="h-11 rounded-md bg-[var(--accent)] px-5 text-sm font-black text-slate-950" type="submit">Carregar</button>
        </form>
        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <div className="rounded-md border border-[var(--border)] p-3"><span className="text-xs text-[var(--muted)]">Clientes</span><strong className="block text-xl">{report.totals.customers}</strong></div>
          <div className="rounded-md border border-[var(--border)] p-3"><span className="text-xs text-[var(--muted)]">Pedidos pagos</span><strong className="block text-xl">{report.totals.eligibleOrders}</strong></div>
          <div className="rounded-md border border-[var(--border)] p-3"><span className="text-xs text-[var(--muted)]">Total faturável</span><strong className="block text-xl">{formatCurrency(report.totals.total)}</strong></div>
        </div>
        <div className="mt-4 flex flex-col gap-2 rounded-lg border border-[var(--border)] bg-[var(--background)] p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <strong className="text-sm text-[var(--foreground)]">Emissão consolidada em lote</strong>
            <p className="mt-1 text-xs text-[var(--muted)]">
              Cria uma nota por cliente com todos os pedidos pagos ainda não faturados.
            </p>
          </div>
          <button
            className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-md bg-[var(--accent)] px-5 text-sm font-black text-slate-950 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={batchRunning || batchCandidates.length === 0 || !report.competence}
            onClick={createAllInvoices}
            type="button"
          >
            <FileCheck2 size={17} aria-hidden="true" />
            {batchRunning && batchProgress
              ? `Criando ${batchProgress.current} de ${batchProgress.total}...`
              : `Criar NF-es do mês (${batchCandidates.length})`}
          </button>
        </div>
      </section>

      {error ? <p className="rounded-md border border-red-300/30 bg-red-400/10 p-3 text-sm font-semibold text-red-200">{error}</p> : null}

      {report.customers.map((row) => {
        const issue = row.issue;
        const key = row.customer.id;
        const busy = batchRunning || busyKey === key || busyKey === issue?.id;
        const batchResult = batchResults[key];
        return (
          <section key={key} className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-[var(--foreground)]">{row.customer.name}</h2>
                <p className="mt-1 text-sm text-[var(--muted)]">{row.orders.length} pedido(s) · {formatCurrency(row.total)} · CPF/CNPJ {row.customer.cpf || "não cadastrado"}</p>
              </div>
              {issue ? <span className="rounded-full border border-[var(--border)] px-3 py-1 text-xs font-black uppercase">{statusLabels[issue.status]}</span> : null}
            </div>
            <div className="mt-4 flex flex-wrap gap-2 text-xs text-[var(--muted)]">
              {row.orders.map((order) => <Link key={order.id} href={`/admin/v2/pedidos/${order.id}`} className="rounded-md border border-[var(--border)] px-2 py-1 hover:text-[var(--foreground)]">{order.number} · {formatCurrency(order.total)}</Link>)}
            </div>
            {issue?.errorMessage ? <p className="mt-3 text-sm font-semibold text-red-300">{issue.errorMessage}</p> : null}
            {batchResult ? (
              <p
                className={[
                  "mt-3 flex items-start gap-2 rounded-md border px-3 py-2 text-sm font-semibold",
                  batchResult.status === "success"
                    ? "border-emerald-300/30 bg-emerald-400/10 text-emerald-200"
                    : "border-red-300/30 bg-red-400/10 text-red-200",
                ].join(" ")}
              >
                {batchResult.status === "success" ? (
                  <CheckCircle2 className="mt-0.5 shrink-0" size={16} aria-hidden="true" />
                ) : (
                  <XCircle className="mt-0.5 shrink-0" size={16} aria-hidden="true" />
                )}
                {batchResult.message}
              </p>
            ) : null}
            <div className="mt-4 flex flex-wrap gap-2">
              {!issue?.blingNfeId ? (
                <button disabled={busy} onClick={() => run(key, () => post("/api/v1/admin/monthly-nfe", { competenceId: report.competence?.id, customerId: row.customer.id }))} className="inline-flex h-10 items-center gap-2 rounded-md bg-[var(--accent)] px-4 text-sm font-black text-slate-950 disabled:opacity-50" type="button"><FileCheck2 size={16} />{busy ? "Criando..." : "Criar NF-e consolidada"}</button>
              ) : (
                <>
                  {!['authorized', 'cancelled'].includes(issue.status) ? <button disabled={busy} onClick={() => run(issue.id, () => post(`/api/v1/admin/monthly-nfe/${issue.id}/send`))} className="inline-flex h-10 items-center gap-2 rounded-md bg-[var(--accent)] px-4 text-sm font-black text-slate-950 disabled:opacity-50" type="button"><Send size={16} />Enviar Sefaz</button> : null}
                  <button disabled={busy} onClick={() => run(issue.id, () => post(`/api/v1/admin/monthly-nfe/${issue.id}/sync`))} className="inline-flex h-10 items-center gap-2 rounded-md border border-[var(--border)] px-4 text-sm font-semibold disabled:opacity-50" type="button"><RefreshCw size={16} />Atualizar</button>
                  {issue.danfeUrl || issue.pdfUrl ? <a href={issue.danfeUrl ?? issue.pdfUrl ?? "#"} target="_blank" rel="noreferrer" className="inline-flex h-10 items-center gap-2 rounded-md border border-[var(--border)] px-4 text-sm font-semibold"><ExternalLink size={16} />Abrir DANFE</a> : null}
                </>
              )}
            </div>
          </section>
        );
      })}

      {report.customers.length === 0 ? <p className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-6 text-center text-sm text-[var(--muted)]">Nenhum pedido pago e elegível nesta competência.</p> : null}
    </div>
  );
}
