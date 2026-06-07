import type { Metadata } from "next";
import {
  CommercialProductPage,
  type CommercialPageSearchParams,
} from "@/components/storefront/commercial-product-page";

export const metadata: Metadata = {
  title: "Catálogo Smart Funkos",
  description: "Catálogo principal da Smart Funkos com produtos, pré-vendas, encomendas e peças especiais em um só lugar.",
  alternates: {
    canonical: "/catalogo",
  },
  openGraph: {
    title: "Catálogo Smart Funkos",
    description: "Explore produtos, pré-vendas, encomendas e peças especiais em um só lugar.",
    images: ["/brand/SmartFunko.png"],
  },
};

type Props = {
  searchParams: Promise<CommercialPageSearchParams>;
};

export default function CatalogPage({ searchParams }: Props) {
  return (
    <CommercialProductPage
      config={{
        emptyDescription:
          "Tente ajustar busca, categoria, franquia ou ordenação.",
        filter: "all",
        pathname: "/catalogo",
        showSubcategoryFilter: true,
        sort: "relevance",
        subtitle:
          "Explore produtos, pré-vendas, encomendas e peças especiais em um só lugar.",
        title: "Catálogo Smart Funkos",
      }}
      searchParams={searchParams}
    />
  );
}
