import type { Metadata } from "next";
import { StaticPage } from "@/components/layout/static-page";

export const metadata: Metadata = {
  title: "Pre-venda e encomendas",
};

export default function PreorderPage() {
  return (
    <StaticPage title="Pre-venda e encomendas">
      <p>
        Produtos de pre-venda ou encomenda sao confirmados no WhatsApp antes da criacao
        do pedido.
      </p>
      <p>
        Cada item tem status proprio para acompanhar compra, transito, recebimento e
        envio.
      </p>
    </StaticPage>
  );
}
