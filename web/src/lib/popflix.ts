export const POPFLIX_PLAN_SLUGS = ["basic", "deluxe", "premium"] as const;

export type PopFlixPlanSlug = (typeof POPFLIX_PLAN_SLUGS)[number];

export type PopFlixPlan = {
  badge?: string;
  ctaLabel: string;
  description: string;
  features: string[];
  name: string;
  price: number;
  short: string;
  slug: PopFlixPlanSlug;
};

export const POPFLIX_DEFAULT_PLAN_SLUG: PopFlixPlanSlug = "deluxe";

export const POPFLIX_PLANS: PopFlixPlan[] = [
  {
    ctaLabel: "Assinar Basico",
    description:
      "Entrada mensal para quem quer manter a colecao girando com curadoria surpresa.",
    features: [
      "1 Funko Pop por mes",
      "Tema mensal com franquias geek, anime, filmes ou series",
      "Card de curadoria com contexto da escolha",
      "Prioridade para upgrades quando houver estoque especial",
    ],
    name: "Basico",
    price: 109.9,
    short: "1 Pop selecionado",
    slug: "basic",
  },
  {
    badge: "Mais equilibrado",
    ctaLabel: "Assinar Deluxe",
    description:
      "Caixa mais encorpada para colecionador que gosta de surpresa, brinde e chance de exclusivo.",
    features: [
      "1 Funko Pop principal + 1 item colecionavel",
      "Maior chance de Chase, Glow, Special Edition ou exclusivo",
      "Brinde tematico do universo do mes",
      "Acesso antecipado a reservas e extras da caixa",
    ],
    name: "Deluxe",
    price: 199.99,
    short: "Pop + extra colecionavel",
    slug: "deluxe",
  },
  {
    ctaLabel: "Assinar Premium",
    description:
      "Plano de alto impacto para receber somente pecas top de linha e formatos especiais.",
    features: [
      "Curadoria com Comic Cover, Deluxe, Moment, Album, Ride ou linha equivalente",
      "Prioridade para pecas importadas, raras e tiragens especiais",
      "Ajuste por franquias preferidas antes da reserva mensal",
      "Atendimento dedicado para combinacoes de frete e upgrades",
    ],
    name: "Premium",
    price: 259.9,
    short: "Somente linha premium",
    slug: "premium",
  },
];

export function getPopFlixPlanBySlug(slug: PopFlixPlanSlug) {
  return POPFLIX_PLANS.find((plan) => plan.slug === slug) ?? POPFLIX_PLANS[1];
}

export function normalizePopFlixPlanSlug(value: string | null | undefined): PopFlixPlanSlug {
  return POPFLIX_PLAN_SLUGS.includes(value as PopFlixPlanSlug)
    ? (value as PopFlixPlanSlug)
    : POPFLIX_DEFAULT_PLAN_SLUG;
}

export function getPopFlixPlan(value: string | null | undefined) {
  return getPopFlixPlanBySlug(normalizePopFlixPlanSlug(value));
}
