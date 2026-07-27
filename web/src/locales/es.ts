import type { Messages } from "./en";

const messages = {
  language: {
    sectionTitle: "Idioma",
    sectionAriaLabel: "Ajustes de idioma",
    label: "Idioma",
    description:
      "El idioma en el que se muestra GLU. «Automático» sigue el idioma que pide tu navegador.",
    automatic: "Automático",
  },

  settings: {
    todoistAriaLabel: "Ajustes de Todoist",
    todoistTitle: "Todoist",
    signedInAs: "Sesión iniciada como {name}",
    signedInFallbackName: "tu cuenta de Todoist",
    logOut: "Cerrar sesión",

    tasksAriaLabel: "Ajustes de tareas",
    tasksTitle: "Tareas",
    sectionItemLimitLabel: "Limitar los elementos de una sección a",
    sectionItemLimitDescription:
      "Las secciones largas muestran este número de tareas; el resto queda tras un «+N más» que puedes tocar.",
    sectionItemLimitAll: "Todas",

    screenAriaLabel: "Ajustes de pantalla",
    screenTitle: "Pantalla",
    stayAwakeAlwaysLabel: "Mantener la pantalla encendida en el sitio",
    stayAwakeAlwaysDescription:
      "Mantiene la pantalla encendida mientras GLU esté abierto, con o sin temporizador.",
    stayAwakeRunningLabel: "Mantenerla encendida mientras corre el temporizador",
    stayAwakeRunningDescription:
      "La mantiene encendida durante una sesión, y cinco minutos después de pausarla o terminarla.",

    alertsAriaLabel: "Ajustes de avisos",
    alertsTitle: "Avisos",

    commentsAriaLabel: "Ajustes de comentarios de tiempo",
    commentsTitle: "Comentarios de tiempo",
    thresholdLabel: "Tiempo mínimo para registrar",
    thresholdDescription:
      "Una sesión más corta que esto no publica ningún comentario en la tarea enfocada.",
    minutesShort: "{count} min",
    sayHowYouWorkedLabel: "Contar cómo trabajaste",
    sayHowYouWorkedDescription:
      "Añade tus interruptores de entorno al comentario que GLU publica en la tarea enfocada.",
    previewOn: "Sí",
    previewOff: "No",
    previewSampled: "{label} · Ejemplo",
    previewLive: "{label} · Ahora",
    previewSampleNote:
      "Todavía no hay interruptores de entorno activos: el ejemplo muestra cómo se vería con {first} y {second}.",
  },

  alerts: {
    soundLabel: "Sonido",
    soundDescription:
      "Suena cuando una sesión llega a cero. Toca uno para oír exactamente lo que tendrás.",
    durationLabel: "Cuánto tiempo suena",
    durationDescription:
      "GLU repite el sonido hasta que pasa este tiempo. La última repetición siempre termina, así que puede durar un momento más.",
    durationOnce: "Una vez",
    durationSeconds: "{count} s",

    soundChime: "Campanilla",
    soundBell: "Campana",
    soundWood: "Madera",
    soundRise: "Ascenso",
    soundSettle: "Reposo",
    soundPulse: "Pulso",
    soundDigital: "Digital",
    soundGlass: "Cristal",
    soundDeep: "Grave",

    notifyLabel: "Avisarme cuando termine una sesión",
    notifyDescription:
      "Una notificación cuando una sesión llega a cero mientras miras otra cosa. El sonido suena igualmente.",
    notifyDenied:
      "Tu navegador está bloqueando las notificaciones de este sitio. Abre los ajustes del sitio —el icono junto a la barra de direcciones, o ⋮ → Configuración de sitios en Android—, pon Notificaciones en Permitir y vuelve a activar esto.",
    notifyDismissed:
      "El aviso se cerró sin respuesta. Vuelve a activar esto y elige Permitir.",
    notifyUnsupported:
      "Este navegador no ofrece notificaciones. El sonido sigue sonando cuando termina una sesión.",
  },

  timer: {
    startHint: "Empezar — {key}",
    pauseHint: "Pausar — {key}",
    resumeHint: "Reanudar — {key}",
    stopHint: "Parar — {key}",
    start: "Empezar",
    pause: "Pausar",
    resume: "Reanudar",
    stop: "Parar",

    presetsAriaLabel: "Duraciones predefinidas",
    adjustAriaLabel: "Ajustar el tiempo restante",
    adjustAdd: "Añadir {count, plural, one {# minuto} other {# minutos}}",
    adjustSubtract: "Quitar {count, plural, one {# minuto} other {# minutos}}",

    sessionsAriaLabel: "Sesiones de hoy",
    sessionsToday: "{count} hoy",
    sessionsOverflow: "+{count}",
    newDay: "Nuevo día",
    newDayConfirmAriaLabel: "Confirmar nuevo día",
    newDayHeading: "¿Empezar un nuevo día?",
    newDayNothing: "Todavía no hay nada que reiniciar.",
    newDayReset:
      "{count, plural, one {La # sesión de hoy vuelve a cero.} other {Las # sesiones de hoy vuelven a cero.}}",
    cancel: "Cancelar",
    reset: "Reiniciar",
    showSessions: "Mostrar las sesiones",
  },

  app: {
    timerAriaLabel: "Temporizador",
    todoistAriaLabel: "Zona de Todoist",
    environmentAriaLabel: "Interruptores de entorno",
  },

  clock: {
    focus: "Foco",
    paused: "En pausa",
    done: "Hecho",
    ready: "Listo",

    ascending: "Subiendo",
    apertureOpening: "Abriendo",
    banking: "acumulando",
    counting: "contando",
    growingBubble: "Creciendo",
    dontBreakIt: "no la rompas",
    orbit: "Órbita",
    celebratingEarly: "Celebrando antes",
    deepWork: "Trabajo profundo",
    momentumDominoes: "Impulso",
    untilBreak: "Hasta la pausa",
    momentumGauge: "Impulso",
    warmingUp: "Calentando",
    leftInk: "queda",
    credited: "abonado",
    inSession: "en sesión",
    countingDownNeon: "Cuenta atrás",
    leftPercent: "restante",
    pouring: "vertiendo",
    stillAlive: "Sigue vivo",
    stamping: "sellando",
    heatingUp: "Al rojo",
    scanning: "Escaneando",
    radiating: "Irradiando",
    enRoute: "En ruta",
    focusSignal: "Señal de foco",
    building: "construyendo",
    earning: "ganando",
    growingSprout: "creciendo",
    keepClimbing: "Foco · sigue subiendo",
    focusRising: "Foco en alza",
    focusUntilSundown: "Foco hasta el ocaso",
    leftToScore: "para marcar",
    lightingUp: "Encendiendo",
    fillingFocus: "Llenando · foco",
    filling: "Llenando",
    rec: "Rec",
    thenABreak: "Luego, pausa",

    arcadeLine: "1UP · {label}",
    broadsideLine: "Pomodoro — {label}",
    cellLine: "Energía restante · {label}",
    lunarLine: "Creciente · {label}",
    mercuryLine: "Calor de foco · {label}",
    odometerLine: "Minutos · segundos · {label}",
    splitFlapLine: "Sale ahora · {label}",
    starsLine: "Una estrella cada {seconds}s · {label}",
    tempoLine: "Tempo · {label}",
    percentThenLabel: "{percent}% {label}",
    ghostLine: ":{seconds} · {label}",
    altitudeLine: "{label} · {percent}%",
    nixieTube: " · tubo {session}",

    arcadeTime: "Tiempo {time}",
    beamDone: "{percent}% de {minutes}m hecho",
    blueprintFigure: "Fig. — tiempo restante",
    broadsideSessions: "Sesiones {session}",
    depthMetres: "-{metres} m",
    inkFocus: "FOCUS",
    lapsCounter: "Vuelta {lap} de {total}",
    logRemaining: "{time} restante",
    marqueeCountingDown: "Cuenta atrás",
    milestoneRow: "{label} — {minutes} min",
    monoTimer: "Timer_01",
    percentProgress: "Progreso de la sesión",
    pillDone: "{percent}% hecho",
    punchcardTitle: "Ficha de foco",
    splitFlapPlatform: "Andén {session}",
    wordsRightNow: "Ahora mismo",
    ledgerCredited: "{minutes} min",

    ledgerDeepFocus: "Foco profundo",
    ledgerSteadyWork: "Trabajo constante",
    ledgerPushThrough: "Aguantar",
    ledgerHomeStretch: "Recta final",
    ledgerFinalSprint: "Esprint final",

    milestoneStarted: "Sesión iniciada",
    milestoneSettledIn: "Ya en marcha",
    milestoneHalfway: "A mitad",
    milestoneFinalStretch: "Tramo final",
    milestoneBreakEarned: "Pausa ganada",

    terminalSession: "sesión {session} · {state}",
    terminalHint: "^C para abandonar · s para parar",

    logInProgress: "min {minute} — en curso…",
    logLogged: "min {minute} — registrado ✓",

    wordsUnderAMinute: "queda menos de un minuto de foco",
    wordsSentence:
      "cerca de {spelled} {count, plural, one {minuto} other {minutos}} de foco restante",
  },

  chrome: {
    openHeader: "Abrir la cabecera",
    closeHeader: "Cerrar la cabecera",
    drawerTitle: "GLU",
    loading: "Cargando…",
    github: "GitHub",
    appearance: "Apariencia",
    switchToLight: "Cambiar al tema claro",
    switchToDark: "Cambiar al tema oscuro",
    toggleScheme: "Cambiar el esquema de color",
    dark: "Oscuro",
    light: "Claro",
    docs: "Manual",
    settings: "Ajustes",
    docsTitle: "Cómo funciona GLU",
    closeDocs: "Cerrar el manual",
    settingsTitle: "Ajustes",
    closeSettings: "Cerrar los ajustes",
    legalAriaLabel: "Legal",
    privacy: "Política de privacidad",
    terms: "Términos del servicio",

    swipeHint: "Desliza el reloj para cambiar de diseño",
    tip: "Consejo",
    dismissTip: "Descartar el consejo",
  },

  meta: {
    homeTitle: "GLU — temporizador pomodoro y de concentración",
    homeDescription:
      "Un temporizador pomodoro y de concentración pensado para tabletas: decenas de diseños de reloj, registro del entorno, un historial que se queda en tu dispositivo y registro de tiempo opcional en Todoist.",
    welcomeTitle: "Un temporizador de concentración para la tableta de tu escritorio",
    welcomeDescription:
      "Elige una duración, pulsa empezar y trabaja hasta que el reloj llegue a cero. GLU es un temporizador pomodoro con decenas de diseños de reloj y sin cuenta: el historial se queda en tu dispositivo.",
    privacyTitle: "Política de privacidad",
    privacyDescription:
      "Qué maneja GLU, adónde va y qué no hace nunca. Sin cuentas, sin analíticas, con el historial guardado en tu propio dispositivo.",
    termsTitle: "Términos del servicio",
    termsDescription:
      "Las condiciones de uso de GLU: un temporizador de concentración personal y gratuito, tal cual, con tus datos en tu dispositivo y tu cuenta de Todoist siempre tuya.",
    docsTitle: "Cómo funciona GLU",
    docsDescription:
      "El manual de GLU: el temporizador y sus atajos, la galería de relojes, los interruptores de entorno, el historial de sesiones, los avisos y la conexión opcional con Todoist.",
  },

  welcome: {
    eyebrow: "Temporizador pomodoro y de concentración",
    headline: "Un temporizador de concentración para la tableta de tu escritorio.",
    sub: "Elige una duración, pulsa empezar y trabaja hasta que el reloj llegue a cero. GLU guarda el registro en el dispositivo en el que te concentraste: sin cuenta, sin registro y sin nada que configurar antes de que sirva.",
    cta: "Empezar a concentrarme",

    featureClockTitle: "El reloj es la página",
    featureClockBody:
      "El temporizador ocupa toda la mitad izquierda de una tableta, lo bastante grande para leerlo desde el otro lado de la habitación. Deslízalo y pasarás por <b>{count} diseños de reloj</b>, cada uno con su propia paleta; y el que elijas recolorea todo lo que lo rodea, en oscuro y en claro.",
    featureEnvironmentTitle: "Se fija en cómo trabajaste",
    featureEnvironmentBody:
      "Seis fichas —<b>música, pódcast, tele, silencio, ruido, auriculares</b>— registran la sala en la que te concentraste. Es un solo toque, y convierte un montón de sesiones idénticas en algo que de verdad puedes releer.",
    featureRecordTitle: "Tu registro sigue siendo tuyo",
    featureRecordBody:
      "Las sesiones se cuentan por día y se guardan en <b>este navegador</b>. No hay cuenta que crear, ni servidor que guarde una copia, ni analíticas mirando cómo trabajas. Basta con borrar los datos del navegador para borrar GLU.",
    featureTodoistTitle: "Todoist, solo si lo quieres",
    featureTodoistBody:
      "Conecta Todoist y podrás fijar la tarea en la que estás trabajando, y dejar que GLU publique el tiempo en ella como comentario cuando termine la sesión. Sáltatelo y todo lo demás de GLU funciona exactamente igual.",

    installNote:
      "<b>Instálalo.</b> Busca el icono de instalación en la barra de direcciones de tu navegador, o «Añadir a pantalla de inicio» en un iPad, y GLU se abrirá a pantalla completa como una app, sin barra del navegador. Eso sí, <b>no</b> es una app sin conexión: instalada o no, necesita conexión para arrancar.",
    aboutNavAriaLabel: "Acerca de GLU",
    footnote: "GLU es gratis y de código abierto.",
  },

  document: {
    lastUpdated: "Última actualización: {date}",
    backToGlu: "← Volver a GLU",
    footerAriaLabel: "Legal",
    welcome: "Bienvenida",
    documentation: "Documentación",
    privacy: "Política de privacidad",
    terms: "Términos del servicio",
    sourceOnGitHub: "Código en GitHub",
    docsNavAriaLabel: "Navegación del manual",
    openAsPage: "Abrir como página",
    translationNotice:
      "Esta es una traducción de cortesía. La versión en inglés es la que se aplica.",
  },

  todoist: {
    logIn: "Iniciar sesión con Todoist",
    logOut: "Cerrar sesión",
    accountFallback: "Todoist",
    accountAriaLabel: "Cuenta de Todoist: {label}",

    sourceFilter: "Filtro",
    sourceLabel: "Etiqueta",
    sourceProject: "Proyecto",
    sourceHint: "Las secciones de un proyecto se muestran una tras otra, en el orden de Todoist.",
    chooseSource: "Elegir el origen de las tareas",
    sourceTitle: "Origen de las tareas",
    closeSource: "Cerrar el origen de las tareas",
    chooseFilter: "Elige un filtro",
    chooseLabel: "Elige una etiqueta",
    chooseProject: "Elige un proyecto",
    filters: "Filtros",
    labels: "Etiquetas",
    projects: "Proyectos",
    loading: "Cargando…",
    nothingHere: "Aquí no hay nada.",

    pickSourceHint: "Elige un filtro, una etiqueta o un proyecto con el icono de arriba.",
    sourceEmpty: "Aquí no hay nada: {name} está despejado.",
    moreHidden: "+{count} más",
    showingFirst: "Mostrando los primeros {count}",
    refreshTasks: "Actualizar las tareas",

    taskTitle: "Tarea",
    closeTask: "Cerrar la tarea",
    refreshTask: "Actualizar la tarea",
    taskGone: "Esta tarea ya no existe en Todoist.",
    close: "Cerrar",
    comments: "Comentarios · los más antiguos primero",
    noComments: "Todavía no hay comentarios.",

    focused: "Enfocada",
    unfocus: "Quitar el foco",
    noLongerInTodoist: "Ya no está en Todoist",
    pendingComments:
      "{count, plural, one {# comentario pendiente} other {# comentarios pendientes}}",

    openTask: "Abrir «{title}»",
    focusTask: "Enfocar «{title}»",
    unfocusTask: "Quitar el foco de «{title}»",
    completeTask: "Completar «{title}»",
    priority: "Prioridad {level}",

    completed: "Completada · {title}",
    commentWillBeAdded: "se añadirá un comentario",
    commentAdded: "comentario añadido",
    undo: "Deshacer",

    couldNotComplete: "No se ha podido completar",
    couldNotUndo: "No se ha podido deshacer",
    retry: "Reintentar",
  },

  errors: {
    unreachable: "No se ha podido conectar con Todoist.",
  },

  notifications: {
    sessionEndTitle: "GLU — se acabó el tiempo",
    sessionEndBody: "Sesión de {duration} terminada.",
  },

  environment: {
    legend: "Entorno",
    ariaLabel: "Entorno",
    music: "Música",
    podcast: "Pódcast",
    tv: "Tele",
    silence: "Silencio",
    noisy: "Ruido",
    headphones: "Auriculares",
  },
} satisfies Messages;

export default messages;
