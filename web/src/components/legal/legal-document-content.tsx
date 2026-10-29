import { LEGAL_LAST_UPDATED_LABEL } from "@/lib/legal";

const sectionClassName = "space-y-2";
const headingClassName = "text-base font-bold text-[var(--foreground)]";

export function TermsContent() {
  return (
    <div className="space-y-5">
      <p><strong>Última atualização:</strong> {LEGAL_LAST_UPDATED_LABEL}.</p>

      <section className={sectionClassName}>
        <h2 className={headingClassName}>1. Identificação e aceitação</h2>
        <p>
          Estes Termos regulam o acesso e o uso do site, da conta e dos serviços da
          Smart Funkos, inscrita no CNPJ 57.923.879/0001-60, com sede na R. Humaitá,
          Golden Business Center, sala 410, Divino Espírito Santo, Vila Velha/ES,
          CEP 29107-250. Ao aceitar, você declara que leu e concorda com estes Termos
          e com a Política de Privacidade.
        </p>
      </section>

      <section className={sectionClassName}>
        <h2 className={headingClassName}>2. Cadastro e segurança da conta</h2>
        <p>
          Você deve fornecer dados verdadeiros, completos e atualizados. A conta é
          pessoal e intransferível; mantenha sua senha em sigilo e avise a Smart Funkos
          ao perceber uso não autorizado. Podemos solicitar confirmação de identidade,
          corrigir cadastros inconsistentes e suspender contas usadas de forma fraudulenta
          ou contrária à lei e a estes Termos.
        </p>
      </section>

      <section className={sectionClassName}>
        <h2 className={headingClassName}>3. Produtos, disponibilidade e preços</h2>
        <p>
          Imagens são ilustrativas e podem apresentar variações de cor, embalagem e
          acabamento. Preços, estoque, brindes e condições podem mudar antes da conclusão
          do pedido. Em pré-vendas, encomendas, itens importados, raros ou de fornecedores,
          o prazo é estimado e pode depender de terceiros, desembaraço e transporte.
          Informaremos alterações relevantes e as opções disponíveis ao consumidor.
        </p>
      </section>

      <section className={sectionClassName}>
        <h2 className={headingClassName}>4. Pedidos e pagamentos</h2>
        <p>
          O pedido somente é confirmado após a validação dos dados, da disponibilidade e
          do pagamento, quando aplicável. Pedidos podem ser cancelados em caso de erro
          evidente de preço, indisponibilidade, suspeita de fraude ou falha de pagamento,
          com comunicação e estorno dos valores efetivamente pagos. Parcelamento, juros,
          taxas e meios disponíveis são exibidos antes da confirmação.
        </p>
        <p>
          Para proteger clientes e a operação, poderemos submeter transações a verificações
          antifraude, solicitar confirmação de identidade ou titularidade e suspender a
          conclusão do pedido enquanto houver divergências relevantes. Uma recusa será
          comunicada e os valores eventualmente capturados serão estornados pelo mesmo meio,
          observados os prazos do prestador financeiro.
        </p>
      </section>

      <section className={sectionClassName}>
        <h2 className={headingClassName}>5. Entrega, trocas e arrependimento</h2>
        <p>
          Prazos de entrega começam conforme a modalidade informada no pedido e podem
          variar por CEP, transportadora e disponibilidade. O consumidor pode exercer os
          direitos previstos no Código de Defesa do Consumidor, inclusive o arrependimento
          nas compras realizadas fora do estabelecimento dentro do prazo legal. Regras
          operacionais de envio, troca, devolução e reembolso estão nas páginas específicas
          do site e não limitam direitos assegurados por lei.
        </p>
        <p>
          Nas compras realizadas fora do estabelecimento, o arrependimento pode ser
          solicitado em até 7 (sete) dias corridos contados do recebimento do produto ou da
          assinatura do contrato, conforme a legislação aplicável. Orientaremos a devolução
          e o reembolso dos valores pagos, inclusive o frete original quando cabível.
        </p>
        <p>
          O produto deverá ser devolvido com seus componentes, acessórios e embalagem
          recebidos. O consumidor pode examiná-lo de modo compatível com sua natureza. Sinais
          de uso além do necessário, dano causado após a entrega, ausência de componentes ou
          troca do item por produto diferente serão documentados e analisados, sem afastar
          automaticamente direitos previstos em lei.
        </p>
      </section>

      <section className={sectionClassName}>
        <h2 className={headingClassName}>6. Avarias, divergências e autenticidade</h2>
        <p>
          Recomendamos, sem caráter obrigatório, que o cliente grave a abertura do pacote
          lacrado, mostrando a etiqueta e a retirada do produto. O vídeo pode agilizar a
          apuração, mas sua ausência não impede reclamações, trocas, devoluções ou demais
          direitos do consumidor. Também poderão ser considerados fotos, embalagem,
          rastreamento, registros de atendimento e inspeção do item.
        </p>
        <p>
          Podemos registrar antes do envio características visuais, selos, número de lote e
          estado da embalagem para controle de qualidade e autenticidade. Se houver indícios
          objetivos de substituição do produto, falsificação ou fraude, o caso será analisado,
          o cliente poderá apresentar esclarecimentos e a Smart Funkos poderá preservar
          provas, restringir a conta e adotar as medidas administrativas ou legais cabíveis.
        </p>
      </section>

      <section className={sectionClassName}>
        <h2 className={headingClassName}>7. Produtos personalizados, pré-vendas e encomendas</h2>
        <p>
          Produtos efetivamente personalizados segundo especificações individuais podem ter
          limitações de cancelamento após o início da personalização, desde que isso seja
          informado de forma clara antes da compra e respeite a legislação aplicável.
          Pré-venda, importação ou encomenda, por si sós, não eliminam direitos legais do
          consumidor. Condições, estimativas de prazo e consequências do cancelamento serão
          apresentadas antes da contratação.
        </p>
      </section>

      <section className={sectionClassName}>
        <h2 className={headingClassName}>8. Contestações de pagamento e prevenção a fraudes</h2>
        <p>
          Em contestações ou chargebacks, poderemos encaminhar ao provedor de pagamento
          informações pertinentes à transação, como identificação do pedido, registros de
          autenticação e acesso, comunicações de atendimento, comprovantes de envio e
          entrega, sempre de forma proporcional e para prevenção à fraude ou exercício
          regular de direitos. Contestações não geram punição automática. Havendo evidências
          de abuso ou fraude, a conta poderá ser preventivamente restringida, com possibilidade
          de esclarecimento, sem prejuízo das medidas legalmente cabíveis.
        </p>
      </section>

      <section className={sectionClassName}>
        <h2 className={headingClassName}>9. Rifas, campanhas e benefícios</h2>
        <p>
          Ações promocionais, campanhas, clubes e benefícios podem ter regulamentos,
          prazos e critérios próprios, apresentados antes da participação. Em caso de
          conflito, prevalecem a legislação aplicável e o regulamento específico da ação.
        </p>
      </section>

      <section className={sectionClassName}>
        <h2 className={headingClassName}>10. Uso permitido e propriedade intelectual</h2>
        <p>
          É proibido tentar invadir, fraudar, automatizar abusivamente, prejudicar o serviço
          ou usar conteúdo da Smart Funkos sem autorização. Marcas, textos, layout, imagens
          próprias, software e demais materiais são protegidos; marcas e personagens de
          terceiros pertencem aos respectivos titulares.
        </p>
      </section>

      <section className={sectionClassName}>
        <h2 className={headingClassName}>11. Disponibilidade e responsabilidade</h2>
        <p>
          Buscamos manter o serviço seguro e disponível, mas podem ocorrer manutenções,
          indisponibilidades e eventos fora de nosso controle. Nada nestes Termos exclui ou
          reduz responsabilidade que não possa ser afastada pela legislação de defesa do
          consumidor.
        </p>
      </section>

      <section className={sectionClassName}>
        <h2 className={headingClassName}>12. Alterações, contato e foro</h2>
        <p>
          Podemos atualizar estes Termos. Quando a mudança exigir nova concordância, um
          novo aceite será solicitado. Dúvidas podem ser enviadas para
          contato@smartfunko.com.br. Aplica-se a legislação brasileira, preservado o foro
          legalmente assegurado ao consumidor.
        </p>
      </section>
    </div>
  );
}

export function PrivacyContent() {
  return (
    <div className="space-y-5">
      <p><strong>Última atualização:</strong> {LEGAL_LAST_UPDATED_LABEL}.</p>

      <section className={sectionClassName}>
        <h2 className={headingClassName}>1. Controladora dos dados</h2>
        <p>
          A Smart Funkos, CNPJ 57.923.879/0001-60, é responsável pelo tratamento descrito
          nesta Política. Contato sobre privacidade: contato@smartfunko.com.br.
        </p>
      </section>

      <section className={sectionClassName}>
        <h2 className={headingClassName}>2. Dados que tratamos</h2>
        <p>
          Podemos tratar nome, e-mail, telefone, CPF, endereço, Instagram, credenciais e
          identificadores de conta; histórico de pedidos, reservas, pagamentos, entregas,
          atendimento e preferências; além de IP, dispositivo, navegador, registros de
          acesso, cookies e dados necessários à segurança. Dados completos de cartão são
          processados pelo provedor de pagamento e não devem ser enviados por mensagens.
        </p>
        <p>
          Para prevenção à fraude, poderemos tratar identificadores da transação, IP,
          horários, dispositivo e navegador, tentativas de autenticação, histórico do pedido,
          comunicações de atendimento e comprovantes de envio ou entrega. Não afirmamos
          coletar localização precisa, biometria ou dados completos de cartão diretamente,
          salvo se isso for futuramente informado de forma específica e legal.
        </p>
      </section>

      <section className={sectionClassName}>
        <h2 className={headingClassName}>3. Como obtemos os dados</h2>
        <p>
          Recebemos dados diretamente de você no cadastro, compra, WhatsApp e atendimento;
          automaticamente durante o uso do site; e de parceiros necessários à operação,
          como pagamentos, logística e autenticação, dentro das finalidades informadas.
        </p>
      </section>

      <section className={sectionClassName}>
        <h2 className={headingClassName}>4. Finalidades e bases legais</h2>
        <p>
          Usamos os dados para criar e proteger a conta; processar pedidos, pagamentos,
          entregas, trocas e atendimento; cumprir contratos, obrigações legais e fiscais;
          prevenir fraude e exercer direitos; manter e melhorar o serviço; e enviar
          comunicações e ofertas quando permitido. Conforme o caso, o tratamento se baseia
          na execução de contrato ou procedimentos preliminares, cumprimento de obrigação
          legal, exercício regular de direitos, legítimo interesse ou consentimento.
        </p>
        <p>
          As verificações antifraude buscam identificar inconsistências, uso indevido de
          contas, documentos ou meios de pagamento e contestações abusivas. Quando uma
          decisão relevante se basear exclusivamente em tratamento automatizado, o titular
          poderá pedir informações e revisão nos termos da LGPD.
        </p>
      </section>

      <section className={sectionClassName}>
        <h2 className={headingClassName}>5. Compartilhamento</h2>
        <p>
          Compartilhamos apenas o necessário com provedores de hospedagem, banco de dados,
          autenticação, pagamento, antifraude, logística, atendimento, contabilidade e
          tecnologia; autoridades quando houver obrigação legal; e em reorganizações
          empresariais com proteção adequada. Não vendemos dados pessoais.
        </p>
        <p>
          Em prevenção e contestação de fraude, dados estritamente pertinentes poderão ser
          compartilhados com instituições financeiras, operadoras, gateways, serviços
          antifraude, transportadores, assessores e autoridades, quando houver base legal,
          obrigação, ordem válida ou necessidade de exercício regular de direitos.
        </p>
      </section>

      <section className={sectionClassName}>
        <h2 className={headingClassName}>6. Transferência internacional</h2>
        <p>
          Alguns fornecedores podem armazenar ou processar dados fora do Brasil. Nesses
          casos, adotamos fornecedores e mecanismos compatíveis com a LGPD e medidas para
          preservar a proteção dos dados.
        </p>
      </section>

      <section className={sectionClassName}>
        <h2 className={headingClassName}>7. Retenção e segurança</h2>
        <p>
          Mantemos os dados pelo tempo necessário às finalidades, aos prazos legais e ao
          exercício de direitos. Depois, eles são eliminados ou anonimizados, salvo quando
          a conservação for permitida. Adotamos controles técnicos e organizacionais, mas
          nenhum sistema é totalmente imune a incidentes.
        </p>
        <p>
          A exclusão da conta não implica eliminação imediata de todos os registros. Dados
          fiscais, contratuais, de pedidos, pagamentos, prevenção a fraudes e registros de
          acesso poderão ser preservados durante os prazos legais aplicáveis — inclusive o
          prazo previsto para guarda de registros de acesso a aplicações, quando aplicável —
          ou enquanto forem necessários para processos e exercício regular de direitos.
        </p>
      </section>

      <section className={sectionClassName}>
        <h2 className={headingClassName}>8. Seus direitos</h2>
        <p>
          Você pode solicitar confirmação do tratamento, acesso, correção, anonimização,
          bloqueio ou eliminação nos casos legais, portabilidade quando regulamentada,
          informação sobre compartilhamentos, revisão de decisões automatizadas, oposição,
          revogação do consentimento e informação sobre suas consequências. Podemos pedir
          comprovação de identidade e manter dados quando houver base legal para isso.
        </p>
      </section>

      <section className={sectionClassName}>
        <h2 className={headingClassName}>9. Cookies e dados de menores</h2>
        <p>
          Cookies essenciais mantêm sessão, segurança e preferências. Outros cookies, se
          adotados, serão informados e gerenciados conforme a lei. O serviço não é dirigido
          intencionalmente a crianças; quando aplicável, o tratamento observará o melhor
          interesse e as autorizações legalmente exigidas.
        </p>
      </section>

      <section className={sectionClassName}>
        <h2 className={headingClassName}>10. Atualizações</h2>
        <p>
          Esta Política pode ser atualizada para refletir mudanças legais ou operacionais.
          A versão e a data ficam publicadas, e solicitaremos novo aceite quando necessário.
        </p>
      </section>
    </div>
  );
}

