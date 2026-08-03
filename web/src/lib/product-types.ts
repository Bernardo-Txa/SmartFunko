export const productTypeOptions = [
  { label: "Funko Pop", value: "funko_pop" },
  { label: "Boneco / Figure", value: "figure" },
  { label: "Card", value: "card" },
  { label: "Album", value: "album" },
  { label: "HQ / Manga", value: "comic_manga" },
  { label: "Acessorio", value: "accessory" },
  { label: "Caixa protetora", value: "protector" },
  { label: "Vestuario", value: "apparel" },
  { label: "Jogo", value: "game" },
  { label: "Outro", value: "other" },
] as const;

export type ProductTypeValue = (typeof productTypeOptions)[number]["value"];

const productTypeLabels = Object.fromEntries(
  productTypeOptions.map((option) => [option.value, option.label]),
) as Record<ProductTypeValue, string>;

export function getProductTypeLabel(value: string | null | undefined) {
  return productTypeLabels[(value ?? "") as ProductTypeValue] ?? "Funko Pop";
}

export function normalizeProductType(value: string | null | undefined): ProductTypeValue {
  return productTypeOptions.some((option) => option.value === value)
    ? value as ProductTypeValue
    : "funko_pop";
}
