import type { Messages } from "./en";

const messages = {
  language: {
    sectionTitle: "Sprache",
    sectionAriaLabel: "Spracheinstellungen",
    label: "Sprache",
    description:
      "Die Sprache, in der GLU angezeigt wird. „Automatisch“ folgt der Sprache, die dein Browser anfragt.",
    automatic: "Automatisch",
  },

  settings: {
    todoistAriaLabel: "Todoist-Einstellungen",
    todoistTitle: "Todoist",
    signedInAs: "Angemeldet als {name}",
    signedInFallbackName: "dein Todoist-Konto",
    logOut: "Abmelden",

    tasksAriaLabel: "Aufgaben-Einstellungen",
    tasksTitle: "Aufgaben",
    sectionItemLimitLabel: "Einträge pro Abschnitt begrenzen auf",
    sectionItemLimitDescription:
      "Lange Abschnitte zeigen so viele Aufgaben; der Rest sitzt hinter einem „+N mehr“ zum Antippen.",
    sectionItemLimitAll: "Alle",

    screenAriaLabel: "Bildschirmeinstellungen",
    screenTitle: "Bildschirm",
    stayAwakeAlwaysLabel: "Bildschirm auf der Seite anlassen",
    stayAwakeAlwaysDescription:
      "Hält den Bildschirm an, solange GLU geöffnet ist — mit oder ohne laufenden Timer.",
    stayAwakeRunningLabel: "Anlassen, während der Timer läuft",
    stayAwakeRunningDescription:
      "Hält ihn während eines Durchgangs an, und fünf Minuten nach einer Pause oder dem Ende.",

    alertsAriaLabel: "Signaleinstellungen",
    alertsTitle: "Signale",

    commentsAriaLabel: "Einstellungen für Zeitkommentare",
    commentsTitle: "Zeitkommentare",
    thresholdLabel: "Mindestzeit zum Erfassen",
    thresholdDescription:
      "Ein kürzerer Durchgang schreibt keinen Kommentar an die fokussierte Aufgabe.",
    minutesShort: "{count} Min.",
    sayHowYouWorkedLabel: "Sagen, wie du gearbeitet hast",
    sayHowYouWorkedDescription:
      "Ergänzt den Kommentar, den GLU an die fokussierte Aufgabe schreibt, um deine Umgebungsschalter.",
    previewOn: "Ein",
    previewOff: "Aus",
    previewSampled: "{label} · Beispiel",
    previewLive: "{label} · Jetzt",
    previewSampleNote:
      "Noch ist kein Umgebungsschalter aktiv — das Beispiel zeigt, wie es mit {first} und {second} aussähe.",
  },

  alerts: {
    soundLabel: "Klang",
    soundDescription:
      "Erklingt, wenn ein Durchgang null erreicht. Tippe einen an, um genau zu hören, was dich erwartet.",
    durationLabel: "Wie lange er spielt",
    durationDescription:
      "GLU wiederholt den Klang, bis diese Zeit vorbei ist. Die letzte Wiederholung läuft immer zu Ende, es kann also einen Moment länger dauern.",
    durationOnce: "Einmal",
    durationSeconds: "{count} s",

    soundChime: "Glockenspiel",
    soundBell: "Glocke",
    soundWood: "Holz",
    soundRise: "Anstieg",
    soundSettle: "Ausklang",
    soundPulse: "Puls",
    soundDigital: "Digital",
    soundGlass: "Glas",
    soundDeep: "Tief",

    notifyLabel: "Benachrichtigen, wenn ein Durchgang endet",
    notifyDescription:
      "Eine Mitteilung, wenn ein Durchgang null erreicht, während du woanders hinschaust. Der Klang kommt so oder so.",
    notifyDenied:
      "Dein Browser blockiert Mitteilungen für diese Seite. Öffne die Website-Einstellungen — das Symbol neben der Adressleiste, oder ⋮ → Website-Einstellungen unter Android — setze Benachrichtigungen auf Zulassen und schalte das hier wieder ein.",
    notifyDismissed:
      "Die Abfrage wurde ohne Antwort geschlossen. Schalte das hier wieder ein und wähle Zulassen.",
    notifyUnsupported:
      "Dieser Browser bietet keine Mitteilungen. Der Klang kommt am Ende trotzdem.",
  },

  timer: {
    startHint: "Starten — {key}",
    pauseHint: "Pausieren — {key}",
    resumeHint: "Fortsetzen — {key}",
    stopHint: "Stoppen — {key}",
    start: "Starten",
    pause: "Pause",
    resume: "Weiter",
    stop: "Stopp",

    presetsAriaLabel: "Voreingestellte Dauern",
    adjustAriaLabel: "Restzeit anpassen",
    adjustAdd: "{count, plural, one {# Minute} other {# Minuten}} hinzufügen",
    adjustSubtract: "{count, plural, one {# Minute} other {# Minuten}} abziehen",

    sessionsAriaLabel: "Durchgänge heute",
    sessionsToday: "{count} heute",
    sessionsOverflow: "+{count}",
    newDay: "Neuer Tag",
    newDayConfirmAriaLabel: "Neuen Tag bestätigen",
    newDayHeading: "Einen neuen Tag beginnen?",
    newDayNothing: "Noch nichts zurückzusetzen.",
    newDayReset:
      "{count, plural, one {Der # Durchgang von heute wird auf null gesetzt.} other {Die # Durchgänge von heute werden auf null gesetzt.}}",
    cancel: "Abbrechen",
    reset: "Zurücksetzen",
    showSessions: "Durchgänge zeigen",
  },

  app: {
    timerAriaLabel: "Timer",
    todoistAriaLabel: "Todoist-Bereich",
    environmentAriaLabel: "Umgebungsschalter",
  },

  clock: {
    focus: "Fokus",
    paused: "Pausiert",
    done: "Fertig",
    ready: "Bereit",

    ascending: "Aufstieg",
    apertureOpening: "Blende öffnet",
    banking: "wird gespart",
    counting: "zählt",
    growingBubble: "Wächst",
    dontBreakIt: "nicht platzen lassen",
    orbit: "Orbit",
    celebratingEarly: "Vorfreude",
    deepWork: "Tiefe Arbeit",
    momentumDominoes: "Schwung",
    untilBreak: "Bis zur Pause",
    momentumGauge: "Schwung",
    warmingUp: "Wärmt auf",
    leftInk: "übrig",
    credited: "gutgeschrieben",
    inSession: "läuft",
    countingDownNeon: "Countdown",
    leftPercent: "übrig",
    pouring: "läuft ein",
    stillAlive: "Noch am Leben",
    stamping: "stempelt",
    heatingUp: "Wird heiß",
    scanning: "Scannt",
    radiating: "Strahlt",
    enRoute: "Unterwegs",
    focusSignal: "Fokussignal",
    building: "wächst",
    earning: "verdient",
    growingSprout: "sprießt",
    keepClimbing: "Fokus · weiter rauf",
    focusRising: "Fokus steigt",
    focusUntilSundown: "Fokus bis Sonnenuntergang",
    leftToScore: "noch zu holen",
    lightingUp: "Leuchtet auf",
    fillingFocus: "Steigt · Fokus",
    filling: "Füllt sich",
    rec: "Rec",
    thenABreak: "Dann Pause",

    arcadeLine: "1UP · {label}",
    broadsideLine: "Pomodoro — {label}",
    cellLine: "Energie übrig · {label}",
    lunarLine: "Zunehmend · {label}",
    mercuryLine: "Hitze · {label}",
    odometerLine: "Minuten · Sekunden · {label}",
    splitFlapLine: "Abfahrt · {label}",
    starsLine: "Ein Stern pro {seconds} s · {label}",
    tempoLine: "Tempo · {label}",
    percentThenLabel: "{percent}% {label}",
    ghostLine: ":{seconds} · {label}",
    altitudeLine: "{label} · {percent}%",
    nixieTube: " · Röhre {session}",

    arcadeTime: "Zeit {time}",
    beamDone: "{percent}% von {minutes} Min geschafft",
    blueprintFigure: "Abb. — Restzeit",
    broadsideSessions: "Durchgänge {session}",
    depthMetres: "-{metres} m",
    inkFocus: "FOCUS",
    lapsCounter: "Runde {lap} von {total}",
    logRemaining: "{time} übrig",
    marqueeCountingDown: "Countdown",
    milestoneRow: "{label} — {minutes} Min",
    monoTimer: "Timer_01",
    percentProgress: "Fortschritt",
    pillDone: "{percent}% geschafft",
    punchcardTitle: "Fokuskarte",
    splitFlapPlatform: "Gleis {session}",
    wordsRightNow: "Gerade jetzt",
    ledgerCredited: "{minutes} Min",

    ledgerDeepFocus: "Tiefer Fokus",
    ledgerSteadyWork: "Stetige Arbeit",
    ledgerPushThrough: "Durchhalten",
    ledgerHomeStretch: "Zielgerade",
    ledgerFinalSprint: "Endspurt",

    milestoneStarted: "Durchgang gestartet",
    milestoneSettledIn: "Angekommen",
    milestoneHalfway: "Halbzeit",
    milestoneFinalStretch: "Letztes Stück",
    milestoneBreakEarned: "Pause verdient",

    terminalSession: "Durchgang {session} · {state}",
    terminalHint: "^C zum Abbrechen · s zum Stoppen",

    logInProgress: "Min {minute} — läuft…",
    logLogged: "Min {minute} — gebucht ✓",

    wordsUnderAMinute: "weniger als eine Minute Fokus übrig",
    wordsSentence:
      "noch etwa {spelled} {count, plural, one {Minute} other {Minuten}} Fokus",
  },

  chrome: {
    openHeader: "Kopfzeile öffnen",
    closeHeader: "Kopfzeile schließen",
    drawerTitle: "GLU",
    loading: "Wird geladen…",
    github: "GitHub",
    appearance: "Erscheinungsbild",
    switchToLight: "Zum hellen Thema wechseln",
    switchToDark: "Zum dunklen Thema wechseln",
    toggleScheme: "Farbschema umschalten",
    dark: "Dunkel",
    light: "Hell",
    docs: "Handbuch",
    settings: "Einstellungen",
    docsTitle: "So funktioniert GLU",
    closeDocs: "Handbuch schließen",
    settingsTitle: "Einstellungen",
    closeSettings: "Einstellungen schließen",
    legalAriaLabel: "Rechtliches",
    privacy: "Datenschutzerklärung",
    terms: "Nutzungsbedingungen",

    swipeHint: "Wische über die Uhr, um das Design zu wechseln",
    tip: "Tipp",
    dismissTip: "Tipp ausblenden",
  },

  meta: {
    homeTitle: "GLU — Pomodoro- und Fokus-Timer",
    homeDescription:
      "Ein Pomodoro- und Fokus-Timer fürs Tablet: Dutzende Uhren-Designs, Umgebungserfassung, eine Aufzeichnung, die auf deinem Gerät bleibt, und optionale Zeiterfassung in Todoist.",
    welcomeTitle: "Ein Fokus-Timer für das Tablet auf deinem Schreibtisch",
    welcomeDescription:
      "Länge wählen, Start drücken und arbeiten, bis die Uhr abgelaufen ist. GLU ist ein Pomodoro-Timer mit Dutzenden Uhren-Designs und ohne Konto — die Aufzeichnung bleibt auf deinem Gerät.",
    privacyTitle: "Datenschutzerklärung",
    privacyDescription:
      "Was GLU verarbeitet, wohin es geht und was es nie tut. Keine Konten, keine Analyse, der Verlauf bleibt auf deinem eigenen Gerät.",
    termsTitle: "Nutzungsbedingungen",
    termsDescription:
      "Die Bedingungen für GLU: ein kostenloser persönlicher Fokus-Timer, wie er ist, mit deinen Daten auf deinem Gerät und deinem Todoist-Konto als deinem eigenen.",
    docsTitle: "So funktioniert GLU",
    docsDescription:
      "Das GLU-Handbuch: der Timer und seine Tastenkürzel, die Uhrengalerie, die Umgebungsschalter, die Sitzungsaufzeichnung, die Signale und die optionale Todoist-Verbindung.",
  },

  welcome: {
    eyebrow: "Pomodoro- und Fokus-Timer",
    headline: "Ein Fokus-Timer für das Tablet auf deinem Schreibtisch.",
    sub: "Länge wählen, Start drücken und arbeiten, bis die Uhr abgelaufen ist. GLU behält den Verlauf auf dem Gerät, an dem du gearbeitet hast — kein Konto, keine Anmeldung, nichts einzurichten, bevor es nützlich wird.",
    cta: "Loslegen",

    featureClockTitle: "Die Uhr ist die Seite",
    featureClockBody:
      "Der Timer nimmt die ganze linke Hälfte eines Tablets ein, groß genug, um ihn quer durch den Raum zu lesen. Wische darüber und du blätterst durch <b>{count} Uhren-Designs</b>, jedes mit eigener Palette — und das, bei dem du landest, färbt alles drumherum um, in Dunkel wie in Hell.",
    featureEnvironmentTitle: "Es merkt sich, wie du gearbeitet hast",
    featureEnvironmentBody:
      "Sechs Chips — <b>Musik, Podcast, Fernsehen, Stille, Lärm, Kopfhörer</b> — halten fest, in welchem Raum du gearbeitet hast. Ein Tippen genügt, und aus einem Stapel gleich aussehender Durchgänge wird etwas, das man wirklich nachlesen kann.",
    featureRecordTitle: "Dein Verlauf bleibt deiner",
    featureRecordBody:
      "Durchgänge werden pro Tag gezählt und in <b>diesem Browser</b> gespeichert. Es gibt kein Konto anzulegen, keinen Server, der eine Kopie hält, und keine Analyse, die dir beim Arbeiten zusieht. Die Browserdaten zu löschen reicht, um GLU zu löschen.",
    featureTodoistTitle: "Todoist, nur wenn du magst",
    featureTodoistBody:
      "Verbinde Todoist, dann kannst du die Aufgabe anheften, an der du arbeitest, und GLU die Zeit am Ende als Kommentar dazuschreiben lassen. Lass es weg, und jeder andere Teil von GLU funktioniert genau gleich.",

    installNote:
      "<b>Installiere es.</b> Achte auf das Installationssymbol in der Adressleiste deines Browsers, oder „Zum Home-Bildschirm“ auf einem iPad, und GLU öffnet sich im Vollbild wie eine App — ohne Browserleiste. Eine Offline-App ist es deshalb <b>nicht</b>: installiert oder nicht, es braucht zum Starten eine Verbindung.",
    aboutNavAriaLabel: "Über GLU",
    footnote: "GLU ist kostenlos und quelloffen.",
  },

  document: {
    lastUpdated: "Zuletzt aktualisiert: {date}",
    backToGlu: "← Zurück zu GLU",
    footerAriaLabel: "Rechtliches",
    welcome: "Willkommen",
    documentation: "Handbuch",
    privacy: "Datenschutzerklärung",
    terms: "Nutzungsbedingungen",
    sourceOnGitHub: "Quellcode auf GitHub",
    docsNavAriaLabel: "Handbuch-Navigation",
    openAsPage: "Als Seite öffnen",
    translationNotice:
      "Dies ist eine Übersetzung als Serviceleistung. Maßgeblich ist die englische Fassung.",
  },

  todoist: {
    logIn: "Mit Todoist anmelden",
    logOut: "Abmelden",
    accountFallback: "Todoist",
    accountAriaLabel: "Todoist-Konto: {label}",

    sourceFilter: "Filter",
    sourceLabel: "Label",
    sourceProject: "Projekt",
    sourceHint:
      "Die Abschnitte eines Projekts erscheinen nacheinander, in der Reihenfolge von Todoist.",
    chooseSource: "Aufgabenquelle wählen",
    sourceTitle: "Aufgabenquelle",
    closeSource: "Aufgabenquelle schließen",
    chooseFilter: "Wähle einen Filter",
    chooseLabel: "Wähle ein Label",
    chooseProject: "Wähle ein Projekt",
    filters: "Filter",
    labels: "Labels",
    projects: "Projekte",
    loading: "Wird geladen…",
    nothingHere: "Hier ist nichts.",

    pickSourceHint: "Wähle oben mit dem Werkzeugsymbol einen Filter, ein Label oder ein Projekt.",
    sourceEmpty: "Hier ist nichts — {name} ist leer.",
    moreHidden: "+{count} mehr",
    showingFirst: "Die ersten {count} werden gezeigt",
    refreshTasks: "Aufgaben aktualisieren",

    taskTitle: "Aufgabe",
    closeTask: "Aufgabe schließen",
    refreshTask: "Aufgabe aktualisieren",
    taskGone: "Diese Aufgabe gibt es in Todoist nicht mehr.",
    close: "Schließen",
    comments: "Kommentare · älteste zuerst",
    noComments: "Noch keine Kommentare.",

    focused: "Fokussiert",
    unfocus: "Fokus aufheben",
    noLongerInTodoist: "Nicht mehr in Todoist",
    pendingComments:
      "{count, plural, one {# Kommentar ausstehend} other {# Kommentare ausstehend}}",

    openTask: "„{title}“ öffnen",
    focusTask: "„{title}“ fokussieren",
    unfocusTask: "Fokus von „{title}“ aufheben",
    completeTask: "„{title}“ abschließen",
    priority: "Priorität {level}",

    completed: "Abgeschlossen · {title}",
    commentWillBeAdded: "Kommentar wird hinzugefügt",
    commentAdded: "Kommentar hinzugefügt",
    undo: "Rückgängig",

    couldNotComplete: "Abschließen fehlgeschlagen",
    couldNotUndo: "Rückgängig fehlgeschlagen",
    retry: "Erneut versuchen",
  },

  errors: {
    unreachable: "Todoist ist nicht erreichbar.",
  },

  notifications: {
    sessionEndTitle: "GLU — die Zeit ist um",
    sessionEndBody: "Durchgang über {duration} beendet.",
  },

  environment: {
    legend: "Umgebung",
    ariaLabel: "Umgebung",
    music: "Musik",
    podcast: "Podcast",
    tv: "Fernsehen",
    silence: "Stille",
    noisy: "Lärm",
    headphones: "Kopfhörer",
  },
} satisfies Messages;

export default messages;
