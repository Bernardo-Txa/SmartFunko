"use client";

import Link from "next/link";
import { CheckCircle2, CreditCard, ExternalLink, Loader2, Sparkles } from "lucide-react";
import { useMemo, useState } from "react";
import { formatCurrency } from "@/lib/format";
import { POPFLIX_PLANS, type PopFlixPlan, type PopFlixPlanSlug } from "@/lib/popflix";

type CreatedSubscription = {
  paymentLinkUrl: string | null;
  subscriptionCode: string;
  status: string;
  plan: {
    name: string;
  };
};

export function PopFlixPlanSummaryCard({ plan }: { plan: PopFlixPlan }) {
  return (
    <aside className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5 lg:sticky lg:top-24 lg:self-start">
      <Sparkles className="text-[var(--yellow)]" size={26} aria-hidden="true" />
      <h2 className="mt-4 text-2xl font-black text-[var(--foreground)]">
        {plan.name}
      </h2>
      <p className="mt-1 text-sm font-bold text-[var(--accent)]">{plan.short}</p>
      <p className="mt-4 text-3xl font-black text-[var(--foreground)]">
        {formatCurrency(plan.price)}
        <span className="ml-1 text-sm font-semibold text-[var(--muted)]">/mes</span>
      </p>
      <ul className="mt-5 grid gap-3 text-sm leading-6 text-[var(--muted)]">
        {plan.features.map((feature) => (
          <li key={feature} className="flex gap-2">
            <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--yellow)]" />
            <span>{feature}</span>
          </li>
        ))}
      </ul>
    </aside>
  );
}

export function PopFlixSubscribeForm({
  customerName,
  initialPlanSlug,
}: {
  customerName?: string | null;
  initialPlanSlug: PopFlixPlanSlug;
}) {
  const [selectedPlanSlug, setSelectedPlanSlug] = useState<PopFlixPlanSlug>(initialPlanSlug);
  const [favoriteFranchises, setFavoriteFranchises] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdSubscription, setCreatedSubscription] = useState<CreatedSubscription | null>(null);
  const selectedPlan = useMemo(
    () => POPFLIX_PLANS.find((plan) => plan.slug === selectedPlanSlug) ?? POPFLIX_PLANS[1],
    [selectedPlanSlug],
  );

  async function submitSubscription() {
    setError("");
    setCreatedSubscription(null);
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/v1/me/popflix-subscriptions", {
        body: JSON.stringify({
          favoriteFranchises,
          notes,
          plan: selectedPlan.slug,
        }),
        headers: { "content-type": "application/json" },
        method: "POST",
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload?.error?.message ?? "Falha ao criar assinatura PopFlix");
      }

      setCreatedSubscription(payload.data);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Falha ao criar assinatura PopFlix",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  if (createdSubscription) {
    return (
      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <section className="rounded-lg border border-emerald-300/32 bg-emerald-500/10 p-5">
          <CheckCircle2 className="text-[var(--green)]" size={28} aria-hidden="true" />
          <h2 className="mt-4 text-2xl font-black text-[var(--foreground)]">
            Assinatura registrada
          </h2>
          <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
            {createdSubscription.subscriptionCode} foi criada no plano{" "}
            {createdSubscription.plan.name}. O status inicial e aguardando pagamento.
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            {createdSubscription.paymentLinkUrl ? (
              <a
                href={createdSubscription.paymentLinkUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-[var(--yellow)] px-5 text-sm font-black text-[#020617] hover:brightness-110"
              >
                <CreditCard size={16} aria-hidden="true" />
                Pagar agora
                <ExternalLink size={15} aria-hidden="true" />
              </a>
            ) : null}
            <Link
              href="/conta/popflix"
              className="inline-flex h-11 items-center justify-center rounded-full border border-[var(--border)] px-5 text-sm font-black text-[var(--foreground)] hover:bg-[var(--surface-strong)]"
            >
              Abrir minhas assinaturas
            </Link>
          </div>
        </section>
        <PopFlixPlanSummaryCard plan={selectedPlan} />
      </div>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
      <section className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.2em] text-[var(--yellow)]">
              Assinar no sistema
            </p>
            <h2 className="mt-2 text-2xl font-black text-[var(--foreground)]">
              {customerName ? `${customerName}, escolha seu PopFlix` : "Escolha seu PopFlix"}
            </h2>
            <p className="mt-1 text-sm leading-6 text-[var(--muted)]">
              A assinatura fica vinculada a sua conta Smart Funkos.
            </p>
          </div>
          <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-strong)] p-3 text-sm">
            <span className="block text-[var(--muted)]">Total mensal</span>
            <strong className="text-xl text-[var(--foreground)]">
              {formatCurrency(selectedPlan.price)}
            </strong>
          </div>
        </div>

        <div className="mt-5 grid gap-3 lg:grid-cols-3">
          {POPFLIX_PLANS.map((plan) => {
            const isSelected = plan.slug === selectedPlanSlug;

            return (
              <label
                key={plan.slug}
                className={`cursor-pointer rounded-lg border p-4 transition ${
                  isSelected
                    ? "border-yellow-300/70 bg-yellow-300/12"
                    : "border-[var(--border)] bg-[var(--surface-strong)] hover:bg-cyan-400/10"
                }`}
              >
                <input
                  type="radio"
                  name="plan"
                  value={plan.slug}
                  checked={isSelected}
                  onChange={() => setSelectedPlanSlug(plan.slug)}
                  className="sr-only"
                />
                <span className="flex items-center justify-between gap-3">
                  <strong className="text-lg text-[var(--foreground)]">{plan.name}</strong>
                  {isSelected ? (
                    <CheckCircle2 className="text-[var(--yellow)]" size={18} aria-hidden="true" />
                  ) : (
                    <Sparkles className="text-[var(--accent)]" size={18} aria-hidden="true" />
                  )}
                </span>
                <span className="mt-1 block text-sm text-[var(--muted)]">{plan.short}</span>
                <span className="mt-3 block text-xl font-black text-[var(--foreground)]">
                  {formatCurrency(plan.price)}
                </span>
              </label>
            );
          })}
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <label className="block">
            <span className="text-sm font-semibold text-[var(--foreground)]">
              Franquias preferidas
            </span>
            <textarea
              value={favoriteFranchises}
              onChange={(event) => setFavoriteFranchises(event.target.value)}
              rows={4}
              maxLength={500}
              className="mt-2 w-full rounded-lg border border-[var(--border)] bg-[var(--background)]/45 px-3 py-3 text-sm outline-none focus:border-[var(--accent)]"
              placeholder="Marvel, One Piece, DC, Disney..."
            />
          </label>
          <label className="block">
            <span className="text-sm font-semibold text-[var(--foreground)]">
              Observacoes da assinatura
            </span>
            <textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              rows={4}
              maxLength={1000}
              className="mt-2 w-full rounded-lg border border-[var(--border)] bg-[var(--background)]/45 px-3 py-3 text-sm outline-none focus:border-[var(--accent)]"
              placeholder="Restricoes, linhas favoritas, preferencia de envio..."
            />
          </label>
        </div>

        {error ? (
          <p className="mt-4 rounded-md border border-red-300/30 bg-red-500/12 px-3 py-2 text-sm font-semibold text-red-200">
            {error}
          </p>
        ) : null}

        <button
          type="button"
          disabled={isSubmitting}
          onClick={submitSubscription}
          className="mt-5 inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-[var(--yellow)] px-5 text-sm font-black text-[#020617] hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="animate-spin" size={17} aria-hidden="true" />
              Criando assinatura...
            </>
          ) : (
            `Confirmar ${selectedPlan.name}`
          )}
        </button>
      </section>
      <PopFlixPlanSummaryCard plan={selectedPlan} />
    </div>
  );
}
