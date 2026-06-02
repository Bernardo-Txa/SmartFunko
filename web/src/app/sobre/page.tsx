import type { Metadata } from "next";
import { StaticPage } from "@/components/layout/static-page";

export const metadata: Metadata = {
  title: "Sobre",
};

export default function AboutPage() {
  return (
    <StaticPage title="Sobre a Smart Funkos">
      <p>
        A Smart Funkos organiza atendimento, catalogo e acompanhamento de pedidos
        para colecionadores.
      </p>
      <p>
        A V1 trabalha com venda assistida pelo WhatsApp e historico do cliente no site.
      </p>
    </StaticPage>
  );
}
