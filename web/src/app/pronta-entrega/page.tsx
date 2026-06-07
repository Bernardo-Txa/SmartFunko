import type { Metadata } from "next";
import {
  CommercialProductPage,
  type CommercialPageSearchParams,
} from "@/components/storefront/commercial-product-page";

export const metadata: Metadata = {
  title: "Pronta-entrega",
  description: "Produtos disponíveis para reservar agora na Smart Funkos.",
  alternates: {
    canonical: "/pronta-entrega",
  },
  openGraph: {
    title: "Pronta-entrega | Smart Funkos",
    description: "Produtos disponíveis para reservar agora.",
    images: ["/brand/SmartFunko.png"],
  },
};

export default function ReadyPage({
  searchParams,
}: {
  searchParams?: Promise<CommercialPageSearchParams>;
}) {
  return (
    <CommercialProductPage
      config={{
        emptyDescription:
          "Quando houver produtos com estoque próprio ou status disponível, eles aparecem aqui.",
        filter: "ready",
        pathname: "/pronta-entrega",
        sort: "ready_first",
        subtitle: "Produtos disponíveis para reservar agora.",
        title: "Pronta-entrega",
      }}
      searchParams={searchParams}
    />
  );
}

