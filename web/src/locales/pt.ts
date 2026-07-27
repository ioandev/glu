import type { Messages } from "./en";

const messages = {
  language: {
    sectionTitle: "Idioma",
    sectionAriaLabel: "Definições de idioma",
    label: "Idioma",
    description:
      "O idioma em que o GLU é apresentado. «Automático» segue o idioma que o teu navegador pede.",
    automatic: "Automático",
  },

  settings: {
    todoistAriaLabel: "Definições do Todoist",
    todoistTitle: "Todoist",
    signedInAs: "Sessão iniciada como {name}",
    signedInFallbackName: "a tua conta do Todoist",
    logOut: "Terminar sessão",

    tasksAriaLabel: "Definições de tarefas",
    tasksTitle: "Tarefas",
    sectionItemLimitLabel: "Limitar os itens de uma secção a",
    sectionItemLimitDescription:
      "As secções longas mostram este número de tarefas; o resto fica atrás de um «+N mais» que podes tocar.",
    sectionItemLimitAll: "Todas",

    screenAriaLabel: "Definições do ecrã",
    screenTitle: "Ecrã",
    stayAwakeAlwaysLabel: "Manter o ecrã ligado no site",
    stayAwakeAlwaysDescription:
      "Mantém o ecrã ligado enquanto o GLU estiver aberto, com ou sem temporizador.",
    stayAwakeRunningLabel: "Mantê-lo ligado enquanto o temporizador corre",
    stayAwakeRunningDescription:
      "Mantém-no ligado durante uma sessão, e cinco minutos depois de pausar ou terminar.",

    alertsAriaLabel: "Definições de avisos",
    alertsTitle: "Avisos",

    commentsAriaLabel: "Definições de comentários de tempo",
    commentsTitle: "Comentários de tempo",
    thresholdLabel: "Tempo mínimo a registar",
    thresholdDescription:
      "Uma sessão mais curta do que isto não publica qualquer comentário na tarefa em foco.",
    minutesShort: "{count} min",
    sayHowYouWorkedLabel: "Dizer como trabalhaste",
    sayHowYouWorkedDescription:
      "Acrescenta os teus interruptores de ambiente ao comentário que o GLU publica na tarefa em foco.",
    previewOn: "Sim",
    previewOff: "Não",
    previewSampled: "{label} · Exemplo",
    previewLive: "{label} · Agora",
    previewSampleNote:
      "Ainda não há interruptores de ambiente ligados — o exemplo mostra como ficaria com {first} e {second}.",
  },

  alerts: {
    soundLabel: "Som",
    soundDescription:
      "Toca quando uma sessão chega a zero. Toca num deles para ouvir exactamente o que vais ter.",
    durationLabel: "Quanto tempo toca",
    durationDescription:
      "O GLU repete o som até passar este tempo. A última repetição termina sempre, por isso pode durar mais um instante.",
    durationOnce: "Uma vez",
    durationSeconds: "{count} s",

    soundChime: "Carrilhão",
    soundBell: "Sino",
    soundWood: "Madeira",
    soundRise: "Subida",
    soundSettle: "Repouso",
    soundPulse: "Pulso",
    soundDigital: "Digital",
    soundGlass: "Vidro",
    soundDeep: "Grave",

    notifyLabel: "Avisar-me quando uma sessão terminar",
    notifyDescription:
      "Uma notificação quando uma sessão chega a zero enquanto estás a olhar para outra coisa. O som toca de qualquer forma.",
    notifyDenied:
      "O teu navegador está a bloquear as notificações deste site. Abre as definições do site — o ícone ao lado da barra de endereço, ou ⋮ → Definições do site no Android — coloca Notificações em Permitir e volta a ligar isto.",
    notifyDismissed:
      "O pedido fechou sem resposta. Volta a ligar isto e escolhe Permitir.",
    notifyUnsupported:
      "Este navegador não oferece notificações. O som continua a tocar quando uma sessão termina.",
  },

  timer: {
    startHint: "Começar — {key}",
    pauseHint: "Pausar — {key}",
    resumeHint: "Retomar — {key}",
    stopHint: "Parar — {key}",
    start: "Começar",
    pause: "Pausar",
    resume: "Retomar",
    stop: "Parar",

    presetsAriaLabel: "Durações predefinidas",
    adjustAriaLabel: "Ajustar o tempo restante",
    adjustAdd: "Acrescentar {count, plural, one {# minuto} other {# minutos}}",
    adjustSubtract: "Retirar {count, plural, one {# minuto} other {# minutos}}",

    sessionsAriaLabel: "Sessões de hoje",
    sessionsToday: "{count} hoje",
    sessionsOverflow: "+{count}",
    newDay: "Novo dia",
    newDayConfirmAriaLabel: "Confirmar novo dia",
    newDayHeading: "Começar um novo dia?",
    newDayNothing: "Ainda não há nada para reiniciar.",
    newDayReset:
      "{count, plural, one {A # sessão de hoje volta a zero.} other {As # sessões de hoje voltam a zero.}}",
    cancel: "Cancelar",
    reset: "Reiniciar",
    showSessions: "Mostrar as sessões",
  },

  app: {
    timerAriaLabel: "Temporizador",
    todoistAriaLabel: "Área do Todoist",
    environmentAriaLabel: "Interruptores de ambiente",
  },

  clock: {
    focus: "Foco",
    paused: "Em pausa",
    done: "Feito",
    ready: "Pronto",

    ascending: "A subir",
    apertureOpening: "A abrir",
    banking: "a acumular",
    counting: "a contar",
    growingBubble: "A crescer",
    dontBreakIt: "não a partas",
    orbit: "Órbita",
    celebratingEarly: "A celebrar cedo",
    deepWork: "Trabalho profundo",
    momentumDominoes: "Impulso",
    untilBreak: "Até à pausa",
    momentumGauge: "Ímpeto",
    warmingUp: "A aquecer",
    leftInk: "resta",
    credited: "creditado",
    inSession: "em sessão",
    countingDownNeon: "Em contagem",
    leftPercent: "restante",
    pouring: "a verter",
    stillAlive: "Ainda vivo",
    stamping: "a carimbar",
    heatingUp: "Ao rubro",
    scanning: "A varrer",
    radiating: "A irradiar",
    enRoute: "A caminho",
    focusSignal: "Sinal de foco",
    building: "a construir",
    earning: "a ganhar",
    growingSprout: "a crescer",
    keepClimbing: "Foco · continua a subir",
    focusRising: "Foco a subir",
    focusUntilSundown: "Foco até ao pôr do sol",
    leftToScore: "para marcar",
    lightingUp: "A acender",
    fillingFocus: "A encher · foco",
    filling: "A encher",
    rec: "Rec",
    thenABreak: "Depois, pausa",

    arcadeLine: "1UP · {label}",
    broadsideLine: "Pomodoro — {label}",
    cellLine: "Energia restante · {label}",
    lunarLine: "Crescente · {label}",
    mercuryLine: "Calor do foco · {label}",
    odometerLine: "Minutos · segundos · {label}",
    splitFlapLine: "Parte agora · {label}",
    starsLine: "Uma estrela cada {seconds}s · {label}",
    tempoLine: "Tempo · {label}",
    percentThenLabel: "{percent}% {label}",
    ghostLine: ":{seconds} · {label}",
    altitudeLine: "{label} · {percent}%",
    nixieTube: " · tubo {session}",

    arcadeTime: "Tempo {time}",
    beamDone: "{percent}% de {minutes}m feito",
    blueprintFigure: "Fig. — tempo restante",
    broadsideSessions: "Sessões {session}",
    depthMetres: "-{metres} m",
    inkFocus: "FOCUS",
    lapsCounter: "Volta {lap} de {total}",
    logRemaining: "{time} restante",
    marqueeCountingDown: "Em contagem",
    milestoneRow: "{label} — {minutes} min",
    monoTimer: "Timer_01",
    percentProgress: "Progresso da sessão",
    pillDone: "{percent}% feito",
    punchcardTitle: "Cartão de foco",
    splitFlapPlatform: "Linha {session}",
    wordsRightNow: "Agora mesmo",
    ledgerCredited: "{minutes} min",

    ledgerDeepFocus: "Foco profundo",
    ledgerSteadyWork: "Trabalho constante",
    ledgerPushThrough: "Aguentar",
    ledgerHomeStretch: "Reta final",
    ledgerFinalSprint: "Sprint final",

    milestoneStarted: "Sessão iniciada",
    milestoneSettledIn: "Já embalado",
    milestoneHalfway: "A meio",
    milestoneFinalStretch: "Troço final",
    milestoneBreakEarned: "Pausa merecida",

    terminalSession: "sessão {session} · {state}",
    terminalHint: "^C para abandonar · s para parar",

    logInProgress: "min {minute} — em curso…",
    logLogged: "min {minute} — registado ✓",

    wordsUnderAMinute: "resta menos de um minuto de foco",
    wordsSentence:
      "cerca de {spelled} {count, plural, one {minuto} other {minutos}} de foco restante",
  },

  chrome: {
    openHeader: "Abrir o cabeçalho",
    closeHeader: "Fechar o cabeçalho",
    drawerTitle: "GLU",
    loading: "A carregar…",
    github: "GitHub",
    appearance: "Aspeto",
    switchToLight: "Mudar para o tema claro",
    switchToDark: "Mudar para o tema escuro",
    toggleScheme: "Alternar o esquema de cores",
    dark: "Escuro",
    light: "Claro",
    docs: "Manual",
    settings: "Definições",
    docsTitle: "Como funciona o GLU",
    closeDocs: "Fechar o manual",
    settingsTitle: "Definições",
    closeSettings: "Fechar as definições",
    legalAriaLabel: "Legal",
    privacy: "Política de privacidade",
    terms: "Termos do serviço",

    swipeHint: "Desliza o relógio para mudar de design",
    tip: "Dica",
    dismissTip: "Dispensar a dica",
  },

  meta: {
    homeTitle: "GLU — temporizador pomodoro e de concentração",
    homeDescription:
      "Um temporizador pomodoro e de concentração pensado para tablets: dezenas de designs de relógio, registo do ambiente, um histórico que fica no teu aparelho e registo de tempo opcional no Todoist.",
    welcomeTitle: "Um temporizador de concentração para o tablet na tua secretária",
    welcomeDescription:
      "Escolhe uma duração, carrega em começar e trabalha até o relógio chegar a zero. O GLU é um temporizador pomodoro com dezenas de designs de relógio e sem conta — o histórico fica no teu aparelho.",
    privacyTitle: "Política de privacidade",
    privacyDescription:
      "O que o GLU trata, para onde vai e o que nunca faz. Sem contas, sem análises, com o histórico guardado no teu próprio aparelho.",
    termsTitle: "Termos do serviço",
    termsDescription:
      "As condições de utilização do GLU: um temporizador de concentração pessoal e gratuito, tal como está, com os teus dados no teu aparelho e a tua conta do Todoist sempre tua.",
    docsTitle: "Como funciona o GLU",
    docsDescription:
      "O manual do GLU: o temporizador e os seus atalhos, a galeria de relógios, os interruptores de ambiente, o histórico de sessões, os avisos e a ligação opcional ao Todoist.",
  },

  welcome: {
    eyebrow: "Temporizador pomodoro e de concentração",
    headline: "Um temporizador de concentração para o tablet na tua secretária.",
    sub: "Escolhe uma duração, carrega em começar e trabalha até o relógio chegar a zero. O GLU guarda o registo no aparelho em que te concentraste — sem conta, sem inscrição, sem nada para configurar antes de ser útil.",
    cta: "Começar a concentrar-me",

    featureClockTitle: "O relógio é a página",
    featureClockBody:
      "O temporizador ocupa toda a metade esquerda de um tablet, grande o suficiente para se ler do outro lado da sala. Desliza-o e percorres <b>{count} designs de relógio</b>, cada um com a sua paleta — e aquele em que paras recolore tudo à sua volta, no escuro e no claro.",
    featureEnvironmentTitle: "Repara em como trabalhaste",
    featureEnvironmentBody:
      "Seis fichas — <b>música, podcast, TV, silêncio, ruído, auscultadores</b> — registam a sala em que te concentraste. Basta um toque, e transforma um monte de sessões iguais em algo que consegues mesmo reler.",
    featureRecordTitle: "O teu registo continua teu",
    featureRecordBody:
      "As sessões são contadas por dia e guardadas <b>neste navegador</b>. Não há conta para criar, nem servidor com uma cópia, nem análises a ver-te trabalhar. Limpar os dados do navegador é tudo o que é preciso para apagar o GLU.",
    featureTodoistTitle: "Todoist, só se quiseres",
    featureTodoistBody:
      "Liga o Todoist e podes fixar a tarefa em que estás a trabalhar, e deixar o GLU publicar-lhe o tempo como comentário quando a sessão terminar. Salta esta parte e todo o resto do GLU funciona exactamente da mesma maneira.",

    installNote:
      "<b>Instala-o.</b> Procura o ícone de instalação na barra de endereço do teu navegador, ou «Adicionar ao ecrã principal» num iPad, e o GLU abre em ecrã inteiro como uma app — sem barra do navegador. Mas <b>não</b> é uma app offline: instalada ou não, precisa de ligação para arrancar.",
    aboutNavAriaLabel: "Sobre o GLU",
    footnote: "O GLU é gratuito e de código aberto.",
  },

  document: {
    lastUpdated: "Última atualização: {date}",
    backToGlu: "← Voltar ao GLU",
    footerAriaLabel: "Legal",
    welcome: "Boas-vindas",
    documentation: "Documentação",
    privacy: "Política de privacidade",
    terms: "Termos do serviço",
    sourceOnGitHub: "Código no GitHub",
    docsNavAriaLabel: "Navegação do manual",
    openAsPage: "Abrir como página",
    translationNotice:
      "Esta é uma tradução de cortesia. A versão em inglês é a que se aplica.",
  },

  todoist: {
    logIn: "Iniciar sessão com o Todoist",
    logOut: "Terminar sessão",
    accountFallback: "Todoist",
    accountAriaLabel: "Conta do Todoist: {label}",

    sourceFilter: "Filtro",
    sourceLabel: "Etiqueta",
    sourceProject: "Projeto",
    sourceHint: "As secções de um projeto aparecem umas a seguir às outras, na ordem do Todoist.",
    chooseSource: "Escolher a origem das tarefas",
    sourceTitle: "Origem das tarefas",
    closeSource: "Fechar a origem das tarefas",
    chooseFilter: "Escolhe um filtro",
    chooseLabel: "Escolhe uma etiqueta",
    chooseProject: "Escolhe um projeto",
    filters: "Filtros",
    labels: "Etiquetas",
    projects: "Projetos",
    loading: "A carregar…",
    nothingHere: "Aqui não há nada.",

    pickSourceHint: "Escolhe um filtro, uma etiqueta ou um projeto com o ícone acima.",
    sourceEmpty: "Aqui não há nada — {name} está livre.",
    moreHidden: "+{count} mais",
    showingFirst: "A mostrar as primeiras {count}",
    refreshTasks: "Atualizar as tarefas",

    taskTitle: "Tarefa",
    closeTask: "Fechar a tarefa",
    refreshTask: "Atualizar a tarefa",
    taskGone: "Esta tarefa já não existe no Todoist.",
    close: "Fechar",
    comments: "Comentários · os mais antigos primeiro",
    noComments: "Ainda não há comentários.",

    focused: "Em foco",
    unfocus: "Tirar do foco",
    noLongerInTodoist: "Já não está no Todoist",
    pendingComments:
      "{count, plural, one {# comentário pendente} other {# comentários pendentes}}",

    openTask: "Abrir «{title}»",
    focusTask: "Pôr «{title}» em foco",
    unfocusTask: "Tirar «{title}» do foco",
    completeTask: "Concluir «{title}»",
    priority: "Prioridade {level}",

    completed: "Concluída · {title}",
    commentWillBeAdded: "será acrescentado um comentário",
    commentAdded: "comentário acrescentado",
    undo: "Anular",

    couldNotComplete: "Não foi possível concluir",
    couldNotUndo: "Não foi possível anular",
    retry: "Tentar de novo",
  },

  errors: {
    unreachable: "Não foi possível contactar o Todoist.",
  },

  notifications: {
    sessionEndTitle: "GLU — acabou o tempo",
    sessionEndBody: "Sessão de {duration} terminada.",
  },

  environment: {
    legend: "Ambiente",
    ariaLabel: "Ambiente",
    music: "Música",
    podcast: "Podcast",
    tv: "TV",
    silence: "Silêncio",
    noisy: "Ruído",
    headphones: "Auscultadores",
  },
} satisfies Messages;

export default messages;
