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
    `Olá! Tenho interesse no produto ${product.name} (${product.sku || product.slug}).`,
    "",
    `Preço: ${formatCurrency(product.price)}`,
    `Link: ${productUrl}`,
    "",
    "Pode verificar disponibilidade e condições?",
  ].join("\n");

  return createWhatsAppTextUrl(message);
}

export function createCartWhatsAppUrl({
  customerContact,
  customerName,
  items,
}: {
  customerContact?: string | null;
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
    "Olá! Quero verificar disponibilidade dos produtos abaixo:",
    "",
    customerName ? `Cliente: ${customerName}` : undefined,
    customerContact ? `Contato: ${customerContact}` : undefined,
    customerName || customerContact ? "" : undefined,
    ...items.flatMap((item) => [
      `${item.quantity}x ${item.name} — SKU: ${item.sku || item.slug} — ${formatCurrency(item.price)}`,
      `Link: ${baseUrl}/produto/${item.slug}`,
      "",
    ]),
    `Total estimado: ${formatCurrency(total)}`,
    "",
    "Pode confirmar disponibilidade e condições? Entendo que a disponibilidade será confirmada pelo atendimento.",
  ]
    .filter((line): line is string => line !== undefined)
    .join("\n");

  return createWhatsAppTextUrl(message);
}
