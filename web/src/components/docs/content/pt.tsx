import { DataList, LegalLink, type LegalSection } from "@/components/legal/LegalPage";
import type { DocumentContent } from "./types";
import { CLOCK_COUNT } from "@/clocks/registry";

/**
 * O manual do GLU em português europeu (ADR 44) — uma tradução do texto inglês,
 * que é o original. A estrutura acompanha `en.tsx` secção a secção: se lá muda
 * um valor por omissão, um atalho ou uma janela de anulação, muda aqui também,
 * `updated` incluído.
 */
const updated = "26 de julho de 2026";

const title = "Como funciona o GLU";

const intro = (
  <>
    O GLU é um temporizador de foco feito para um tablet apoiado ao teu lado enquanto
    trabalhas. Esta página é tudo o que ele faz — o temporizador, a galeria de relógios,
    as etiquetas de ambiente, o registo de sessões e a ligação opcional ao Todoist. É
    uma só página de propósito: usa a pesquisa na página do teu navegador para saltares
    de um lado para o outro.
  </>
);

const sections: LegalSection[] = [
  {
    heading: "O que é o GLU",
    body: (
      <>
        <p>
          Um pomodoro e registo de foco. Escolhes uma duração, carregas em Iniciar e
          trabalhas até o relógio chegar a zero. O GLU regista a corrida para veres
          quantas já fizeste hoje e — se ligares o Todoist — pode anotar o tempo na
          tarefa em que estavas a trabalhar.
        </p>
        <p>
          Não há <b>conta nem registo</b>. Tudo o que o GLU sabe vive no navegador em
          que estás a ler isto. É um só ecrã: sem menus onde te perderes, sem painel de
          controlo, sem nada para configurar antes de ser útil.
        </p>
        <p>
          Da primeira vez que abres o GLU, ele mostra uma breve apresentação em vez do
          temporizador, com um botão que te leva para dentro. Vê-la <b>uma vez por
          navegador</b> — a partir daí o GLU abre logo no relógio. Continua legível na{" "}
          <LegalLink href="/welcome">página de boas-vindas</LegalLink> se alguma vez a
          quiseres outra vez, ou a quiseres enviar a alguém. Limpar os dados do
          navegador repõe isso juntamente com tudo o resto, por isso o GLU voltará a
          receber-te como quem chega de novo.
        </p>
      </>
    ),
  },
  {
    heading: "Instala-o como uma aplicação",
    body: (
      <p>
        O GLU pode ser instalado no ecrã principal ou no ambiente de trabalho —
        “Instalar aplicação” no menu do navegador em Android, “Adicionar ao ecrã
        principal” num iPad, o comando de instalação na barra de endereço num navegador
        de computador — e passa a abrir sem a moldura do navegador, que é o aspeto certo
        para um temporizador num suporte. Em Android, escolhe a opção que diz{" "}
        <i>Instalar</i> quando aparecerem as duas: o atalho simples mantém uma barra de
        navegador no topo. <b>Não é uma aplicação offline</b>: precisa de ligação sempre
        que arranca. Não muda mais nada; é a mesma aplicação, com os mesmos dados, numa
        janela diferente.
      </p>
    ),
  },
  {
    heading: "O temporizador",
    body: (
      <>
        <p>
          A linha por cima do relógio tem as predefinições — <b>5, 10, 15, 20, 30, 45 e
          60 minutos</b>. Vinte está selecionado quando chegas pela primeira vez. Tocar
          numa predefinição acerta o temporizador, e tocar numa <i>durante</i> uma
          corrida muda o alvo dessa corrida em vez de esperar que ela acabe.
        </p>
        <p>
          Por baixo do relógio, dois botões — os alvos maiores do ecrã, porque são
          aqueles a que chegas sem olhar. O primeiro diz sempre o que está prestes a
          fazer: <b>Iniciar</b> quando não há nada a correr, <b>Pausar</b> enquanto
          corre, <b>Retomar</b> depois de teres pausado. O segundo é <b>Parar</b>. Por
          baixo deles, <b>+1 / +5 / −1 / −5</b>, que significam uma de duas coisas
          consoante o que o temporizador estiver a fazer.
        </p>
        <p>
          <i>Durante</i> uma corrida ajustam a corrida em que estás, e só essa — parar
          devolve-te à duração que escolheste. Sem nada a correr, o que inclui estar
          parado em 00:00 depois de uma corrida terminar, definem quanto vai durar a{" "}
          <b>próxima</b> corrida. Uma duração que não seja uma das sete predefinições
          aparece na linha de predefinições como um botão extra próprio, selecionado, e
          fica lá ao longo de arranques, paragens e recomeços até tocares outra vez numa
          predefinição. Um minuto é a corrida mais curta que o GLU aceita; subtrair para
          além disso num relógio que já está a contar simplesmente termina a corrida.
        </p>
        <DataList
          items={[
            {
              term: "Inativo",
              detail:
                "Nada a correr. O relógio mostra a duração que selecionaste, pronto a começar.",
            },
            {
              term: "A correr",
              detail:
                "Em contagem decrescente. Os números não tremem — os dígitos mantêm a largura.",
            },
            {
              term: "Em pausa",
              detail:
                "Suspenso onde o deixaste. Carrega em Retomar para continuar a partir do mesmo segundo.",
            },
            {
              term: "Terminado",
              detail:
                "Zero, e visivelmente diferente de inativo. Nada recomeça sozinho — a próxima corrida é decisão tua.",
            },
          ]}
        />
        <p>
          <b>O temporizador sobrevive a um recarregamento, a uma tampa fechada e a um
          separador em segundo plano.</b>{" "}
          Conta a partir do momento em que começou, e não a partir de impulsos que
          precisaria de estar acordado para receber, por isso voltar ao separador mostra
          o tempo restante correto, e não um relógio que parou quando o ecrã parou. Se
          uma corrida acabou enquanto estavas fora, vais encontrá-la terminada e
          silenciosa — o som é para o momento em que acontece, não para horas depois.
        </p>
      </>
    ),
  },
  {
    heading: "Atalhos de teclado",
    body: (
      <>
        <p>Se tiveres um teclado ligado:</p>
        <DataList
          items={[
            { term: "P", detail: "Pausar, ou retomar uma corrida em pausa." },
            { term: "S", detail: "Parar a corrida atual." },
            {
              term: "N",
              detail:
                "Abandonar o que estiver a correr e começar uma corrida nova na duração selecionada.",
            },
            {
              term: "Ctrl + C",
              detail:
                "Também pára — o hábito emprestado de um terminal. Se tiveres texto selecionado, copia em vez disso, exatamente como esperarias.",
            },
          ]}
        />
        <p>
          Os atalhos nunca disparam enquanto estás a escrever num campo de texto, e
          manter uma tecla carregada não repete a ação. O Parar diz o seu atalho numa
          dica, e o primeiro botão também, assim que houver uma corrida para pausar ou
          retomar, por isso não há nada para decorares desta página.
        </p>
      </>
    ),
  },
  {
    heading: "O relógio é uma galeria",
    body: (
      <>
        <p>
          Há{" "}
          <b>{CLOCK_COUNT} desenhos de relógio</b>, e o que está no ecrã é uma escolha,
          não um valor por omissão a que estejas preso. <b>Desliza o relógio para o
          lado</b> para percorrê-los; num ecrã largo há também setas de cada lado do
          relógio, discretas até passares por cima ou lhes dares foco. Num ecrã estreito
          uma dica única diz-te isso, e não volta depois de dispensada.
        </p>
        <p>
          O novo desenho entra a deslizar da direção para onde deslizaste. A tua escolha
          fica guardada para a próxima vez.
        </p>
        <p>
          <b>O relógio ativo recolore a página inteira.</b> Cada desenho traz a sua
          própria paleta, por isso o fundo e os destaques mudam com ele — e todos eles
          funcionam tanto em escuro como em claro. Alterna entre escuro e claro na
          gaveta, em <b>Aspeto</b>; segue a definição do teu sistema até lhe dizeres o
          contrário.
        </p>
      </>
    ),
  },
  {
    heading: "Etiquetas de ambiente",
    body: (
      <>
        <p>
          Seis etiquetas — <b>Música</b>, <b>Podcast</b>, <b>TV</b>, <b>Silêncio</b>,{" "}
          <b>Ruído</b>, <b>Auscultadores</b> — que descrevem as condições em que estás a
          trabalhar. São um registo, não um comando: nada na aplicação muda quando
          carregas numa.
        </p>
        <ul>
          <li>
            <b>Silêncio limpa as outras quatro etiquetas de som</b>, porque não podes
            estar em silêncio e ter a TV ligada.
          </li>
          <li>
            <b>Auscultadores é independente</b> — é equipamento na tua cabeça, não um
            ambiente sonoro, por isso pode estar ligado ao lado de qualquer uma das
            outras.
          </li>
        </ul>
        <p>
          O que estiver aceso quando uma corrida termina fica guardado com essa sessão
          e — se usares o Todoist e deixares ligada a definição de comentário de tempo —
          é nomeado no comentário que o GLU publica: <i>“[25m] Passaste 25 minutos
          nisto — com música, com auscultadores”</i>.
        </p>
        <p>
          <b>Silêncio não é um botão para silenciar.</b> Diz como trabalhaste. O som de
          fim de corrida é controlado pelo volume do teu dispositivo, e por mais nada.
        </p>
      </>
    ),
  },
  {
    heading: "Sessões e “Novo dia”",
    body: (
      <>
        <p>
          Cada corrida concluída acrescenta um ponto por baixo do temporizador, com uma
          contagem ao lado. Depois de doze pontos, os restantes são resumidos como{" "}
          <code>+N</code> para que um dia heroico não desarrume o layout. O interruptor{" "}
          <b>Mostrar sessões</b> ao lado deles controla se a contagem também aparece no
          próprio relógio.
        </p>
        <p>
          <b>“Novo dia” repõe a contagem a zero</b>, e pede-te primeiro uma confirmação.
          É <b>manual</b> — o GLU não muda de dia à meia-noite, porque um dia de foco
          começa quando te sentas, não quando a data muda. Trabalha para lá da
          meia-noite e continua a ser a mesma sentada até dizeres o contrário.
        </p>
        <p>
          O dia que fechas fica guardado num arquivo de <b>no máximo os últimos 90
          dias</b>; os mais antigos caem automaticamente. Tudo isso é guardado apenas
          neste navegador — não há cópia no servidor, não há conta, e não há sincronização
          com outro dispositivo. Limpar os dados do site apaga tudo por completo, e esse
          é o único botão de apagar que é preciso existir. A{" "}
          <LegalLink href="/privacy">Política de privacidade</LegalLink> enumera
          exatamente o que lá está.
        </p>
      </>
    ),
  },
  {
    heading: "Alertas no fim de uma corrida",
    body: (
      <>
        <p>
          Quando uma corrida chega a zero com o GLU aberto, ele toca um som — gerado no
          navegador, por isso não se descarrega nada. O seu volume é o volume do teu
          dispositivo.
        </p>
        <p>
          Em <b>Definições → Alertas</b> escolhes qual, de entre nove:
        </p>
        <DataList
          items={[
            {
              term: "Som",
              detail:
                "Chime (o predefinido), Bell, Wood, Rise, Settle, Pulse, Digital, Glass ou Deep. Tocar num reproduz-no, para escolheres pelos ouvidos; tocar no que está a tocar pára-o.",
            },
            {
              term: "Quanto tempo toca",
              detail:
                "Uma vez, por omissão — o som toca do princípio ao fim uma única vez. Escolhe 3, 5, 10 ou 20 segundos e repete-se até passar esse tempo; a última repetição termina sempre, por isso pode durar mais um instante. Carregar em Iniciar, Pausar, Retomar ou Parar — ou nas respetivas teclas — interrompe-o.",
            },
          ]}
        />
        <p>
          <b>Se o separador estiver em segundo plano, recebes também uma notificação</b>{" "}
          (“GLU — acabou o tempo”), que traz a aplicação para a frente quando clicas
          nela. Uma página visível nunca é notificada — já estás a olhar para ela. O som
          funciona nos dois casos.
        </p>
        <p>
          <b>Definições → Alertas</b> começa com um interruptor para isto. Ligá-lo pede
          permissão ao teu navegador, e desligá-lo pára as notificações sem mexer no som.
          O GLU também pergunta quando carregas em Iniciar, no máximo três vezes — a
          partir daí deixa de perguntar de vez, e o interruptor é o caminho. Se o teu
          navegador estiver a bloquear notificações, o interruptor di-lo, e diz-te onde
          mudar isso.
        </p>
        <p>
          <b>Parares tu uma corrida é deliberadamente silencioso</b>, tal como uma
          corrida que terminou com o separador fechado. Os alertas existem para te
          interromper quando não estás a olhar — não para te dar os parabéns por teres
          carregado em Parar.
        </p>
        <p>
          No Chrome em Android a notificação é entregue por um pequeno auxiliar em
          segundo plano que existe só para isso — não guarda nada, nunca toca na rede, e
          não muda mais nada na forma como o GLU carrega. Num iPad, o Safari não oferece
          notificações a um separador de navegador, por isso aí o GLU recorre apenas ao
          som — normalmente com o dispositivo apoiado à tua frente e com o ecrã mantido
          aceso, de qualquer forma.
        </p>
      </>
    ),
  },
  {
    heading: "Manter o ecrã aceso",
    body: (
      <>
        <p>
          Um tablet que adormece a meio da sessão esconde precisamente aquilo para que o
          apoiaste. Em <b>Definições → Ecrã</b> há dois interruptores:
        </p>
        <DataList
          items={[
            {
              term: "Manter aceso no site",
              detail:
                "Desligado por omissão. Mantém o ecrã aceso enquanto o GLU estiver aberto, com ou sem temporizador — a definição para um dispositivo que vive na tua secretária a mostrar o relógio.",
            },
            {
              term: "Manter aceso enquanto o temporizador corre",
              detail:
                "Ligado por omissão. Mantém o ecrã aceso durante uma corrida, e durante cinco minutos depois de pausar ou terminar, para não estares a olhar para um ecrã preto quando o som tocar.",
            },
          ]}
        />
        <p>
          Alguns navegadores só permitem isto enquanto o separador estiver visível, por
          isso mudar de separador liberta-o e voltar volta a pedi-lo. Nada é comunicado
          seja onde for — é um pedido ao teu próprio dispositivo.
        </p>
      </>
    ),
  },
  {
    heading: "O último minuto",
    body: (
      <>
        <p>
          Abaixo dos <b>60 segundos restantes</b>, a cor do relógio inunda o fundo
          inteiro e tudo o resto recua. A ideia é ser visível do outro lado da sala e
          pelo canto do olho — o momento em que começas a acabar a frase em vez de
          começar outra. Mantém-se ao longo do 00:00 como visor de fim, e desaparece
          assim que pares ou pauses.
        </p>
        <p>
          <b>Toca em qualquer sítio — incluindo no relógio — e volta tudo</b>, para o
          resto dessa corrida: os botões, as etiquetas, a lista de tarefas. Não vai
          voltar a alastrar por cima delas passados uns segundos. A próxima corrida que
          começares tem o seu próprio último minuto.
        </p>
        <p>
          Num ecrã estreito nada disto se aplica. Aí o relógio já enche o primeiro ecrã e
          tudo o resto fica por baixo, por isso não há nada para esconder — desces até
          aos controlos exatamente como farias sempre.
        </p>
      </>
    ),
  },
  {
    heading: "Todoist (opcional)",
    body: (
      <>
        <p>
          O GLU funciona perfeitamente bem sozinho. Ligar o{" "}
          <LegalLink href="https://todoist.com">Todoist</LegalLink> acrescenta uma lista
          de tarefas ao lado do temporizador, para que aquilo que estás a cronometrar
          tenha um nome.
        </p>
        <p>
          <b>Iniciar sessão:</b> o botão <i>Iniciar sessão com o Todoist</i> na zona
          superior direita, ou <b>Definições → Todoist</b>. Aprovas a ligação no ecrã do
          próprio Todoist. Termina sessão outra vez a partir da mesma linha das
          definições, ou revoga o GLU dentro do Todoist — qualquer uma das duas chega, e
          revogar funciona sem sequer tocares nesta aplicação.
        </p>
        <DataList
          items={[
            {
              term: "Escolher o que mostrar",
              detail:
                "O ícone de ferramentas abre o seletor de origem: um filtro, uma etiqueta ou um projeto. Um projeto agrupa as tarefas sob um cabeçalho por cada secção, por ordem, com as tarefas sem secção primeiro. Um filtro ou uma etiqueta agrupam também todas as tarefas por projeto — \"Trabalho / Hoje\", ou só \"Trabalho\" quando a tarefa não tem secção — já que um dos seus resultados pode pertencer a qualquer projeto, e são ordenados como o Todoist os ordena por omissão: primeiro a prioridade, depois a data, depois o prazo, depois o sítio onde a tarefa está nos teus projetos, exceto que um filtro construído em torno de datas continua aqui a ser ordenado pela prioridade primeiro. Listas longas mostram as primeiras 200 tarefas e dizem-no.",
            },
            {
              term: "Encurtar uma secção longa",
              detail:
                "Definições → Tarefas limita quantas tarefas cada secção mostra — 10, 20, 50, 100, ou todas, que é o valor por omissão. Tudo o que exceder o limite fica atrás de uma linha \"+N mais\" em que podes tocar para ver o resto dessa secção; a visita seguinte começa outra vez limitada.",
            },
            {
              term: "Atualizar a lista",
              detail:
                "A lista é lida de novo quando escolhes uma origem e sempre que voltas ao separador — nunca sonda em segundo plano. Para a pedires tu, puxa a lista para baixo com um dedo até o ícone de atualização se preencher, e larga: roda até chegar a lista nova e depois desliza para fora. O ícone de atualização no canto superior direito faz exatamente o mesmo.",
            },
            {
              term: "Concluir uma tarefa",
              detail:
                "Toca no círculo de prioridade à esquerda de um cartão — o mesmo gesto do Todoist. Fica concluída de imediato e sai da lista, e uma barra em baixo dá-te cerca de dez segundos para anulares.",
            },
            {
              term: "Focar uma tarefa",
              detail:
                "O botão de foco fixa uma tarefa por cima da lista. É a essa tarefa que um comentário de tempo é publicado, e o cartão dela mostra o total acumulado de tempo que o GLU já lhe registou.",
            },
            {
              term: "Detalhes da tarefa",
              detail:
                "Tocar num cartão abre a sua descrição e comentários — imagens incluídas — como um painel no tablet, em ecrã inteiro num visor estreito. É só de leitura; nada ali altera a tua tarefa.",
            },
          ]}
        />
        <p>
          <b>Comentários de tempo.</b> Quando uma corrida termina com uma tarefa focada,
          o GLU publica-lhe um comentário: <code>[25m] Passaste 25 minutos nisto</code>.
          Espera uns segundos antes de enviar — a barra de anulação pode cancelá-lo por
          completo nessa janela — e durante alguns segundos depois de chegar, anular
          apaga-o outra vez. Corridas mais curtas do que o teu mínimo não recebem
          nenhum; esse mínimo é um minuto, a não ser que o mudes em{" "}
          <b>Definições → Comentários de tempo</b>, onde <b>Dizer como trabalhaste</b>{" "}
          decide também se as tuas etiquetas de ambiente são nomeadas na frase. Ambas as
          definições te mostram o comentário exato que vais obter.
        </p>
        <p>
          O GLU só escreve essas duas coisas — um comentário de tempo, e concluir ou
          reabrir uma tarefa — e só quando lho pedes. Não consegue publicar texto
          arbitrário: a frase é composta no servidor do GLU a partir dos números e das
          etiquetas, nunca escrita pela página. A tua ligação ao Todoist é guardada num
          cookie encriptado que o teu navegador não consegue ler e que o servidor do GLU
          não armazena; todo o tráfego para o Todoist passa por esse servidor, por isso o
          token da tua conta nunca chega à página. A{" "}
          <LegalLink href="/privacy">Política de privacidade</LegalLink> tem o resto.
        </p>
      </>
    ),
  },
  {
    heading: "Dois layouts",
    body: (
      <>
        <p>
          <b>Num tablet</b>, está tudo num ecrã e a página não faz scroll: o temporizador
          fica com a metade esquerda, o Todoist com o canto superior direito, as
          etiquetas de ambiente com o canto inferior direito.
        </p>
        <p>
          <b>Num ecrã estreito</b> — um telemóvel, ou meio tablet — o relógio ocupa o
          primeiro ecrã inteiro e tudo o resto se empilha por baixo, por isso a página faz
          scroll. O relógio é aquilo que espreitas; é a ele que cabe o espaço.
        </p>
      </>
    ),
  },
  {
    heading: "Onde está cada coisa",
    body: (
      <>
        <p>
          A <b>seta no canto superior direito</b> é a única peça permanente da moldura.
          Abre a gaveta, que contém:
        </p>
        <DataList
          items={[
            { term: "GitHub", detail: "O código-fonte. O GLU é open source." },
            { term: "Aspeto", detail: "Escuro ou claro, lembrado entre visitas." },
            { term: "Documentação", detail: "Esta página." },
            {
              term: "Definições",
              detail:
                "Todoist (iniciar ou terminar sessão), Tarefas (quantos itens uma secção mostra), Ecrã (os dois interruptores de manter aceso) e Comentários de tempo (o que é publicado no Todoist, e quando).",
            },
          ]}
        />
        <p>
          Por baixo desses, ligações para a{" "}
          <LegalLink href="/privacy">Política de privacidade</LegalLink> e para os{" "}
          <LegalLink href="/terms">Termos do serviço</LegalLink>.
        </p>
      </>
    ),
  },
  {
    heading: "Limites, com franqueza",
    body: (
      <ul>
        <li>
          <b>Sem sincronização.</b> O teu histórico vive num navegador, num dispositivo.
          Outro navegador, outro dispositivo ou uma janela privada são um GLU diferente e
          vazio.
        </li>
        <li>
          <b>Sem modo offline.</b> Instalado ou não, precisa de ligação para arrancar.
        </li>
        <li>
          <b>Noventa dias.</b> O arquivo guarda no máximo isso, e limpar os dados do site
          limpa-o todo. Trata o GLU como uma forma de veres o trabalho de hoje, não como
          um sistema de registo — os{" "}
          <LegalLink href="/terms">Termos do serviço</LegalLink> dizem o mesmo em
          palavras mais formais.
        </li>
        <li>
          <b>Um servidor pequeno, protegido.</b> A ligação ao Todoist passa por um proxy
          com limite de pedidos. O uso normal nunca dará por ele; martelá-lo dá recusas
          curtas e temporárias.
        </li>
        <li>
          <b>Não há como anular o “Novo dia”.</b> É por isso que ele pergunta primeiro.
        </li>
      </ul>
    ),
  },
  {
    heading: "Privacidade e termos",
    body: (
      <p>
        A <LegalLink href="/privacy">Política de privacidade</LegalLink> expõe exatamente
        o que o GLU trata, o que fica no teu dispositivo e o que escreve no Todoist. Os{" "}
        <LegalLink href="/terms">Termos do serviço</LegalLink> cobrem a utilização da
        aplicação alojada. Ambos estão ligados no fim desta página, e a partir da gaveta.
      </p>
    ),
  },
];

const content: DocumentContent = { updated, title, intro, sections };

export default content;
