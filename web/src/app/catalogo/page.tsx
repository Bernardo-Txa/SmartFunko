import type { Metadata } from "next";
import {
  CatalogPageContent,
  type CatalogPageSearchParams,
} from "@/components/storefront/catalog-page-content";

export const metadata: Metadata = {
  title: "Catálogo Smart Funkos",
  description: "Catálogo principal da Smart Funkos com produtos, categorias e linhas em um só lugar.",
  alternates: {
    canonical: "/catalogo",
  },
  openGraph: {
    title: "Catálogo Smart Funkos",
    description: "Explore produtos, categorias e linhas em um só lugar.",
    images: ["/brand/SmartFunko.png"],
  },
};

type Props = {
  searchParams: Promise<CatalogPageSearchParams>;
};

export default function CatalogPage({ searchParams }: Props) {
  return <CatalogPageContent searchParams={searchParams} />;
}
