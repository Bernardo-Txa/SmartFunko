import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, CreditCard, Crown, ExternalLink } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/format";
import { requireUserPage } from "@/server/auth/require-user-page";
import { PopFlixSubscriptionService } from "@/server/popflix/popflix-subscription-service";

export const metadata: Metadata = {
  title: "Minhas assinaturas PopFlix",
};

type PopFlixSubscription = Awaited<
  ReturnType<PopFlixSubscriptionService["listCustomerSubscriptions"]>
>[number];

function statusLabel(status: string) {
  const labels: Record<string, string> = {
    active: "Ativa",
    cancelled: "Cancelada",
    expired: "Expirada",
    paused: "Pausada",
    pending_payment: "Aguardando pagamento",
  };

  return labels[status] ?? status;
}

function statusClassName(status: string) {
  if (status === "active") {
    return "border-emerald-300/35 bg-emerald-500/12 text-emerald-200";
  }

  if (status === "pending_payment") {
    return "border-yellow-300/40 bg-yellow-300/12 text-yellow-100";
  }

  return "border-[var(--border)] bg-[var(--surface-strong)] text-[var(--muted)]";
}

function paymentStatusLabel(status: string) {
  const labels: Record<string, string> = {
    cancelled: "Pagamento cancelado",
    expired: "Pagamento expirado",
    failed: "Pagamento falhou",
    manual_review: "Pagamento em revisao",
    paid: "Pagamento confirmado",
    pending: "Pagamento pendente",
  };

  return labels[status] ?? status;
}

function AccountPopFlixErrorState() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <section className="rounded-lg border border-red-300/24 bg-red-950/20 p-5">
        <h1 className="text-2xl font-black text-[var(--foreground)]">
          Minhas assinaturas PopFlix
        </h1>
        <p className="mt-2 text-sm text-red-100">
          Nao foi possivel carregar suas assinaturas agora.
        </p>
      </section>
    </div>
  );
}

function EmptyState() {
  return (
    <section className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5">
      <Crown className="text-[var(--yellow)]" size={26} aria-hidden="true" />
      <h2 className="mt-4 text-2xl font-black text-[var(--foreground)]">
        Nenhuma assinatura ainda
      </h2>
      <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
        Escolha um plano PopFlix para deixar a assinatura registrada na sua conta.
      </p>
      <Link
        href="/popflix/assinar"
        className="mt-5 inline-flex h-11 items-center gap-2 rounded-full bg-[var(--yellow)] px-5 text-sm font-black text-[#020617] hover:brightness-110"
      >
        Assinar PopFlix
        <ArrowRight size={16} aria-hidden="true" />
      </Link>
    </section>
  );
}

function SubscriptionCard({ subscription }: { subscription: PopFlixSubscription }) {
  return (
    <article className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-xl font-black text-[var(--foreground)]">
              {subscription.subscriptionCode}
            </h2>
            <span
              className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-black uppercase tracking-[0.08em] ${statusClassName(subscription.status)}`}
            >
              {statusLabel(subscription.status)}
            </span>
          </div>
          <p className="mt-2 text-sm text-[var(--muted)]">
            Plano {subscription.plan.name} · criado em {formatDate(subscription.createdAt)}
          </p>
          {subscription.favoriteFranchises ? (
            <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
              Franquias: {subscription.favoriteFranchises}
            </p>
          ) : null}
          {subscription.notes ? (
            <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
              Observacoes: {subscription.notes}
            </p>
          ) : null}
        </div>
        <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-strong)] p-3 md:text-right">
          <span className="block text-xs font-semibold text-[var(--muted)]">Mensalidade</span>
          <strong className="text-xl text-[var(--foreground)]">
            {formatCurrency(subscription.monthlyPrice)}
          </strong>
          <span className="mt-1 block text-xs text-[var(--muted)]">
            Proxima cobranca: {subscription.nextBillingAt ? formatDate(subscription.nextBillingAt) : "-"}
          </span>
        </div>
      </div>
      {subscription.status === "pending_payment" ? (
        <div className="mt-4 rounded-lg border border-yellow-300/24 bg-yellow-300/10 p-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm font-bold text-[var(--foreground)]">
                {paymentStatusLabel(subscription.paymentStatus)}
              </p>
              <p className="mt-1 text-sm leading-6 text-[var(--muted)]">
                {subscription.paymentLinkUrl
                  ? "Finalize a mensalidade no checkout seguro da InfinitePay."
                  : "A cobranca ainda nao tem link. A Smart Funkos pode gerar pelo painel admin."}
              </p>
            </div>
            {subscription.paymentLinkUrl ? (
              <a
                href={subscription.paymentLinkUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-full bg-[var(--yellow)] px-5 text-sm font-black text-[#020617] hover:brightness-110"
              >
                <CreditCard size={16} aria-hidden="true" />
                Pagar agora
                <ExternalLink size={15} aria-hidden="true" />
              </a>
            ) : null}
          </div>
        </div>
      ) : null}
    </article>
  );
}

export default async function AccountPopFlixPage() {
  const { customer } = await requireUserPage("/conta/popflix");

  if (!customer) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <section className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5">
          <h1 className="text-2xl font-black text-[var(--foreground)]">
            Minhas assinaturas PopFlix
          </h1>
          <p className="mt-2 text-sm text-[var(--muted)]">
            Nenhum cadastro de cliente vinculado a este login ainda.
          </p>
        </section>
      </div>
    );
  }

  let subscriptions: PopFlixSubscription[] = [];

  try {
    subscriptions = await new PopFlixSubscriptionService().listCustomerSubscriptions(customer.id);
  } catch (error) {
    console.error("[AccountPopFlixPage] failed to load subscriptions", {
      customerId: customer.id,
      error,
    });
    return <AccountPopFlixErrorState />;
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6">
        <h1 className="text-3xl font-black text-[var(--foreground)]">
          Minhas assinaturas PopFlix
        </h1>
        <p className="mt-2 text-sm text-[var(--muted)]">
          Planos e status vinculados ao seu cadastro Smart Funkos.
        </p>
      </div>

      <div className="grid gap-4">
        {subscriptions.length > 0 ? (
          subscriptions.map((subscription) => (
            <SubscriptionCard key={subscription.id} subscription={subscription} />
          ))
        ) : (
          <EmptyState />
        )}
      </div>
    </div>
  );
}
