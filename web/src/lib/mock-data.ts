export type ProductStatus = "available" | "order_only" | "preorder" | "sold_out";

export type Product = {
  id: string;
  name: string;
  slug: string;
  sku: string;
  franchise: string;
  funkoNumber: string;
  condition: "Novo" | "Usado" | "Caixa avariada";
  type: "Comum" | "Exclusivo" | "Chase" | "Glow" | "Especial";
  source: "Pronta-entrega" | "Encomenda nacional" | "Importado" | "Pre-venda";
  price: number;
  marketPrice?: number;
  status: ProductStatus;
  description: string;
  tone: "teal" | "pink" | "amber" | "indigo";
};

export type CustomerOrder = {
  orderNumber: string;
  customerName: string;
  status: "pending_payment" | "paid" | "processing" | "ready_to_ship" | "shipped";
  total: number;
  paidAmount: number;
  updatedAt: string;
  items: Array<{
    name: string;
    sku: string;
    status: string;
    quantity: number;
    unitPrice: number;
  }>;
};

export const franchises = [
  { id: "one-piece", name: "One Piece", slug: "one-piece" },
  { id: "marvel", name: "Marvel", slug: "marvel" },
  { id: "disney", name: "Disney", slug: "disney" },
  { id: "naruto", name: "Naruto", slug: "naruto" },
];

export const products: Product[] = [
  {
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
    description:
      "Figura colecionavel com caixa original. Unidade pronta para reserva pelo atendimento.",
    tone: "teal",
  },
  {
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
    description:
      "Item sob consulta com fornecedor nacional. Prazo e disponibilidade confirmados pelo WhatsApp.",
    tone: "pink",
  },
  {
    id: "prod-003",
    name: "Funko Pop! Disney Stitch Halloween",
    slug: "funko-pop-disney-stitch-halloween",
    sku: "SF-DS-0012",
    franchise: "Disney",
    funkoNumber: "1595",
    condition: "Novo",
    type: "Especial",
    source: "Pre-venda",
    price: 169.9,
    status: "preorder",
    description:
      "Pre-venda acompanhada pela Smart Funkos, com status atualizado na conta do cliente.",
    tone: "amber",
  },
  {
    id: "prod-004",
    name: "Funko Pop! Naruto Kakashi Anbu",
    slug: "funko-pop-naruto-kakashi-anbu",
    sku: "SF-NT-0009",
    franchise: "Naruto",
    funkoNumber: "994",
    condition: "Caixa avariada",
    type: "Chase",
    source: "Pronta-entrega",
    price: 299.9,
    marketPrice: 349.9,
    status: "available",
    description:
      "Unidade rara com detalhe informado na caixa. Fotos finais devem ser confirmadas no atendimento.",
    tone: "indigo",
  },
];

export const orders: CustomerOrder[] = [
  {
    orderNumber: "SF-2026-000123",
    customerName: "Cliente Smart",
    status: "processing",
    total: 389.8,
    paidAmount: 389.8,
    updatedAt: "2026-06-02",
    items: [
      {
        name: "Funko Pop! One Piece Luffy Gear Five",
        sku: "SF-OP-0001",
        status: "Reservado",
        quantity: 1,
        unitPrice: 219.9,
      },
      {
        name: "Funko Pop! Disney Stitch Halloween",
        sku: "SF-DS-0012",
        status: "Pre-venda",
        quantity: 1,
        unitPrice: 169.9,
      },
    ],
  },
  {
    orderNumber: "SF-2026-000124",
    customerName: "Cliente Smart",
    status: "pending_payment",
    total: 189.9,
    paidAmount: 0,
    updatedAt: "2026-06-02",
    items: [
      {
        name: "Funko Pop! Marvel Spider-Man Symbiote",
        sku: "SF-MV-0007",
        status: "Aguardando pagamento",
        quantity: 1,
        unitPrice: 189.9,
      },
    ],
  },
];

export function getProductBySlug(slug: string) {
  return products.find((product) => product.slug === slug);
}

export function getOrderByNumber(orderNumber: string) {
  return orders.find((order) => order.orderNumber === orderNumber);
}
