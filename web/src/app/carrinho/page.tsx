import type { Metadata } from "next";
import { AssistedCart } from "@/components/storefront/assisted-cart";
import { getCurrentUser } from "@/server/auth/get-current-user";

export const metadata: Metadata = {
  title: "Carrinho assistido",
  description:
    "Monte uma intenção de compra e receba o link de pagamento após aprovação da Smart Funkos.",
  alternates: {
    canonical: "/carrinho",
  },
  openGraph: {
    title: "Carrinho assistido | Smart Funkos",
    description:
      "Carrinho local para montar intenção de compra e finalizar pelo atendimento.",
    images: ["/brand/SmartFunko.png"],
  },
};

export default async function CartPage() {
  const currentUser = await getCurrentUser();
  const customerName =
    currentUser?.customer?.name || currentUser?.profile.name || currentUser?.authUser.email;
  const customerContact =
    currentUser?.customer?.phone || currentUser?.customer?.email || currentUser?.profile.email;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6">
        <h1 className="text-3xl font-black text-[var(--foreground)]">Carrinho assistido</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--muted)]">
          Monte sua intenção de compra no site. A Smart Funkos aprova disponibilidade e libera o pagamento por link.
        </p>
      </div>
      <AssistedCart customerContact={customerContact} customerName={customerName} />
    </div>
  );
}
