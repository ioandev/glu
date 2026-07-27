import { DataList, LegalLink, type LegalSection } from "@/components/legal/LegalPage";
import type { DocumentContent } from "@/components/docs/content/types";
import { CONTACT_EMAIL } from "./en";

/**
 * A Política de privacidade em português europeu (ADR 44) — uma tradução de
 * conveniência do texto inglês, que é o que vigora. Cada afirmação tem de
 * corresponder à de `en.tsx`: uma tradução que promete outra coisa é um defeito.
 */
const updated = "25 de julho de 2026";

const sections: LegalSection[] = [
  {
    heading: "1. A versão curta",
    body: (
      <ul>
        <li>
          O GLU não tem contas, nem base de dados, nem analítica. Não existe qualquer
          registo teu do lado do servidor.
        </li>
        <li>
          O teu histórico de foco — sessões, durações, etiquetas de ambiente — é guardado
          no teu próprio navegador e nunca é enviado para lado nenhum.
        </li>
        <li>
          O Todoist é opcional. Se o ligares, os teus tokens vivem encriptados num cookie
          que só o servidor consegue abrir, e o servidor não guarda cópia nenhuma.
        </li>
        <li>
          Sem cookies de publicidade, sem rastreadores de terceiros, sem necessidade de
          banner de consentimento.
        </li>
      </ul>
    ),
  },
  {
    heading: "2. Quem é o responsável",
    body: (
      <p>
        O GLU é um projeto pessoal e não comercial operado por Ioan Biticu, servido em{" "}
        <code>ioan.dev/glu</code>. Para qualquer questão ou pedido sobre privacidade,
        escreve para{" "}
        <LegalLink href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</LegalLink>.
      </p>
    ),
  },
  {
    heading: "3. O que é guardado no teu dispositivo",
    body: (
      <>
        <p>
          O GLU mantém o seu estado no <b>armazenamento local</b> do teu navegador, sob
          uma única chave com versão. Nunca é enviado para lado nenhum, e não há sítio
          nenhum para onde pudesse ser enviado. Contém:
        </p>
        <DataList
          items={[
            {
              term: "Estado do temporizador",
              detail:
                "O temporizador a correr ou em pausa, a sua duração e a predefinição que escolheste por último — para que um recarregamento ou uma tampa fechada não te façam perder a sessão.",
            },
            {
              term: "Histórico de sessões",
              detail:
                "Cada sessão concluída: quando terminou, quanto tempo durou e que etiquetas de ambiente estavam ligadas. O dia atual, mais um arquivo de no máximo os últimos 90 dias.",
            },
            {
              term: "Preferências",
              detail:
                "Desenho do relógio, estilo da moldura, esquema de cores e os interruptores de manter aceso.",
            },
            {
              term: "Escolhas do Todoist",
              detail:
                "Se usares o Todoist: a lista de tarefas que escolheste, a tarefa que focaste e qualquer comentário de registo de tempo ainda à espera de ser enviado.",
            },
          ]}
        />
        <p>
          Limpar os dados do site de <code>ioan.dev</code> no teu navegador apaga tudo
          isso, de forma permanente e completa. O “Novo dia” na aplicação passa a
          contagem visível para o arquivo; o próprio arquivo está limitado a 90 dias e
          deixa cair o dia mais antigo automaticamente.
        </p>
      </>
    ),
  },
  {
    heading: "4. Cookies",
    body: (
      <>
        <p>
          O GLU não define cookies de publicidade, de analítica nem entre sites. Os únicos
          cookies que pode definir são estritamente necessários e só existem se ligares o
          Todoist:
        </p>
        <DataList
          items={[
            {
              term: "glu_todoist",
              detail:
                "Os teus tokens do Todoist encriptados (selados). httpOnly, por isso os scripts da página não o conseguem ler; Secure e SameSite=Lax em produção; limitado a /glu. É apagado quando terminas sessão.",
            },
            {
              term: "glu_oauth_state",
              detail:
                "Um valor de curta duração contra falsificação, usado durante o início de sessão, válido por dez minutos e descartado logo a seguir.",
            },
          ]}
        />
        <p>
          Como ambos são estritamente necessários para uma funcionalidade que iniciaste
          deliberadamente, não há banner de consentimento. Um banner que pede autorização
          para aquilo em que acabaste de clicar é teatro, e habitua as pessoas a
          dispensarem os que importam.
        </p>
        <p>
          A tua preferência de esquema de cores também fica guardada no armazenamento do
          navegador. Isso é uma definição, não rastreio.
        </p>
      </>
    ),
  },
  {
    heading: "5. Todoist",
    body: (
      <>
        <p>
          Ligar o Todoist é inteiramente opcional; tudo o resto no GLU funciona sem ele.
          Se o ligares:
        </p>
        <ul>
          <li>
            Autorizas o GLU através do ecrã de OAuth do próprio Todoist. O GLU pede acesso
            de leitura e escrita, porque mostra as tuas tarefas e — só por ação tua — as
            conclui e acrescenta um comentário de tempo.
          </li>
          <li>
            Os tokens resultantes são <b>selados (encriptados) num cookie httpOnly</b>. O
            navegador guarda um bloco opaco que não consegue desencriptar; o servidor
            consegue abri-lo, mas não guarda nada. Não há base de dados de tokens porque
            não há base de dados nenhuma.
          </li>
          <li>
            <b>Todo o tráfego do Todoist passa pelo servidor do próprio GLU</b>, por isso
            o teu token nunca chega à página e o teu navegador nunca contacta o Todoist
            diretamente. As imagens e os ficheiros anexados às tarefas são obtidos da
            mesma maneira, e é por isso que o teu navegador também nunca fala com a CDN do
            Todoist.
          </li>
        </ul>
        <p>
          O que o GLU <b>escreve</b> na tua conta, e só quando lho pedes: concluir ou
          reabrir uma tarefa, e publicar um único comentário de registo de tempo com a
          forma <code>[25m] Passaste 25 minutos nisto</code>. Essa frase é composta pelo
          servidor, não pela página — o GLU não consegue publicar texto arbitrário nas
          tuas tarefas.
        </p>
        <p>
          Podes desligar quando quiseres: <b>Definições → Todoist → Terminar sessão</b>{" "}
          apaga o cookie, e revogar o GLU nas definições da tua conta Todoist pára o
          acesso imediatamente e de forma independente de tudo o que eu faça.
        </p>
      </>
    ),
  },
  {
    heading: "6. O que o servidor vê",
    body: (
      <>
        <p>
          O servidor é um proxy sem estado. Não tem base de dados, nem armazenamento de
          sessões, nem registos de utilizadores. Vê apenas aquilo que qualquer servidor
          web vê ao tratar de um pedido:
        </p>
        <ul>
          <li>
            <b>Contadores de limitação de pedidos.</b> Para manter disponível um pequeno
            contentor, os pedidos são contados por cliente. A chave do contador é derivada
            do teu endereço IP (o IPv6 é agrupado por prefixo de rede, nunca o endereço
            individual), mantida <b>apenas em memória</b>, nunca escrita em disco, e
            totalmente perdida quando o processo reinicia. A linha de registo de um pedido
            recusado não contém deliberadamente nenhum endereço.
          </li>
          <li>
            <b>Registos operacionais normais</b> — erros e diagnósticos necessários para
            manter o site a funcionar. Não há pipeline de analítica, nem registo de
            eventos, nem criação de perfis.
          </li>
        </ul>
      </>
    ),
  },
  {
    heading: "7. Terceiros",
    body: (
      <>
        <ul>
          <li>
            <b>Todoist</b> — apenas se o ligares. A tua utilização do Todoist é regida
            pela{" "}
            <LegalLink href="https://todoist.com/privacy">
              política de privacidade deles
            </LegalLink>
            .
          </li>
          <li>
            <b>Infraestrutura de alojamento</b> — os servidores em que o site corre, que
            processam pedidos por minha conta.
          </li>
        </ul>
        <p>
          A lista é esta e mais nada. O GLU não carrega tipos de letra, scripts nem
          imagens do servidor de mais ninguém: a sua política de segurança de conteúdo só
          permite a sua própria origem, por isso um rastreador de terceiros não conseguiria
          correr mesmo que fosse acrescentado por acidente.
        </p>
      </>
    ),
  },
  {
    heading: "8. Permissões que a aplicação pede",
    body: (
      <>
        <p>
          Cada uma destas é uma permissão do navegador, tratada inteiramente no teu
          dispositivo. Nada sobre elas é comunicado seja onde for, e recusar qualquer uma
          delas deixa o temporizador totalmente utilizável.
        </p>
        <DataList
          items={[
            {
              term: "Notificações",
              detail:
                "Para que uma sessão terminada te consiga chegar quando o GLU está num separador em segundo plano. Pedida uma vez, no teu primeiro Iniciar; a recusa fica lembrada pelo teu navegador e nunca mais é pedida.",
            },
            {
              term: "Bloqueio de suspensão do ecrã",
              detail:
                "Para que o tablet não adormeça a meio da sessão. Controlado pelos dois interruptores em Definições → Ecrã.",
            },
            {
              term: "Som",
              detail:
                "Todos os sons de fim de sessão são gerados no navegador. Nenhum ficheiro de áudio é descarregado e nada é gravado — o GLU nunca pede acesso ao microfone ou à câmara.",
            },
          ]}
        />
      </>
    ),
  },
  {
    heading: "9. Conservação",
    body: (
      <p>
        No teu dispositivo: durante o tempo que o mantiveres — o arquivo de sessões
        limita-se a si próprio a 90 dias, e limpar os dados do site remove tudo de uma vez.
        No servidor: nada é conservado, porque nada é guardado. O cookie do Todoist vive no
        teu navegador até terminares sessão ou até expirar; os contadores de limitação de
        pedidos desaparecem ao reiniciar; os registos operacionais são guardados por pouco
        tempo, para segurança e depuração.
      </p>
    ),
  },
  {
    heading: "10. Os teus direitos",
    body: (
      <p>
        Consoante o sítio onde vives, podes ter direitos de acesso, retificação,
        portabilidade ou apagamento dos dados pessoais que te digam respeito, e de te
        opores ao seu tratamento. O GLU está construído de forma a que quase não haja nada
        contra que os exercer: sem conta, sem perfil do lado do servidor, e com um
        histórico local que só tu consegues ler. Para o que quer que aches que eu tenha,
        escreve para <LegalLink href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</LegalLink>{" "}
        e eu trato disso.
      </p>
    ),
  },
  {
    heading: "11. Crianças",
    body: (
      <p>
        O GLU não se dirige a crianças e não recolho conscientemente dados de ninguém com
        menos de 16 anos.
      </p>
    ),
  },
  {
    heading: "12. Alterações",
    body: (
      <p>
        Se algum dia o GLU passar a tratar dados de outra forma, esta página muda com ele e
        a data de “Última atualização” acima avança. O projeto é open source, por isso a
        alteração fica visível no seu histórico, além de aqui.
      </p>
    ),
  },
];

const content: DocumentContent = {
  updated,
  title: "Política de privacidade",
  intro: (
    <>
      O GLU é um pomodoro e registo de foco que mantém os teus dados no teu próprio
      dispositivo. Esta página explica exatamente o que ele trata, para onde vai, e o que
      nunca faz. Aplica-se a par dos{" "}
      <LegalLink href="/terms">Termos do serviço</LegalLink>.
    </>
  ),
  sections,
};

export default content;
