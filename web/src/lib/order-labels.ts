export const orderSellerOptions = [
  { label: "Daniel", value: "daniel" },
  { label: "Allana", value: "allana" },
] as const;

export const orderItemSourceOptions = [
  { label: "Pronta-entrega", value: "stock" },
  { label: "Encomenda nacional", value: "national_order" },
  { label: "Importado", value: "international_order" },
  { label: "Pré-venda", value: "preorder" },
  { label: "Leilão", value: "auction" },
] as const;

export type OrderSeller = (typeof orderSellerOptions)[number]["value"];
export type OrderItemSource = (typeof orderItemSourceOptions)[number]["value"];

export const orderSellerLabels: Record<OrderSeller, string> = Object.fromEntries(
  orderSellerOptions.map((option) => [option.value, option.label]),
) as Record<OrderSeller, string>;

export const orderItemSourceLabels: Record<OrderItemSource, string> = Object.fromEntries(
  orderItemSourceOptions.map((option) => [option.value, option.label]),
) as Record<OrderItemSource, string>;

export function getOrderSellerLabel(seller: string | null | undefined) {
  return seller && seller in orderSellerLabels
    ? orderSellerLabels[seller as OrderSeller]
    : "Sem vendedor";
}

export function getOrderItemSourceLabel(source: string | null | undefined) {
  return source && source in orderItemSourceLabels
    ? orderItemSourceLabels[source as OrderItemSource]
    : source || "Sem origem";
}
