import type { Metadata } from "next";
import {
  CommercialProductPage,
  type CommercialPageSearchParams,
} from "@/components/storefront/commercial-product-page";

export const metadata: Metadata = {
  title: "Encomendas",
  description: "Produtos sob encomenda e importação com confirmação pelo atendimento Smart Funkos.",
  alternates: {
    canonical: "/encomendas",
  },
  openGraph: {
    title: "Encomendas | Smart Funkos",
    description: "Itens sob encomenda/importação com atendimento assistido.",
    images: ["/brand/SmartFunko.png"],
  },
};

export default function OrdersOnlyPage({
  searchParams,
}: {
  searchParams?: Promise<CommercialPageSearchParams>;
}) {
  return (
    <CommercialProductPage
      config={{
        ctaMessage:
          "Olá! Quero falar sobre encomendas/importações com a Smart Funkos.",
        emptyDescription:
          "Nenhum produto sob encomenda ativo agora. Fale no WhatsApp para consultar importações e pedidos especiais.",
        filter: "order",
        pathname: "/encomendas",
        sort: "ready_first",
        subtitle:
          "Produtos sob encomenda ou importação. A disponibilidade, prazo e reserva são confirmados pelo atendimento.",
        title: "Encomendas",
      }}
      searchParams={searchParams}
    />
  );
}

