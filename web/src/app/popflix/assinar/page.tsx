import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, LockKeyhole } from "lucide-react";
import {
  PopFlixPlanSummaryCard,
  PopFlixSubscribeForm,
} from "@/components/popflix/popflix-subscribe-form";
import { getPopFlixPlan, normalizePopFlixPlanSlug } from "@/lib/popflix";
import { getCurrentUser } from "@/server/auth/get-current-user";

export const metadata: Metadata = {
  title: "Assinar PopFlix",
  description: "Escolha e registre sua assinatura PopFlix pelo sistema Smart Funkos.",
  alternates: {
    canonical: "/popflix/assinar",
  },
};

type Props = {
  searchParams?: Promise<{
    plan?: string;
  }>;
};

function PageIntro() {
  return (
    <>
      <p className="text-xs font-black uppercase tracking-[0.2em] text-[var(--yellow)]">
        PopFlix
      </p>
      <h1 className="mt-2 text-3xl font-black text-[var(--foreground)] sm:text-4xl">
        Assinar pelo sistema
      </h1>
      <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--muted)]">
        O PopFlix agora nasce como assinatura vinculada a conta do cliente,
        sem depender de um fluxo externo para iniciar o processo.
      </p>
    </>
  );
}

export default async function PopFlixSubscribePage({ searchParams }: Props) {
  const params = await searchParams;
  const planSlug = normalizePopFlixPlanSlug(params?.plan);
  const plan = getPopFlixPlan(planSlug);
  const currentUser = await getCurrentUser();
  const nextPath = `/popflix/assinar?plan=${plan.slug}`;
  const authNext = encodeURIComponent(nextPath);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <Link
        href="/popflix"
        className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--accent)] hover:underline"
      >
        <ArrowLeft size={16} aria-hidden="true" />
        Voltar para PopFlix
      </Link>

      {currentUser?.customer ? (
        <div className="mt-6">
          <PageIntro />
          <div className="mt-6">
            <PopFlixSubscribeForm
              customerName={currentUser.customer.name || currentUser.profile.name}
              initialPlanSlug={plan.slug}
            />
          </div>
        </div>
      ) : (
        <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_360px]">
          <div>
            <PageIntro />
            <div className="mt-6">
              {!currentUser ? (
                <section className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5">
                  <LockKeyhole className="text-[var(--yellow)]" size={26} aria-hidden="true" />
                  <h2 className="mt-4 text-2xl font-black text-[var(--foreground)]">
                    Entre para continuar
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                    A assinatura precisa ficar ligada a uma conta Smart Funkos para
                    acompanhar plano, status e cobrancas.
                  </p>
                  <div className="mt-5 flex flex-wrap gap-3">
                    <Link
                      href={`/login?next=${authNext}`}
                      className="inline-flex h-11 items-center justify-center rounded-full bg-[var(--yellow)] px-5 text-sm font-black text-[#020617] hover:brightness-110"
                    >
                      Entrar
                    </Link>
                    <Link
                      href={`/cadastro?next=${authNext}`}
                      className="inline-flex h-11 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--surface-strong)] px-5 text-sm font-black text-[var(--foreground)] hover:bg-cyan-400/10"
                    >
                      Criar conta
                    </Link>
                  </div>
                </section>
              ) : (
                <section className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5">
                  <h2 className="text-2xl font-black text-[var(--foreground)]">
                    Cadastro de cliente pendente
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                    Complete os dados da conta antes de ativar uma assinatura.
                  </p>
                  <Link
                    href="/conta"
                    className="mt-5 inline-flex h-11 items-center justify-center rounded-full bg-[var(--yellow)] px-5 text-sm font-black text-[#020617] hover:brightness-110"
                  >
                    Abrir minha conta
                  </Link>
                </section>
              )}
            </div>
          </div>

          <PopFlixPlanSummaryCard plan={plan} />
        </div>
      )}
    </div>
  );
}
