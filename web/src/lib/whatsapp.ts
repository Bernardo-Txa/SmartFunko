import type { Product } from "@/types/product";
import { formatCurrency } from "@/lib/format";

const fallbackPhone = "5511999999999";

function getWhatsAppPhone() {
  return process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || fallbackPhone;
}

export function createWhatsAppTextUrl(message: string) {
  return `https://wa.me/${getWhatsAppPhone()}?text=${encodeURIComponent(message)}`;
}

export function createProductWhatsAppUrl(product: Product) {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://smartfunko.com.br";
  const productUrl = `${baseUrl}/produto/${product.slug}`;
  const message = [
    `Olá! Tenho interesse no ${product.name} (${product.sku || product.slug}).`,
    "",
    `Preço: ${formatCurrency(product.price)}`,
    `Link: ${productUrl}`,
    "",
    "Pode verificar disponibilidade?",
  ].join("\n");

  return createWhatsAppTextUrl(message);
}

export function createCartWhatsAppUrl({
  customerName,
  items,
}: {
  customerName?: string | null;
  items: Array<{
    name: string;
    price: number;
    quantity: number;
    sku: string;
    slug: string;
  }>;
}) {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://smartfunko.com.br";
  const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const message = [
    "Olá! Quero finalizar esta intenção de compra com a Smart Funkos:",
    "",
    customerName ? `Cliente: ${customerName}` : undefined,
    ...items.flatMap((item, index) => [
      `${index + 1}. ${item.name}`,
      `SKU: ${item.sku}`,
      `Quantidade: ${item.quantity}`,
      `Valor unitário: ${formatCurrency(item.price)}`,
      `Link: ${baseUrl}/produto/${item.slug}`,
      "",
    ]),
    `Total estimado: ${formatCurrency(total)}`,
    "",
    "Pode verificar disponibilidade e próximos passos pelo atendimento?",
  ]
    .filter(Boolean)
    .join("\n");

  return createWhatsAppTextUrl(message);
}
