import type { Metadata } from "next";
import {
  CommercialProductPage,
  type CommercialPageSearchParams,
} from "@/components/storefront/commercial-product-page";

export const metadata: Metadata = {
  title: "Specials",
  description: "Chase, exclusivos, glow, especiais e colecionáveis com rótulos premium.",
  alternates: {
    canonical: "/specials",
  },
  openGraph: {
    title: "Specials | Smart Funkos",
    description: "Produtos especiais, exclusivos e colecionáveis destacados.",
    images: ["/brand/SmartFunko.png"],
  },
};

export default function SpecialsPage({
  searchParams,
}: {
  searchParams?: Promise<CommercialPageSearchParams>;
}) {
  return (
    <CommercialProductPage
      config={{
        emptyDescription:
          "Quando houver produtos com tipo especial, special label ou tags especiais, eles aparecem aqui.",
        filter: "specials",
        pathname: "/specials",
        sort: "specials_first",
        subtitle:
          "Chase, exclusivos, glow, especiais e peças com rótulos premium no catálogo ativo.",
        title: "Specials",
      }}
      searchParams={searchParams}
    />
  );
}

