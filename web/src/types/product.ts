export type ProductStatus = "available" | "order_only" | "preorder" | "sold_out";

export type ProductCondition = "Novo" | "Usado" | "Caixa avariada";

export type ProductType = "Comum" | "Exclusivo" | "Chase" | "Glow" | "Especial";

export type ProductSource =
  | "Pronta-entrega"
  | "Encomenda nacional"
  | "Importado"
  | "Pre-venda";

export type ProductTone = "teal" | "pink" | "amber" | "indigo";

export type Product = {
  category?: string;
  condition: ProductCondition;
  description: string;
  franchise: string;
  funkoNumber: string;
  id: string;
  imageAlt?: string;
  imageUrl?: string;
  images?: string[];
  isSpecial?: boolean;
  marketPrice?: number;
  name: string;
  price: number;
  sku: string;
  slug: string;
  specialLabel?: string;
  specialTags?: string[];
  source: ProductSource;
  status: ProductStatus;
  subcategory?: string;
  tone: ProductTone;
  type: ProductType;
};
