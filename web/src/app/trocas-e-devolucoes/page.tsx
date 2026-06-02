import type { Metadata } from "next";
import { StaticPage } from "@/components/layout/static-page";

export const metadata: Metadata = {
  title: "Trocas e devolucoes",
};

export default function ReturnsPage() {
  return (
    <StaticPage title="Trocas e devolucoes">
      <p>
        Condicao do item e detalhes da caixa devem ficar registrados no pedido antes
        da confirmacao.
      </p>
      <p>
        Solicitacoes de troca ou devolucao sao analisadas pelo atendimento com base no
        historico do pedido.
      </p>
    </StaticPage>
  );
}
