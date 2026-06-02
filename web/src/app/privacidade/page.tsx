import type { Metadata } from "next";
import { StaticPage } from "@/components/layout/static-page";

export const metadata: Metadata = {
  title: "Privacidade",
};

export default function PrivacyPage() {
  return (
    <StaticPage title="Privacidade">
      <p>
        Dados de cadastro sao usados para identificar clientes, vincular pedidos e
        manter historico de atendimento.
      </p>
      <p>
        Links publicos de pedido usam token e nao devem expor dados sensiveis.
      </p>
    </StaticPage>
  );
}
