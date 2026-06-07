import type { Metadata } from "next";
import {
  CommercialProductPage,
  type CommercialPageSearchParams,
} from "@/components/storefront/commercial-product-page";

export const metadata: Metadata = {
  title: "Novidades",
  description: "Produtos mais recentes do catálogo ativo da Smart Funkos.",
  alternates: {
    canonical: "/novidades",
  },
  openGraph: {
    title: "Novidades | Smart Funkos",
    description: "Entradas recentes no catálogo Smart Funkos.",
    images: ["/brand/SmartFunko.png"],
  },
};

export default function NewProductsPage({
  searchParams,
}: {
  searchParams?: Promise<CommercialPageSearchParams>;
}) {
  return (
    <CommercialProductPage
      config={{
        emptyDescription:
          "Quando novos produtos ativos entrarem no catálogo, eles aparecem aqui por data de cadastro.",
        filter: "new",
        pathname: "/novidades",
        sort: "newest",
        subtitle: "Produtos mais recentes do catálogo ativo.",
        title: "Novidades",
      }}
      searchParams={searchParams}
    />
  );
}

