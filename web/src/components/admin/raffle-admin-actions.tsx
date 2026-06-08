"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Ban, CheckCircle2, CircleDollarSign, Pause, Play, Trophy, XCircle } from "lucide-react";
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
    { endpoint: "publish", icon: Play, label: "Abrir", show: !["open", "drawn", "cancelled"].includes(status) },
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

export function RaffleOrderActions({
  orderId,
  status,
}: {
  orderId: string;
  status: string;
}) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [notes, setNotes] = useState("");
  const [runningAction, setRunningAction] = useState<string | null>(null);
  const canConfirmPayment = ["reserved", "pending_payment"].includes(status);
  const canCancel = status !== "paid" && status !== "cancelled";

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

  return (
    <div className="grid gap-2">
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

export function RaffleDrawForm({
  campaignId,
  disabled,
}: {
  campaignId: string;
  disabled: boolean;
}) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function submitDraw(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    setError("");
    setMessage("");
    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/v1/admin/raffles/${campaignId}/draw`, {
        body: JSON.stringify({
          drawNotes: String(formData.get("drawNotes") ?? "").trim() || null,
          drawReference: String(formData.get("drawReference") ?? "").trim(),
          drawnAt: new Date().toISOString(),
          winnerNumber: Number(formData.get("winnerNumber") ?? 0),
        }),
        headers: { "content-type": "application/json" },
        method: "POST",
      });
      await parseActionResult(response);
      setMessage("Ganhador registrado.");
      event.currentTarget.reset();
      router.refresh();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Falha ao registrar ganhador");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={submitDraw} className="grid gap-3 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4">
      <div>
        <h2 className="text-lg font-bold text-[var(--foreground)]">Sorteio manual</h2>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Registre o numero vencedor depois de fechar a campanha.
        </p>
      </div>
      <div className="grid gap-3 md:grid-cols-[140px_1fr]">
        <label className="block">
          <span className="text-sm font-semibold text-[var(--foreground)]">Numero</span>
          <input
            name="winnerNumber"
            type="number"
            min={1}
            required
            disabled={disabled || isSubmitting}
            className="mt-2 h-10 w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 text-sm outline-none focus:border-[var(--accent)] disabled:opacity-60"
          />
        </label>
        <label className="block">
          <span className="text-sm font-semibold text-[var(--foreground)]">Referencia</span>
          <input
            name="drawReference"
            required
            disabled={disabled || isSubmitting}
            placeholder="Ex.: link ou ata do sorteio"
            className="mt-2 h-10 w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 text-sm outline-none focus:border-[var(--accent)] disabled:opacity-60"
          />
        </label>
      </div>
      <label className="block">
        <span className="text-sm font-semibold text-[var(--foreground)]">Notas</span>
        <textarea
          name="drawNotes"
          disabled={disabled || isSubmitting}
          className="mt-2 min-h-20 w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm outline-none focus:border-[var(--accent)] disabled:opacity-60"
        />
      </label>
      <button
        type="submit"
        disabled={disabled || isSubmitting}
        className="inline-flex h-10 w-fit items-center justify-center gap-2 rounded-md bg-[var(--yellow)] px-4 text-sm font-black text-[#020617] hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isSubmitting ? (
          <SmartButtonLoading message="Registrando..." />
        ) : (
          <>
            <Trophy size={16} aria-hidden="true" />
            Registrar ganhador
          </>
        )}
      </button>
      {disabled ? (
        <p className="text-xs text-[var(--muted)]">Feche a rifa antes de registrar o ganhador.</p>
      ) : null}
      {message ? <p className="text-sm font-semibold text-emerald-200">{message}</p> : null}
      {error ? <p className="text-sm font-semibold text-red-300">{error}</p> : null}
    </form>
  );
}
