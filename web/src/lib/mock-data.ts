import type { Product } from "@/types/product";

export const franchises = [
  { id: "one-piece", name: "One Piece", slug: "one-piece" },
  { id: "marvel", name: "Marvel", slug: "marvel" },
  { id: "disney", name: "Disney", slug: "disney" },
  { id: "naruto", name: "Naruto", slug: "naruto" },
  { id: "star-wars", name: "Star Wars", slug: "star-wars" },
];

export const products: Product[] = [
  {
    category: "Animes",
    id: "prod-001",
    name: "Funko Pop! One Piece Luffy Gear Five",
    slug: "funko-pop-one-piece-luffy-gear-five",
    sku: "SF-OP-0001",
    franchise: "One Piece",
    funkoNumber: "1607",
    condition: "Novo",
    type: "Exclusivo",
    source: "Pronta-entrega",
    price: 219.9,
    marketPrice: 249.9,
    status: "available",
    specialTags: ["Exclusivo"],
    description:
      "Figura colecionavel com caixa original. Unidade pronta para reserva pelo atendimento.",
    subcategory: "One Piece",
    tone: "teal",
  },
  {
    category: "Heróis/Vilões",
    id: "prod-002",
    name: "Funko Pop! Marvel Spider-Man Symbiote",
    slug: "funko-pop-marvel-spider-man-symbiote",
    sku: "SF-MV-0007",
    franchise: "Marvel",
    funkoNumber: "1430",
    condition: "Novo",
    type: "Glow",
    source: "Encomenda nacional",
    price: 189.9,
    status: "order_only",
    specialTags: ["Glow"],
    description:
      "Item sob consulta com fornecedor nacional. Prazo e disponibilidade confirmados pelo WhatsApp.",
    subcategory: "Marvel",
    tone: "pink",
  },
  {
    category: "Disney",
    id: "prod-003",
    name: "Funko Pop! Disney Stitch Halloween",
    slug: "funko-pop-disney-stitch-halloween",
    sku: "SF-DS-0012",
    franchise: "Disney",
    funkoNumber: "1595",
    condition: "Novo",
    type: "Especial",
    isSpecial: true,
    source: "Pre-venda",
    price: 169.9,
    status: "preorder",
    specialTags: ["Especial"],
    description:
      "Pre-venda acompanhada pela Smart Funkos, com status atualizado na conta do cliente.",
    subcategory: "Stitch",
    tone: "amber",
  },
  {
    category: "Filmes e Séries",
    id: "prod-004",
    name: "Funko Pop! Star Wars Darth Vader Exclusivo",
    slug: "funko-pop-star-wars-darth-vader-exclusivo",
    sku: "SF-SW-0009",
    franchise: "Star Wars",
    funkoNumber: "157",
    condition: "Caixa avariada",
    type: "Exclusivo",
    source: "Pronta-entrega",
    price: 299.9,
    marketPrice: 349.9,
    status: "available",
    specialTags: ["Exclusivo"],
    description:
      "Unidade rara com detalhe informado na caixa. Fotos finais devem ser confirmadas no atendimento.",
    subcategory: "Star Wars",
    tone: "indigo",
  },
];

export function getProductBySlug(slug: string) {
  return products.find((product) => product.slug === slug);
}
