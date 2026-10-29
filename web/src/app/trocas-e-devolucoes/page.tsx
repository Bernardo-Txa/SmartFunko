import type { Metadata } from "next";
import { StaticPage } from "@/components/layout/static-page";

export const metadata: Metadata = {
  title: "Cancelamentos, trocas e devoluções",
};

export default function ReturnsPage() {
  return (
    <StaticPage title="Cancelamentos, trocas e devoluções">
      <p>
        Esta política complementa os Termos de Uso e deve ser interpretada conforme o
        Código de Defesa do Consumidor. Nenhuma regra abaixo limita direitos garantidos
        pela legislação aplicável.
      </p>
      <h2 className="text-lg font-bold text-[var(--foreground)]">Direito de arrependimento</h2>
      <p>
        Nas compras realizadas fora do estabelecimento, você pode solicitar o
        arrependimento em até 7 (sete) dias corridos contados do recebimento do produto ou
        da assinatura do contrato. Entre em contato pelo atendimento, informando o pedido.
        Enviaremos as orientações de devolução e, cumprido o procedimento, providenciaremos
        a restituição dos valores pagos, inclusive do frete original quando cabível.
      </p>
      <p>
        Devolva o produto com boneco, blister, selos, acessórios e embalagem recebidos.
        Você pode examiná-lo de forma compatível com sua natureza. Dano posterior à
        entrega, uso além do necessário, ausência de componentes ou devolução de item
        diferente serão registrados e analisados individualmente, sem negativa automática
        de direitos previstos em lei.
      </p>
      <h2 className="text-lg font-bold text-[var(--foreground)]">Avaria, defeito ou produto incorreto</h2>
      <p>
        Ao perceber avaria, defeito, violação do pacote ou divergência, preserve a
        embalagem e fale conosco o quanto antes, enviando fotos e as informações do pedido.
        Recomendamos gravar um vídeo contínuo da abertura, desde o pacote lacrado e a
        etiqueta até a retirada do produto. O vídeo ajuda na apuração, mas não é obrigatório
        e sua ausência não impede a solicitação.
      </p>
      <p>
        Analisaremos o relato e ofereceremos a solução aplicável — correção, substituição,
        restituição ou abatimento — dentro dos direitos e prazos legais. O prazo legal para
        sanar vício não será ampliado por um prazo interno de análise.
      </p>
      <h2 className="text-lg font-bold text-[var(--foreground)]">Autenticidade e prevenção a fraudes</h2>
      <p>
        Podemos fotografar e registrar estado, selos, características e números de lote
        antes do envio. Se o item devolvido aparentar ser diferente daquele despachado,
        falsificado ou adulterado, preservaremos as evidências, informaremos o cliente e
        permitiremos esclarecimentos antes da conclusão da análise. Confirmados indícios
        objetivos de fraude, poderão ser adotadas restrições de conta e medidas legais
        cabíveis. Não haverá acusação ou boletim de ocorrência automático.
      </p>
      <h2 className="text-lg font-bold text-[var(--foreground)]">Personalizados e encomendas</h2>
      <p>
        Eventuais limitações para produtos efetivamente personalizados serão informadas de
        maneira destacada antes da compra e dependerão do estágio de execução, sem afastar
        direitos obrigatórios. Pré-venda, importação ou encomenda exclusiva, isoladamente,
        não eliminam o direito de arrependimento ou outras garantias legais.
      </p>
      <h2 className="text-lg font-bold text-[var(--foreground)]">Reembolso</h2>
      <p>
        Após o recebimento e conferência da devolução, comunicaremos o resultado e
        solicitaremos prontamente a restituição pelo meio de pagamento utilizado. O prazo
        para o crédito aparecer pode variar conforme banco, bandeira ou provedor. Se a
        devolução decorrer de arrependimento ou falha atribuível à Smart Funkos, não será
        cobrada taxa indevida do consumidor.
      </p>
    </StaticPage>
  );
}
