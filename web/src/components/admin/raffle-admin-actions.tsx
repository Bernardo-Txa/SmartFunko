"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Ban,
  CheckCircle2,
  CircleDollarSign,
  Clock3,
  Copy,
  ExternalLink,
  LinkIcon,
  MapPin,
  Pause,
  Play,
  RefreshCw,
  Shuffle,
  Trophy,
  XCircle,
} from "lucide-react";
import { RAFFLE_MAX_WINNERS } from "@/lib/raffle-rules";
import { SmartButtonLoading } from "@/components/ui/smart-loading";

type ActionResult = {
  error?: {
    message?: string;
  };
};

async function parseActionResult(response: Response) {
  const payload = (await response.json().catch(() => ({}))) as ActionResult;

  if (!response.ok) {
    throw new Error(payload.error?.message ?? "Falha ao executar acao");
  }
}

export function RaffleCampaignStatusActions({
  campaignId,
  status,
}: {
  campaignId: string;
  status: string;
}) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [runningAction, setRunningAction] = useState<string | null>(null);
  const actions = [
    { endpoint: "open", icon: Play, label: "Abrir", show: !["open", "drawn", "cancelled"].includes(status) },
    { endpoint: "pause", icon: Pause, label: "Pausar", show: status === "open" },
    { endpoint: "close", icon: CheckCircle2, label: "Fechar", show: ["open", "paused", "sold_out"].includes(status) },
    { endpoint: "cancel", icon: Ban, label: "Cancelar", show: !["cancelled", "drawn"].includes(status) },
  ];

  async function runAction(endpoint: string) {
    setError("");
    setRunningAction(endpoint);

    try {
      const response = await fetch(`/api/v1/admin/raffles/${campaignId}/${endpoint}`, {
        method: "POST",
      });
      await parseActionResult(response);
      router.refresh();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Falha ao executar acao");
    } finally {
      setRunningAction(null);
    }
  }

  return (
    <div className="grid gap-2">
      <div className="flex flex-wrap gap-2">
        {actions
          .filter((action) => action.show)
          .map((action) => {
            const Icon = action.icon;
            const isRunning = runningAction === action.endpoint;

            return (
              <button
                key={action.endpoint}
                type="button"
                disabled={runningAction !== null}
                onClick={() => runAction(action.endpoint)}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-[var(--border)] px-3 text-sm font-semibold text-[var(--foreground)] hover:bg-[var(--surface-strong)] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isRunning ? (
                  <SmartButtonLoading message="Salvando..." />
                ) : (
                  <>
                    <Icon size={16} aria-hidden="true" />
                    {action.label}
                  </>
                )}
              </button>
            );
          })}
      </div>
      {error ? <p className="text-sm font-semibold text-red-300">{error}</p> : null}
    </div>
  );
}

export function RaffleOpenCampaignButton({
  campaignId,
  disabled,
}: {
  campaignId: string;
  disabled: boolean;
}) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function openCampaign() {
    setError("");
    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/v1/admin/raffles/${campaignId}/open`, {
        method: "POST",
      });
      await parseActionResult(response);
      router.refresh();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Falha ao abrir rifa");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="grid gap-1">
      <button
        type="button"
        disabled={disabled || isSubmitting}
        onClick={openCampaign}
        className="inline-flex h-9 w-fit items-center justify-center gap-2 rounded-md border border-[var(--border)] px-3 text-xs font-semibold text-[var(--foreground)] hover:bg-[var(--surface-strong)] disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isSubmitting ? (
          <SmartButtonLoading message="Abrindo..." />
        ) : (
          <>
            <Play size={14} aria-hidden="true" />
            Abrir
          </>
        )}
      </button>
      {error ? <p className="max-w-40 text-xs font-semibold text-red-300">{error}</p> : null}
    </div>
  );
}

export function RaffleOrderActions({
  orderId,
  paymentLinkUrl,
  status,
}: {
  orderId: string;
  paymentLinkUrl?: string | null;
  status: string;
}) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [notes, setNotes] = useState("");
  const [runningAction, setRunningAction] = useState<string | null>(null);
  const canConfirmPayment = status === "pending_payment";
  const canCancel = status !== "paid" && status !== "cancelled";
  const canGeneratePaymentLink = status === "pending_payment";

  async function confirmPayment(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");
    setRunningAction("confirm-payment");

    try {
      const response = await fetch(`/api/v1/admin/raffles/orders/${orderId}/confirm-payment`, {
        body: JSON.stringify({
          method: "manual",
          notes: notes.trim() || null,
          paidAt: new Date().toISOString(),
        }),
        headers: { "content-type": "application/json" },
        method: "POST",
      });
      await parseActionResult(response);
      setMessage("Pagamento confirmado.");
      setNotes("");
      router.refresh();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Falha ao confirmar pagamento");
    } finally {
      setRunningAction(null);
    }
  }

  async function cancelReservation() {
    setError("");
    setMessage("");
    setRunningAction("cancel");

    try {
      const response = await fetch(`/api/v1/admin/raffles/orders/${orderId}/cancel`, {
        method: "POST",
      });
      await parseActionResult(response);
      setMessage("Reserva cancelada.");
      router.refresh();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Falha ao cancelar reserva");
    } finally {
      setRunningAction(null);
    }
  }

  async function generatePaymentLink() {
    setError("");
    setMessage("");
    setRunningAction("generate-payment-link");

    try {
      const response = await fetch(`/api/v1/admin/raffles/orders/${orderId}/generate-payment-link`, {
        method: "POST",
      });
      await parseActionResult(response);
      setMessage("Link InfinitePay gerado.");
      router.refresh();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Falha ao gerar link InfinitePay");
    } finally {
      setRunningAction(null);
    }
  }

  async function syncPayment() {
    setError("");
    setMessage("");
    setRunningAction("sync-payment");

    try {
      const response = await fetch(`/api/v1/admin/raffles/orders/${orderId}/sync-payment`, {
        body: JSON.stringify({}),
        headers: { "content-type": "application/json" },
        method: "POST",
      });
      await parseActionResult(response);
      setMessage("Consulta InfinitePay concluida.");
      router.refresh();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Falha ao consultar pagamento");
    } finally {
      setRunningAction(null);
    }
  }

  async function copyPaymentLink() {
    if (!paymentLinkUrl) {
      return;
    }

    await navigator.clipboard.writeText(paymentLinkUrl);
    setMessage("Link copiado.");
  }

  return (
    <div className="grid gap-2">
      {paymentLinkUrl ? (
        <div className="flex flex-wrap gap-2">
          <a
            href={paymentLinkUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-9 w-fit items-center justify-center gap-2 rounded-md border border-[var(--border)] px-3 text-xs font-semibold text-[var(--foreground)] hover:bg-[var(--surface-strong)]"
          >
            <ExternalLink size={14} aria-hidden="true" />
            Abrir link
          </a>
          <button
            type="button"
            onClick={copyPaymentLink}
            className="inline-flex h-9 w-fit items-center justify-center gap-2 rounded-md border border-[var(--border)] px-3 text-xs font-semibold text-[var(--foreground)] hover:bg-[var(--surface-strong)]"
          >
            <Copy size={14} aria-hidden="true" />
            Copiar link
          </button>
        </div>
      ) : null}
      {canGeneratePaymentLink ? (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={runningAction !== null}
            onClick={generatePaymentLink}
            className="inline-flex h-9 w-fit items-center justify-center gap-2 rounded-md border border-[var(--border)] px-3 text-xs font-semibold text-[var(--foreground)] hover:bg-[var(--surface-strong)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {runningAction === "generate-payment-link" ? (
              <SmartButtonLoading message="Gerando..." />
            ) : (
              <>
                <LinkIcon size={14} aria-hidden="true" />
                {paymentLinkUrl ? "Regerar link InfinitePay" : "Gerar link InfinitePay"}
              </>
            )}
          </button>
          {paymentLinkUrl ? (
            <button
              type="button"
              disabled={runningAction !== null}
              onClick={syncPayment}
              className="inline-flex h-9 w-fit items-center justify-center gap-2 rounded-md border border-[var(--border)] px-3 text-xs font-semibold text-[var(--foreground)] hover:bg-[var(--surface-strong)] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {runningAction === "sync-payment" ? (
                <SmartButtonLoading message="Consultando..." />
              ) : (
                <>
                  <RefreshCw size={14} aria-hidden="true" />
                  Verificar pagamento
                </>
              )}
            </button>
          ) : null}
        </div>
      ) : null}
      {canConfirmPayment ? (
        <form onSubmit={confirmPayment} className="grid gap-2 sm:grid-cols-[minmax(180px,1fr)_auto]">
          <input
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            placeholder="Observacao do pagamento"
            className="h-9 rounded-md border border-[var(--border)] bg-[var(--background)] px-3 text-xs outline-none focus:border-[var(--accent)]"
          />
          <button
            type="submit"
            disabled={runningAction !== null}
            className="inline-flex h-9 items-center justify-center gap-2 rounded-md bg-[var(--accent)] px-3 text-xs font-black text-[#020617] hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {runningAction === "confirm-payment" ? (
              <SmartButtonLoading message="Confirmando..." />
            ) : (
              <>
                <CircleDollarSign size={14} aria-hidden="true" />
                Confirmar pagamento
              </>
            )}
          </button>
        </form>
      ) : null}
      {canCancel ? (
        <button
          type="button"
          disabled={runningAction !== null}
          onClick={cancelReservation}
          className="inline-flex h-9 w-fit items-center justify-center gap-2 rounded-md border border-red-300/50 px-3 text-xs font-semibold text-red-200 hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {runningAction === "cancel" ? (
            <SmartButtonLoading message="Cancelando..." />
          ) : (
            <>
              <XCircle size={14} aria-hidden="true" />
              Cancelar reserva
            </>
          )}
        </button>
      ) : null}
      {message ? <p className="text-xs font-semibold text-emerald-200">{message}</p> : null}
      {error ? <p className="text-xs font-semibold text-red-300">{error}</p> : null}
    </div>
  );
}

export function RaffleExpireReservationsButton() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function expireReservations() {
    setError("");
    setMessage("");
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/v1/admin/raffles/expire-reservations", {
        method: "POST",
      });
      const payload = (await response.json().catch(() => ({}))) as ActionResult & {
        data?: { expired?: number };
      };

      if (!response.ok) {
        throw new Error(payload.error?.message ?? "Falha ao expirar reservas");
      }

      setMessage(`${payload.data?.expired ?? 0} reserva(s) vencida(s) expirada(s).`);
      router.refresh();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Falha ao expirar reservas");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="grid gap-2">
      <button
        type="button"
        disabled={isSubmitting}
        onClick={expireReservations}
        className="inline-flex h-10 w-fit items-center justify-center gap-2 rounded-md border border-[var(--border)] px-3 text-sm font-semibold text-[var(--foreground)] hover:bg-[var(--surface-strong)] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isSubmitting ? (
          <SmartButtonLoading message="Expirando..." />
        ) : (
          <>
            <Clock3 size={16} aria-hidden="true" />
            Expirar reservas vencidas
          </>
        )}
      </button>
      {message ? <p className="text-xs font-semibold text-emerald-200">{message}</p> : null}
      {error ? <p className="text-xs font-semibold text-red-300">{error}</p> : null}
    </div>
  );
}

export function RaffleDrawForm({
  campaignId,
  disabled,
  eligibleCustomers,
  soldNumbers,
}: {
  campaignId: string;
  disabled: boolean;
  eligibleCustomers: number;
  soldNumbers: number;
}) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [mode, setMode] = useState<"manual_external" | "internal_random">("manual_external");
  const [winnerNumbers, setWinnerNumbers] = useState(() => Array.from({ length: RAFFLE_MAX_WINNERS }, () => ""));
  const [drawReference, setDrawReference] = useState("");
  const [drawNotes, setDrawNotes] = useState("");

  function updateWinnerNumber(index: number, value: string) {
    setWinnerNumbers((current) => current.map((number, currentIndex) => (
      currentIndex === index ? value : number
    )));
  }

  async function submitDraw() {
    setError("");
    setMessage("");

    const parsedWinnerNumbers = winnerNumbers
      .map((number) => Number(number))
      .filter((number) => Number.isInteger(number) && number > 0);

    if (mode === "manual_external") {
      if (parsedWinnerNumbers.length === 0) {
        setError("Informe pelo menos um numero sorteado.");
        return;
      }

      if (new Set(parsedWinnerNumbers).size !== parsedWinnerNumbers.length) {
        setError("Informe numeros sorteados diferentes.");
        return;
      }
    }

    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/v1/admin/raffles/${campaignId}/draw`, {
        body: JSON.stringify({
          drawNotes: drawNotes.trim() || null,
          drawReference: drawReference.trim() || null,
          drawnAt: new Date().toISOString(),
          mode: mode === "manual_external" ? "manual" : "internal_random",
          winnerNumbers: mode === "manual_external" ? parsedWinnerNumbers : undefined,
        }),
        headers: { "content-type": "application/json" },
        method: "POST",
      });
      await parseActionResult(response);
      setMessage(mode === "manual_external" ? "Numeros do sorteio externo registrados." : "Sorteio interno registrado.");
      router.refresh();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Falha ao sortear rifa");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="grid gap-4 rounded-lg border border-yellow-300/40 bg-yellow-300/10 p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-yellow-200">Registro do sorteio</p>
          <h2 className="mt-2 text-xl font-black text-[var(--foreground)]">
            {mode === "manual_external" ? "Informe os numeros sorteados" : "Sorteio interno sem cupons"}
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--muted)]">
            {mode === "manual_external"
              ? `Se o sorteio for feito em outro local, informe de 1 a ${RAFFLE_MAX_WINNERS} numeros comprados.`
              : `O app sorteia ate ${RAFFLE_MAX_WINNERS} colocados entre cotas pagas, sem gerar cupons automaticamente.`}
          </p>
        </div>
        <div className="grid min-w-52 grid-cols-2 gap-2 text-sm">
          <div className="rounded-md border border-[var(--border)] bg-[var(--background)] p-3">
            <span className="block text-[10px] font-black uppercase tracking-[0.14em] text-[var(--muted)]">Cotas pagas</span>
            <strong className="mt-1 block text-xl text-[var(--foreground)]">{soldNumbers}</strong>
          </div>
          <div className="rounded-md border border-[var(--border)] bg-[var(--background)] p-3">
            <span className="block text-[10px] font-black uppercase tracking-[0.14em] text-[var(--muted)]">Compradores</span>
            <strong className="mt-1 block text-xl text-[var(--foreground)]">{eligibleCustomers}</strong>
          </div>
        </div>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        <button
          type="button"
          onClick={() => setMode("manual_external")}
          className={`inline-flex min-h-10 items-center justify-center gap-2 rounded-md border px-3 text-sm font-black ${
            mode === "manual_external"
              ? "border-cyan-200/60 bg-cyan-300 text-slate-950"
              : "border-[var(--border)] text-[var(--foreground)] hover:bg-[var(--surface-strong)]"
          }`}
        >
          <MapPin size={16} aria-hidden="true" />
          Sortear fora e informar numeros
        </button>
        <button
          type="button"
          onClick={() => setMode("internal_random")}
          className={`inline-flex min-h-10 items-center justify-center gap-2 rounded-md border px-3 text-sm font-black ${
            mode === "internal_random"
              ? "border-yellow-200/60 bg-yellow-300 text-slate-950"
              : "border-[var(--border)] text-[var(--foreground)] hover:bg-[var(--surface-strong)]"
          }`}
        >
          <Shuffle size={16} aria-hidden="true" />
          Sortear dentro do app
        </button>
      </div>

      {mode === "manual_external" ? (
        <div className="grid gap-4 rounded-md border border-cyan-200/25 bg-[var(--background)] p-4">
          <div className="grid gap-3 sm:grid-cols-3">
            {Array.from({ length: RAFFLE_MAX_WINNERS }, (_, index) => (
              <label key={index} className="block">
                <span className="text-sm font-semibold text-[var(--foreground)]">{index + 1}o numero</span>
                <input
                  type="number"
                  min={1}
                  inputMode="numeric"
                  value={winnerNumbers[index]}
                  onChange={(event) => updateWinnerNumber(index, event.target.value)}
                  placeholder="Opcional"
                  className="mt-2 h-10 w-full rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 text-sm outline-none focus:border-cyan-200"
                />
              </label>
            ))}
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <label className="block">
              <span className="text-sm font-semibold text-[var(--foreground)]">Onde foi realizado (opcional)</span>
              <input
                value={drawReference}
                onChange={(event) => setDrawReference(event.target.value)}
                placeholder="Ex.: Instagram, live, site externo..."
                className="mt-2 h-10 w-full rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 text-sm outline-none focus:border-cyan-200"
              />
            </label>
            <label className="block">
              <span className="text-sm font-semibold text-[var(--foreground)]">Observacoes (opcional)</span>
              <textarea
                value={drawNotes}
                onChange={(event) => setDrawNotes(event.target.value)}
                rows={2}
                placeholder="Link, horario ou comprovante do sorteio..."
                className="mt-2 w-full rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm outline-none focus:border-cyan-200"
              />
            </label>
          </div>
          <button
            type="button"
            onClick={submitDraw}
            disabled={disabled || isSubmitting}
            className="inline-flex h-10 w-fit items-center justify-center gap-2 rounded-md bg-cyan-300 px-4 text-sm font-black text-slate-950 hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? (
              <SmartButtonLoading message="Registrando..." />
            ) : (
              <>
                <Trophy size={16} aria-hidden="true" />
                Registrar numeros sorteados
              </>
            )}
          </button>
        </div>
      ) : (
        <div className="grid gap-3">
          <div className="grid gap-2 text-sm text-[var(--muted)] sm:grid-cols-3">
            <span className="rounded-md border border-yellow-300/30 bg-[var(--background)] px-3 py-2 font-semibold text-[var(--foreground)]">1o lugar: Funko</span>
            <span className="rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2">2o lugar: sem cupom automatico</span>
            <span className="rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2">3o lugar: sem cupom automatico</span>
          </div>
          <button
            type="button"
            onClick={submitDraw}
            disabled={disabled || isSubmitting}
            className="inline-flex h-10 w-fit items-center justify-center gap-2 rounded-md bg-[var(--yellow)] px-4 text-sm font-black text-[#020617] hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? (
              <SmartButtonLoading message="Sorteando..." />
            ) : (
              <>
                <Trophy size={16} aria-hidden="true" />
                Sortear no aplicativo
              </>
            )}
          </button>
        </div>
      )}
      {disabled ? (
        <p className="text-xs text-[var(--muted)]">Feche a rifa antes de sortear. Ela precisa ter cotas pagas e ainda nao pode ter resultado registrado.</p>
      ) : null}
      {message ? <p className="text-sm font-semibold text-emerald-200">{message}</p> : null}
      {error ? <p className="text-sm font-semibold text-red-300">{error}</p> : null}
    </section>
  );
}
