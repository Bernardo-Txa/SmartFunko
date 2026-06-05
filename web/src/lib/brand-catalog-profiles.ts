import type { CatalogSupplier } from "@/lib/catalog";

type BrandCatalogTheme = {
  accentClassName: string;
  activeTabClassName: string;
  bandClassName: string;
  badgeClassName: string;
  heroClassName: string;
};

export type BrandCatalogProfile = {
  catalogTitle: string;
  emptyState: string;
  headline: string;
  highlights: string[];
  name: string;
  sellingNotes: string[];
  slug: string;
  story: string;
  tabLabel: string;
  theme: BrandCatalogTheme;
};

const brandCatalogProfiles: Record<string, Omit<BrandCatalogProfile, "name">> = {
  copag: {
    catalogTitle: "Catalogo Copag: mesa, cartas e nostalgia",
    emptyState: "Ainda nao ha itens Copag cadastrados para este catalogo especial.",
    headline: "Produtos de cultura pop para quem coleciona tambem pela mesa.",
    highlights: ["Cartas e jogos", "Nostalgia", "Kits presenteaveis"],
    sellingNotes: [
      "Edicao, linha e estado precisam aparecer antes da decisao de compra.",
      "Produtos pronta-entrega e sob encomenda devem ficar bem separados no cadastro.",
      "Variantes por jogo ou edicao ajudam o cliente a comparar sem misturar linhas.",
    ],
    slug: "copag",
    story:
      "A marca Copag pede um catalogo mais direto: linha, edicao, condicao e disponibilidade. A compra aqui tem mais leitura de detalhe do que impulso visual.",
    tabLabel: "Copag",
    theme: {
      accentClassName: "text-red-200",
      activeTabClassName: "border-red-300 bg-red-300 text-slate-950",
      bandClassName: "border-red-300/30 bg-red-950/24",
      badgeClassName: "bg-red-300 text-slate-950",
      heroClassName: "border-red-300/35 bg-[linear-gradient(135deg,#1f0710_0%,#030816_52%,#1f1b05_100%)]",
    },
  },
  panini: {
    catalogTitle: "Catalogo Panini: editorial colecionavel",
    emptyState: "Ainda nao ha itens Panini cadastrados para este catalogo especial.",
    headline: "Albums, HQs, mangas e pecas editoriais com curadoria de colecionador.",
    highlights: ["Linha editorial", "Edicoes especiais", "Conservacao"],
    sellingNotes: [
      "Volume, edicao, idioma e estado de conservacao sao informacoes centrais.",
      "Universos e sagas devem orientar a organizacao dos produtos.",
      "Lacres, capas variantes e tiragens merecem destaque no cadastro.",
    ],
    slug: "panini",
    story:
      "A marca Panini funciona melhor como catalogo editorial. O cliente procura universo, edicao e condicao antes de escolher o item.",
    tabLabel: "Panini",
    theme: {
      accentClassName: "text-yellow-100",
      activeTabClassName: "border-yellow-300 bg-yellow-300 text-slate-950",
      bandClassName: "border-yellow-300/35 bg-yellow-950/18",
      badgeClassName: "bg-yellow-300 text-slate-950",
      heroClassName: "border-yellow-300/40 bg-[linear-gradient(135deg,#241a05_0%,#030816_50%,#10203d_100%)]",
    },
  },
  piticas: {
    catalogTitle: "Catalogo Piticas: drops geek e exclusivos",
    emptyState: "Ainda nao ha itens Piticas cadastrados para este catalogo especial.",
    headline: "Drops com pegada pop, lote curto e compra por oportunidade.",
    highlights: ["Drops limitados", "Personagens", "Exclusivos"],
    sellingNotes: [
      "Exclusivo, chase, lote curto e pronta-entrega precisam aparecer rapido.",
      "Preco e disponibilidade devem ficar claros porque esses itens giram mais rapido.",
      "Tags de personagem e universo ajudam a conectar produtos da mesma linha.",
    ],
    slug: "piticas",
    story:
      "A marca Piticas pede uma vitrine de drop: visual forte, leitura rapida e foco em oportunidade. O cliente precisa entender logo o que e limitado ou especial.",
    tabLabel: "Piticas",
    theme: {
      accentClassName: "text-orange-100",
      activeTabClassName: "border-orange-300 bg-orange-300 text-slate-950",
      bandClassName: "border-orange-300/30 bg-orange-950/22",
      badgeClassName: "bg-orange-300 text-slate-950",
      heroClassName: "border-orange-300/35 bg-[linear-gradient(135deg,#2b1202_0%,#030816_52%,#062432_100%)]",
    },
  },
};

const genericTheme: BrandCatalogTheme = {
  accentClassName: "text-slate-100",
  activeTabClassName: "border-slate-200 bg-slate-200 text-slate-950",
  bandClassName: "border-slate-400/25 bg-slate-900/55",
  badgeClassName: "bg-slate-200 text-slate-950",
  heroClassName: "border-slate-400/25 bg-[linear-gradient(135deg,#111827_0%,#030816_55%,#172033_100%)]",
};

export function getBrandCatalogProfile(supplier: CatalogSupplier): BrandCatalogProfile {
  const configured = brandCatalogProfiles[supplier.slug];

  if (configured) {
    return {
      ...configured,
      name: supplier.name,
    };
  }

  return {
    catalogTitle: `Catalogo ${supplier.name}`,
    emptyState: `Ainda nao ha itens ${supplier.name} cadastrados para este catalogo especial.`,
    headline: supplier.description ?? `Produtos selecionados da marca ${supplier.name}.`,
    highlights: ["Curadoria dedicada", "Produtos vinculados", "Atendimento pelo WhatsApp"],
    name: supplier.name,
    sellingNotes: [
      "Destacar regras, disponibilidade e observacoes proprias da marca.",
      "Manter imagens e descricoes consistentes para facilitar a decisao do cliente.",
      "Atualizar o cadastro da marca para personalizar logo, banner e link externo.",
    ],
    slug: supplier.slug,
    story: supplier.description ?? "Esta marca tem um catalogo especial proprio, separado do catalogo geral.",
    tabLabel: supplier.name,
    theme: genericTheme,
  };
}

export function getDefaultBrandSlug(suppliers: CatalogSupplier[]) {
  return suppliers.find((supplier) => supplier.slug === "piticas")?.slug ?? suppliers[0]?.slug ?? "piticas";
}
