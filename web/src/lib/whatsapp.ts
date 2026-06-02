import type { Product } from "@/lib/mock-data";
import { formatCurrency } from "@/lib/format";

const fallbackPhone = "5511999999999";

export function createProductWhatsAppUrl(product: Product) {
  const phone = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? fallbackPhone;
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://smartfunko.com.br";
  const productUrl = `${baseUrl}/produto/${product.slug}`;
  const message = [
    "Oi! Tenho interesse neste produto da Smart Funkos:",
    "",
    `Produto: ${product.name}`,
    `Codigo: ${product.sku}`,
    `Preco: ${formatCurrency(product.price)}`,
    `Link: ${productUrl}`,
    "",
    "Pode me confirmar disponibilidade?",
  ].join("\n");

  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
}
