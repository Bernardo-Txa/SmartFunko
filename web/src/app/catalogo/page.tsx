import type { Metadata } from "next";
import {
  CatalogPageContent,
  type CatalogPageSearchParams,
} from "@/components/storefront/catalog-page-content";
import { ogImages } from "@/lib/seo";

export const metadata: Metadata = {
  title: {
    absolute: "Catálogo Smart Funkos — Funkos, figures e colecionáveis",
  },
  description:
    "Explore o catálogo da Smart Funkos com produtos para colecionadores, encomendas, especiais e collabs.",
  alternates: {
    canonical: "/catalogo",
  },
  openGraph: {
    title: "Catálogo Smart Funkos — Funkos, figures e colecionáveis",
    description:
      "Explore o catálogo da Smart Funkos com produtos para colecionadores, encomendas, especiais e collabs.",
    images: ogImages(),
    type: "website",
    url: "/catalogo",
  },
  twitter: {
    card: "summary_large_image",
    description:
      "Explore o catálogo da Smart Funkos com produtos para colecionadores, encomendas, especiais e collabs.",
    images: ["/og/smart-funkos-og.png"],
    title: "Catálogo Smart Funkos — Funkos, figures e colecionáveis",
  },
};

type Props = {
  searchParams: Promise<CatalogPageSearchParams>;
};

export default function CatalogPage({ searchParams }: Props) {
  return <CatalogPageContent searchParams={searchParams} />;
}
