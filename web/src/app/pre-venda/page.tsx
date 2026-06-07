import type { Metadata } from "next";
import {
  CommercialProductPage,
  type CommercialPageSearchParams,
} from "@/components/storefront/commercial-product-page";

export const metadata: Metadata = {
  title: "Pré-venda",
  description: "Pré-vendas acompanhadas pela Smart Funkos, com prazos confirmados pelo atendimento.",
  alternates: {
    canonical: "/pre-venda",
  },
  openGraph: {
    title: "Pré-venda | Smart Funkos",
    description: "Itens de pré-venda com acompanhamento e atendimento assistido.",
    images: ["/brand/SmartFunko.png"],
  },
};

export default function PreOrderPage({
  searchParams,
}: {
  searchParams?: Promise<CommercialPageSearchParams>;
}) {
  return (
    <CommercialProductPage
      config={{
        emptyDescription:
          "Nenhum item de pré-venda ativo agora. Prazos podem variar e são confirmados antes da reserva.",
        filter: "preorder",
        pathname: "/pre-venda",
        sort: "newest",
        subtitle:
          "Pré-vendas selecionadas. Prazos podem variar e sempre são confirmados pelo atendimento.",
        title: "Pré-venda",
      }}
      searchParams={searchParams}
    />
  );
}

