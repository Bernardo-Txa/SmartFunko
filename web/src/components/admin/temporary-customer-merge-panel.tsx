"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRightLeft, CheckCircle2, Search, UserCheck } from "lucide-react";
import { formatCurrency, formatDate, formatPhoneNumber } from "@/lib/format";

type CustomerOption = {
  email: string | null;
  id: string;
  name: string;
  phone: string | null;
  status: string;
};

type TemporaryCustomerMergeCandidate = {
  createdAt: string;
  id: string;
  name: string;
  notes: string | null;
  orders: {
    paid: number;
    pending: number;
    totalAmount: number;
    totalCount: number;
  };
  phone: string;
  phoneNormalized: string;
  suggestedCustomerId: string | null;
  updatedAt: string;
};

type MergeApiResponse = {
  data?: {
    ordersUpdated: number;
  };
  error?: {
    message?: string;
  };
};

function normalizeSearch(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function customerLabel(customer: CustomerOption) {
  const phone = formatPhoneNumber(customer.phone) || customer.phone;

  return [
    customer.name,
    phone ? `WhatsApp ${phone}` : null,
    customer.email,
  ].filter(Boolean).join(" - ");
}

function matchesSearch(text: string, query: string) {
  if (!query) {
    return true;
  }

  return normalizeSearch(text).includes(query);
}

function StatCard({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4">
      <span className="text-xs font-black uppercase tracking-[0.14em] text-[var(--muted)]">{label}</span>
      <strong className="mt-2 block break-words text-2xl text-[var(--foreground)]">{value}</strong>
      <span className="mt-1 block text-sm text-[var(--muted)]">{detail}</span>
    </div>
  );
}

function CustomerPreview({ customer, label }: { customer: CustomerOption | null; label: string }) {
  if (!customer) {
    return (
      <div className="rounded-lg border border-dashed border-[var(--border)] bg-[var(--background)] p-4 text-sm text-[var(--muted)]">
        Selecione um cliente cadastrado para receber os pedidos.
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-[var(--border)] bg-[var(--background)] p-4">
      <span className="text-xs font-black uppercase tracking-[0.14em] text-[var(--muted)]">{label}</span>
      <strong className="mt-2 block text-base text-[var(--foreground)]">{customer.name}</strong>
      <p className="mt-1 text-sm text-[var(--muted)]">{formatPhoneNumber(customer.phone) || "Sem telefone"}</p>
      <p className="text-sm text-[var(--muted)]">{customer.email ?? "Sem e-mail"}</p>
    </div>
  );
}

export function TemporaryCustomerMergePanel({
  candidates,
  customers,
}: {
  candidates: TemporaryCustomerMergeCandidate[];
  customers: CustomerOption[];
}) {
  const router = useRouter();
  const [candidateSearch, setCandidateSearch] = useState("");
  const [customerSearch, setCustomerSearch] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [localCandidates, setLocalCandidates] = useState(candidates);
  const [selectedCandidateId, setSelectedCandidateId] = useState(candidates[0]?.id ?? "");
  const [success, setSuccess] = useState("");
  const [targetCustomerId, setTargetCustomerId] = useState(candidates[0]?.suggestedCustomerId ?? "");

  const activeCandidate = useMemo(
    () => localCandidates.find((candidate) => candidate.id === selectedCandidateId) ?? null,
    [localCandidates, selectedCandidateId],
  );

  const targetCustomer = useMemo(
    () => customers.find((customer) => customer.id === targetCustomerId) ?? null,
    [customers, targetCustomerId],
  );

  const candidateQuery = normalizeSearch(candidateSearch);
  const customerQuery = normalizeSearch(customerSearch);

  const visibleCandidates = useMemo(
    () => localCandidates.filter((candidate) => matchesSearch(`${candidate.name} ${candidate.phone} ${formatPhoneNumber(candidate.phone)} ${candidate.notes ?? ""}`, candidateQuery)),
    [candidateQuery, localCandidates],
  );

  const visibleCustomers = useMemo(() => {
    const filtered = customers.filter((customer) => matchesSearch(customerLabel(customer), customerQuery));

    if (targetCustomer && !filtered.some((customer) => customer.id === targetCustomer.id)) {
      return [targetCustomer, ...filtered];
    }

    return filtered;
  }, [customerQuery, customers, targetCustomer]);

  const totals = useMemo(() => {
    return localCandidates.reduce(
      (acc, candidate) => ({
        matches: acc.matches + (candidate.suggestedCustomerId ? 1 : 0),
        orders: acc.orders + candidate.orders.totalCount,
        totalAmount: acc.totalAmount + candidate.orders.totalAmount,
      }),
      { matches: 0, orders: 0, totalAmount: 0 },
    );
  }, [localCandidates]);

  async function mergeSelectedCustomer() {
    if (!activeCandidate || !targetCustomer) {
      setError("Selecione o temporario e o cliente cadastrado.");
      return;
    }

    const confirmed = window.confirm(
      `Unificar ${activeCandidate.name} com ${targetCustomer.name}? ${activeCandidate.orders.totalCount} pedido(s) serao vinculados ao cadastro principal.`,
    );

    if (!confirmed) {
      return;
    }

    setError("");
    setSuccess("");
    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/v1/admin/temporary-customers/${activeCandidate.id}/merge`, {
        body: JSON.stringify({ customerId: targetCustomer.id }),
        headers: { "content-type": "application/json" },
        method: "POST",
      });
      const body = (await response.json()) as MergeApiResponse;

      if (!response.ok) {
        throw new Error(body.error?.message ?? "Falha ao unificar cliente temporario");
      }

      const ordersUpdated = body.data?.ordersUpdated ?? activeCandidate.orders.totalCount;
      const nextCandidates = localCandidates.filter((candidate) => candidate.id !== activeCandidate.id);
      const nextCandidate = nextCandidates[0] ?? null;

      setLocalCandidates(nextCandidates);
      setSelectedCandidateId(nextCandidate?.id ?? "");
      setTargetCustomerId(nextCandidate?.suggestedCustomerId ?? "");
      setSuccess(`${activeCandidate.name} unificado com ${targetCustomer.name}. ${ordersUpdated} pedido(s) atualizados.`);
      router.refresh();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Falha ao unificar cliente temporario");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-3 md:grid-cols-3">
        <StatCard label="Temporarios ativos" value={`${localCandidates.length}`} detail="Disponiveis para unificar" />
        <StatCard label="Pedidos temporarios" value={`${totals.orders}`} detail="Serao movidos ao cadastro padrao" />
        <StatCard label="Valor vinculado" value={formatCurrency(totals.totalAmount)} detail={`${totals.matches} sugestao(oes) por telefone`} />
      </div>

      {error ? (
        <div className="rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-sm font-semibold text-red-100">
          {error}
        </div>
      ) : null}
      {success ? (
        <div className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 p-3 text-sm font-semibold text-emerald-100">
          {success}
        </div>
      ) : null}

      <section className="grid min-w-0 gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(320px,420px)]">
        <div className="min-w-0 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4">
          <div className="flex min-w-0 flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <h2 className="text-lg font-bold text-[var(--foreground)]">Clientes temporarios</h2>
              <p className="mt-1 text-sm text-[var(--muted)]">Selecione quem sera anexado ao cadastro principal.</p>
            </div>
            <label className="relative block min-w-0 md:w-72">
              <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]" />
              <input
                value={candidateSearch}
                onChange={(event) => setCandidateSearch(event.target.value)}
                className="h-10 w-full rounded-md border border-[var(--border)] bg-[var(--background)] pl-9 pr-3 text-sm outline-none focus:border-[var(--accent)]"
                placeholder="Buscar temporario"
              />
            </label>
          </div>

          <div className="mt-4 grid gap-3">
            {visibleCandidates.map((candidate) => {
              const isActive = candidate.id === selectedCandidateId;
              const suggestedCustomer = customers.find((customer) => customer.id === candidate.suggestedCustomerId) ?? null;

              return (
                <button
                  key={candidate.id}
                  type="button"
                  onClick={() => {
                    setSelectedCandidateId(candidate.id);
                    setTargetCustomerId(candidate.suggestedCustomerId ?? "");
                    setSuccess("");
                    setError("");
                  }}
                  className={
                    isActive
                      ? "w-full rounded-lg border border-[var(--accent)] bg-[var(--surface-strong)] p-4 text-left"
                      : "w-full rounded-lg border border-[var(--border)] bg-[var(--background)] p-4 text-left hover:border-[var(--accent)]"
                  }
                >
                  <div className="flex min-w-0 flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <strong className="text-base text-[var(--foreground)]">{candidate.name}</strong>
                        {candidate.suggestedCustomerId ? (
                          <span className="rounded-full border border-emerald-400/40 bg-emerald-400/10 px-2 py-1 text-[10px] font-black uppercase tracking-wide text-emerald-100">
                            Match telefone
                          </span>
                        ) : (
                          <span className="rounded-full border border-[var(--border)] bg-[var(--surface)] px-2 py-1 text-[10px] font-black uppercase tracking-wide text-[var(--muted)]">
                            Sem sugestao
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-sm text-[var(--muted)]">{formatPhoneNumber(candidate.phone) || candidate.phone}</p>
                      {candidate.notes ? (
                        <p className="mt-2 line-clamp-2 text-sm text-[var(--muted)]">{candidate.notes}</p>
                      ) : null}
                      {suggestedCustomer ? (
                        <p className="mt-2 text-xs font-semibold text-emerald-100">
                          Sugestao: {customerLabel(suggestedCustomer)}
                        </p>
                      ) : null}
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-left md:w-72">
                      <span className="rounded-md border border-[var(--border)] bg-[var(--surface)] p-2">
                        <span className="block text-[10px] font-black uppercase tracking-wide text-[var(--muted)]">Pedidos</span>
                        <strong className="text-sm text-[var(--foreground)]">{candidate.orders.totalCount}</strong>
                      </span>
                      <span className="rounded-md border border-[var(--border)] bg-[var(--surface)] p-2">
                        <span className="block text-[10px] font-black uppercase tracking-wide text-[var(--muted)]">Pagos</span>
                        <strong className="text-sm text-[var(--foreground)]">{candidate.orders.paid}</strong>
                      </span>
                      <span className="rounded-md border border-[var(--border)] bg-[var(--surface)] p-2">
                        <span className="block text-[10px] font-black uppercase tracking-wide text-[var(--muted)]">Total</span>
                        <strong className="text-sm text-[var(--foreground)]">{formatCurrency(candidate.orders.totalAmount)}</strong>
                      </span>
                    </div>
                  </div>
                </button>
              );
            })}

            {visibleCandidates.length === 0 ? (
              <div className="rounded-lg border border-dashed border-[var(--border)] bg-[var(--background)] p-6 text-center text-sm text-[var(--muted)]">
                Nenhum cliente temporario ativo encontrado.
              </div>
            ) : null}
          </div>
        </div>

        <aside className="min-w-0 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4 lg:self-start">
          <div className="flex items-start gap-3">
            <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-[var(--accent)] bg-[var(--accent)]/10 text-[var(--accent)]">
              <ArrowRightLeft size={18} aria-hidden="true" />
            </span>
            <div>
              <h2 className="text-lg font-bold text-[var(--foreground)]">Unificar perfil</h2>
              <p className="mt-1 text-sm text-[var(--muted)]">Move os pedidos V2 para o cadastro definitivo.</p>
            </div>
          </div>

          <div className="mt-4 space-y-3">
            {activeCandidate ? (
              <div className="rounded-lg border border-[var(--border)] bg-[var(--background)] p-4">
                <span className="text-xs font-black uppercase tracking-[0.14em] text-[var(--muted)]">Temporario selecionado</span>
                <strong className="mt-2 block text-base text-[var(--foreground)]">{activeCandidate.name}</strong>
                <p className="mt-1 text-sm text-[var(--muted)]">{formatPhoneNumber(activeCandidate.phone) || activeCandidate.phone}</p>
                <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                  <span className="rounded-md border border-[var(--border)] p-2">
                    <span className="block text-[10px] font-black uppercase tracking-wide text-[var(--muted)]">Pedidos</span>
                    <strong className="text-[var(--foreground)]">{activeCandidate.orders.totalCount}</strong>
                  </span>
                  <span className="rounded-md border border-[var(--border)] p-2">
                    <span className="block text-[10px] font-black uppercase tracking-wide text-[var(--muted)]">Valor</span>
                    <strong className="text-[var(--foreground)]">{formatCurrency(activeCandidate.orders.totalAmount)}</strong>
                  </span>
                </div>
                <p className="mt-3 text-xs text-[var(--muted)]">Criado em {formatDate(activeCandidate.createdAt)}</p>
              </div>
            ) : (
              <div className="rounded-lg border border-dashed border-[var(--border)] bg-[var(--background)] p-4 text-sm text-[var(--muted)]">
                Selecione um cliente temporario na lista.
              </div>
            )}

            <label className="block min-w-0">
              <span className="text-sm font-semibold text-[var(--foreground)]">Buscar cliente cadastrado</span>
              <input
                value={customerSearch}
                onChange={(event) => setCustomerSearch(event.target.value)}
                className="mt-2 h-10 w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 text-sm outline-none focus:border-[var(--accent)]"
                placeholder="Nome, telefone ou e-mail"
              />
            </label>

            <label className="block min-w-0">
              <span className="text-sm font-semibold text-[var(--foreground)]">Cliente padrao</span>
              <select
                value={targetCustomerId}
                onChange={(event) => setTargetCustomerId(event.target.value)}
                className="mt-2 h-11 w-full min-w-0 rounded-md border border-[var(--border)] bg-[var(--background)] px-3 text-sm outline-none focus:border-[var(--accent)]"
              >
                <option value="">Selecione</option>
                {visibleCustomers.map((customer) => (
                  <option key={customer.id} value={customer.id}>
                    {customerLabel(customer)}
                  </option>
                ))}
              </select>
            </label>

            <CustomerPreview customer={targetCustomer} label="Cadastro que recebera os pedidos" />

            <button
              type="button"
              disabled={isSubmitting || !activeCandidate || !targetCustomer}
              onClick={() => void mergeSelectedCustomer()}
              className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-[var(--accent)] px-4 text-sm font-black text-black hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <UserCheck size={17} aria-hidden="true" />
              {isSubmitting ? "Unificando..." : "Unificar perfil"}
            </button>

            <div className="rounded-lg border border-[var(--border)] bg-[var(--background)] p-3 text-xs leading-relaxed text-[var(--muted)]">
              <CheckCircle2 size={15} className="mr-2 inline text-emerald-200" aria-hidden="true" />
              Depois de unificar, o temporario sai desta tela e os pedidos aparecem para o cliente cadastrado em Meus pedidos.
            </div>
          </div>
        </aside>
      </section>
    </div>
  );
}
