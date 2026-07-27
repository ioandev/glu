import { LegalLink, type LegalSection } from "@/components/legal/LegalPage";
import type { DocumentContent } from "@/components/docs/content/types";
import { CONTACT_EMAIL } from "../privacy/en";

/**
 * Os Termos em português europeu (ADR 44) — uma tradução de conveniência; o
 * texto inglês é o que vigora.
 */
const updated = "25 de julho de 2026";

const sections: LegalSection[] = [
  {
    heading: "1. Quem gere o GLU",
    body: (
      <p>
        O GLU (o “Serviço”) é um projeto pessoal e não comercial operado por Ioan Biticu
        (“eu”, “mim”) em <code>ioan.dev/glu</code>. É um pomodoro e registo de foco pensado
        primeiro para tablet, oferecido gratuitamente e construído de forma aberta. Podes
        contactar-me em{" "}
        <LegalLink href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</LegalLink>.
      </p>
    ),
  },
  {
    heading: "2. Aceitação",
    body: (
      <p>
        Ao usares o GLU aceitas estes Termos. Se não concordares, por favor não uses o
        Serviço. Aplicam-se a par da{" "}
        <LegalLink href="/privacy">Política de privacidade</LegalLink>, que descreve que
        dados são tratados e onde vivem.
      </p>
    ),
  },
  {
    heading: "3. O que é o Serviço",
    body: (
      <>
        <p>
          Um temporizador, um registo das sessões de foco que concluis, e uma integração
          opcional com o Todoist que mostra as tuas tarefas, te deixa concluí-las e
          acrescenta um comentário de registo de tempo quando terminas uma sessão numa
          tarefa que focaste.
        </p>
        <p>
          É um utensílio pessoal, não um produto com balcão de apoio. As funcionalidades
          podem mudar, e o Serviço pode ser interrompido ou descontinuado a qualquer
          momento sem aviso.
        </p>
      </>
    ),
  },
  {
    heading: "4. Os teus dados estão no teu dispositivo",
    body: (
      <>
        <p>
          O teu histórico de sessões vive no armazenamento local do teu navegador — não há
          conta, não há cópia do lado do servidor, e não há cópia de segurança. É uma
          opção de desenho deliberada, e tem uma consequência que deves ler como uma
          cláusula e não como uma nota de rodapé:
        </p>
        <ul>
          <li>
            Limpar os dados do site no teu navegador, usar navegação privada, ou mudar de
            dispositivo ou de navegador significa que o histórico desapareceu ou não está
            lá. Não pode ser recuperado por mim nem por ninguém.
          </li>
          <li>
            O arquivo guarda no máximo os últimos 90 dias; os dias mais antigos são
            descartados automaticamente.
          </li>
        </ul>
        <p>
          <b>Não dependas do GLU como sistema de registo</b> para horas faturáveis ou para
          qualquer outra coisa que importe depois do facto.
        </p>
      </>
    ),
  },
  {
    heading: "5. A tua conta Todoist",
    body: (
      <>
        <p>
          Se ligares o Todoist, o GLU age por tua instrução e com a tua autorização. És
          responsável pela conta que ligas e por rever o que o GLU lhe faz —
          especificamente: concluir ou reabrir as tarefas em que tocas, e publicar um único
          comentário de registo de tempo quando uma sessão focada termina.
        </p>
        <p>
          Liga apenas uma conta que controles. Podes revogar o acesso a qualquer momento em
          Definições → Todoist → Terminar sessão, ou nas definições de conta do próprio
          Todoist. O Todoist é um serviço separado, regido pelos{" "}
          <LegalLink href="https://todoist.com/terms">seus próprios termos</LegalLink>; não
          sou responsável por ele, pela sua disponibilidade, nem por alterações à sua API.
        </p>
      </>
    ),
  },
  {
    heading: "6. Utilização aceitável",
    body: (
      <>
        <p>Concordas em não:</p>
        <ul>
          <li>
            inundar, extrair ou automatizar contra o Serviço, nem contornar os limites de
            pedidos que ele aplica — existem para que um servidor pequeno se mantenha
            disponível para toda a gente que o usa;
          </li>
          <li>
            sondar, analisar ou tentar contornar a sua segurança, nem tentar aceder a dados
            pertencentes a outra pessoa;
          </li>
          <li>
            ligar uma conta Todoist que não controles, ou usar o Serviço para interferir
            com a conta de outra pessoa;
          </li>
          <li>usar o Serviço para o que quer que seja ilegal.</li>
        </ul>
        <p>
          Os pedidos acima do limite são recusados automaticamente, e o tráfego abusivo
          pode ser bloqueado sem aviso.
        </p>
      </>
    ),
  },
  {
    heading: "7. Disponibilidade",
    body: (
      <p>
        O GLU corre numa infraestrutura pessoal modesta. Não há compromisso de tempo
        ativo, não há nível de serviço, e não há garantia de que uma sessão em curso
        sobreviva a um reinício ou a uma implantação — embora o estado do teu temporizador
        seja guardado localmente e normalmente sobreviva.
      </p>
    ),
  },
  {
    heading: "8. Propriedade intelectual e licenciamento",
    body: (
      <p>
        O código-fonte do GLU está publicado no{" "}
        <LegalLink href="https://github.com/ioandev/glu">GitHub</LegalLink> sob a Licença
        Apache 2.0, e as licenças dos componentes de terceiros de que depende estão
        listadas no repositório. Essas condições de licença regem o <i>código</i>; estes
        Termos regem a tua utilização do <i>serviço alojado</i>. O nome GLU, o seu conteúdo
        escrito e o seu desenho são meus; o nome e o logótipo do Todoist pertencem à Doist
        e são usados para identificar a integração.
      </p>
    ),
  },
  {
    heading: "9. Sem garantia",
    body: (
      <p>
        O Serviço é fornecido “tal como está” e “conforme disponível”, sem garantias de
        qualquer tipo, expressas ou implícitas, incluindo a adequação a um fim específico.
        Não garanto que seja exato, ininterrupto, pontual ou isento de erros — incluindo
        que um alerta de fim de sessão chegue a horas, o que depende do teu navegador e do
        teu sistema operativo.
      </p>
    ),
  },
  {
    heading: "10. Limitação de responsabilidade",
    body: (
      <p>
        Na medida máxima permitida por lei, não sou responsável por quaisquer prejuízos
        indiretos, incidentais ou consequentes decorrentes da tua utilização do Serviço, nem
        por histórico de sessões perdido, alertas falhados, ou alterações feitas à tua conta
        Todoist através do Serviço. Nada aqui exclui responsabilidade que não possa
        legalmente ser excluída.
      </p>
    ),
  },
  {
    heading: "11. Alterações a estes Termos",
    body: (
      <p>
        Estes Termos podem mudar; a data de “Última atualização” acima reflete a versão
        atual, e continuares a usar o Serviço depois de uma alteração significa que a
        aceitas.
      </p>
    ),
  },
  {
    heading: "12. Lei aplicável",
    body: (
      <p>
        Estes Termos são regidos pelas leis de Inglaterra e do País de Gales. Nada aqui
        limita os direitos que tenhas ao abrigo de legislação imperativa de defesa do
        consumidor ou de proteção de dados no sítio onde vives.
      </p>
    ),
  },
  {
    heading: "13. Contacto",
    body: (
      <p>
        Dúvidas sobre estes Termos? Escreve para{" "}
        <LegalLink href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</LegalLink>.
      </p>
    ),
  },
];

const content: DocumentContent = {
  updated,
  title: "Termos do serviço",
  intro: (
    <>
      O GLU é um temporizador de foco pessoal e gratuito, fornecido tal como está. Os teus
      dados ficam no teu dispositivo e a tua conta Todoist continua a ser tua. A{" "}
      <LegalLink href="/privacy">Política de privacidade</LegalLink> cobre o lado dos
      dados.
    </>
  ),
  sections,
};

export default content;
