import type { Metadata } from "next";
import {
  CommercialProductPage,
  type CommercialPageSearchParams,
} from "@/components/storefront/commercial-product-page";

export const metadata: Metadata = {
  title: "Catalogo",
  description: "Catalogo publico da Smart Funkos com pronta-entrega, pre-venda, encomendas e colecionaveis especiais.",
  alternates: {
    canonical: "/catalogo",
  },
  openGraph: {
    title: "Catalogo | Smart Funkos",
    description: "Explore produtos ativos, colecionaveis especiais e vitrines comerciais da Smart Funkos.",
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
        allowFilterParam: true,
        emptyDescription:
          "Use busca, categoria, fornecedor e ordenação para encontrar produtos ativos no catálogo.",
        filter: "all",
        pathname: "/catalogo",
        showSubcategoryFilter: true,
        sort: "ready_first",
        subtitle:
          "Catálogo geral com a mesma experiência premium das vitrines comerciais.",
        title: "Catálogo",
      }}
      searchParams={searchParams}
    />
  );
}
