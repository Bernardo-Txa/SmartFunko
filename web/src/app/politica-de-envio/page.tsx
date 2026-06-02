import type { Metadata } from "next";
import { StaticPage } from "@/components/layout/static-page";

export const metadata: Metadata = {
  title: "Politica de envio",
};

export default function ShippingPolicyPage() {
  return (
    <StaticPage title="Politica de envio">
      <p>
        O envio e combinado no atendimento apos confirmacao do produto, endereco e
        modalidade disponivel.
      </p>
      <p>
        O pedido acompanha status de preparacao, pronto para envio, enviado e entregue.
      </p>
    </StaticPage>
  );
}
