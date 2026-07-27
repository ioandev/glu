import type { Messages } from "./en";

const messages = {
  language: {
    sectionTitle: "Langue",
    sectionAriaLabel: "Paramètres de langue",
    label: "Langue",
    description:
      "La langue dans laquelle GLU s’affiche. « Automatique » suit la langue demandée par votre navigateur.",
    automatic: "Automatique",
  },

  settings: {
    todoistAriaLabel: "Paramètres Todoist",
    todoistTitle: "Todoist",
    signedInAs: "Connecté en tant que {name}",
    signedInFallbackName: "votre compte Todoist",
    logOut: "Se déconnecter",

    tasksAriaLabel: "Paramètres des tâches",
    tasksTitle: "Tâches",
    sectionItemLimitLabel: "Limiter les éléments d’une section à",
    sectionItemLimitDescription:
      "Les longues sections affichent ce nombre de tâches ; le reste se cache derrière un « +N de plus » sur lequel appuyer.",
    sectionItemLimitAll: "Toutes",

    screenAriaLabel: "Paramètres d’écran",
    screenTitle: "Écran",
    stayAwakeAlwaysLabel: "Garder l’écran allumé sur le site",
    stayAwakeAlwaysDescription:
      "Garde l’écran allumé tant que GLU est ouvert, minuteur ou pas.",
    stayAwakeRunningLabel: "Le garder allumé quand le minuteur tourne",
    stayAwakeRunningDescription:
      "Le garde allumé pendant une session, et cinq minutes après une pause ou une fin.",

    alertsAriaLabel: "Paramètres d’alerte",
    alertsTitle: "Alertes",

    commentsAriaLabel: "Paramètres des commentaires de temps",
    commentsTitle: "Commentaires de temps",
    thresholdLabel: "Durée minimale à enregistrer",
    thresholdDescription:
      "Une session plus courte que cela ne publie aucun commentaire sur la tâche ciblée.",
    minutesShort: "{count} min",
    sayHowYouWorkedLabel: "Dire comment vous avez travaillé",
    sayHowYouWorkedDescription:
      "Ajoute vos réglages d’environnement au commentaire que GLU publie sur la tâche ciblée.",
    previewOn: "Oui",
    previewOff: "Non",
    previewSampled: "{label} · Exemple",
    previewLive: "{label} · Maintenant",
    previewSampleNote:
      "Aucun réglage d’environnement n’est encore actif — l’exemple montre ce que donneraient {first} et {second}.",
  },

  alerts: {
    soundLabel: "Son",
    soundDescription:
      "Se déclenche quand une session atteint zéro. Appuyez sur l’un d’eux pour entendre exactement ce que vous aurez.",
    durationLabel: "Durée de lecture",
    durationDescription:
      "GLU répète le son jusqu’à ce que ce temps soit écoulé. La dernière répétition va toujours à son terme, elle peut donc durer un instant de plus.",
    durationOnce: "Une fois",
    durationSeconds: "{count} s",

    soundChime: "Carillon",
    soundBell: "Cloche",
    soundWood: "Bois",
    soundRise: "Montée",
    soundSettle: "Repos",
    soundPulse: "Pulsation",
    soundDigital: "Numérique",
    soundGlass: "Verre",
    soundDeep: "Grave",

    notifyLabel: "Me prévenir à la fin d’une session",
    notifyDescription:
      "Une notification quand une session atteint zéro pendant que vous regardez ailleurs. Le son se déclenche dans tous les cas.",
    notifyDenied:
      "Votre navigateur bloque les notifications pour ce site. Ouvrez les paramètres du site — l’icône à côté de la barre d’adresse, ou ⋮ → Paramètres des sites sur Android — réglez Notifications sur Autoriser, puis réactivez ceci.",
    notifyDismissed:
      "La demande s’est fermée sans réponse. Réactivez ceci et choisissez Autoriser.",
    notifyUnsupported:
      "Ce navigateur n’offre pas de notifications. Le son se déclenche toujours à la fin d’une session.",
  },

  timer: {
    startHint: "Démarrer — {key}",
    pauseHint: "Mettre en pause — {key}",
    resumeHint: "Reprendre — {key}",
    stopHint: "Arrêter — {key}",
    start: "Démarrer",
    pause: "Pause",
    resume: "Reprendre",
    stop: "Arrêter",

    presetsAriaLabel: "Durées prédéfinies",
    adjustAriaLabel: "Ajuster le temps restant",
    adjustAdd: "Ajouter {count, plural, one {# minute} other {# minutes}}",
    adjustSubtract: "Retirer {count, plural, one {# minute} other {# minutes}}",

    sessionsAriaLabel: "Sessions du jour",
    sessionsToday: "{count} aujourd’hui",
    sessionsOverflow: "+{count}",
    newDay: "Nouvelle journée",
    newDayConfirmAriaLabel: "Confirmer la nouvelle journée",
    newDayHeading: "Commencer une nouvelle journée ?",
    newDayNothing: "Rien à remettre à zéro pour l’instant.",
    newDayReset:
      "{count, plural, one {La # session d’aujourd’hui repasse à zéro.} other {Les # sessions d’aujourd’hui repassent à zéro.}}",
    cancel: "Annuler",
    reset: "Remettre à zéro",
    showSessions: "Afficher les sessions",
  },

  app: {
    timerAriaLabel: "Minuteur",
    todoistAriaLabel: "Zone Todoist",
    environmentAriaLabel: "Réglages d’environnement",
  },

  clock: {
    focus: "Concentration",
    paused: "En pause",
    done: "Terminé",
    ready: "Prêt",

    ascending: "Ascension",
    apertureOpening: "Ouverture",
    banking: "on épargne",
    counting: "décompte",
    growingBubble: "Ça gonfle",
    dontBreakIt: "ne cassez rien",
    orbit: "Orbite",
    celebratingEarly: "On fête déjà",
    deepWork: "Travail de fond",
    momentumDominoes: "Élan",
    untilBreak: "Avant la pause",
    momentumGauge: "Élan",
    warmingUp: "Échauffement",
    leftInk: "restant",
    credited: "crédité",
    inSession: "en session",
    countingDownNeon: "Décompte",
    leftPercent: "restant",
    pouring: "ça coule",
    stillAlive: "Toujours en vie",
    stamping: "on tamponne",
    heatingUp: "Ça chauffe",
    scanning: "Balayage",
    radiating: "Rayonne",
    enRoute: "En route",
    focusSignal: "Signal actif",
    building: "ça monte",
    earning: "ça rapporte",
    growingSprout: "ça pousse",
    keepClimbing: "Concentration · on grimpe",
    focusRising: "La concentration monte",
    focusUntilSundown: "Jusqu’au coucher du soleil",
    leftToScore: "à marquer",
    lightingUp: "Ça s’allume",
    fillingFocus: "Montée · concentration",
    filling: "Remplissage",
    rec: "Rec",
    thenABreak: "Puis une pause",

    arcadeLine: "1UP · {label}",
    broadsideLine: "Pomodoro — {label}",
    cellLine: "Énergie restante · {label}",
    lunarLine: "Croissante · {label}",
    mercuryLine: "Chaleur · {label}",
    odometerLine: "Minutes · secondes · {label}",
    splitFlapLine: "Départ imminent · {label}",
    starsLine: "Une étoile toutes les {seconds} s · {label}",
    tempoLine: "Tempo · {label}",
    percentThenLabel: "{percent}% {label}",
    ghostLine: ":{seconds} · {label}",
    altitudeLine: "{label} · {percent}%",
    nixieTube: " · tube {session}",

    arcadeTime: "Temps {time}",
    beamDone: "{percent}% de {minutes} min faits",
    blueprintFigure: "Fig. — temps restant",
    broadsideSessions: "Sessions {session}",
    depthMetres: "-{metres} m",
    inkFocus: "FOCUS",
    lapsCounter: "Tour {lap} sur {total}",
    logRemaining: "{time} restant",
    marqueeCountingDown: "Décompte",
    milestoneRow: "{label} — {minutes} min",
    monoTimer: "Timer_01",
    percentProgress: "Progression de la session",
    pillDone: "{percent}% fait",
    punchcardTitle: "Carte de concentration",
    splitFlapPlatform: "Quai {session}",
    wordsRightNow: "Maintenant",
    ledgerCredited: "{minutes} min",

    ledgerDeepFocus: "Concentration profonde",
    ledgerSteadyWork: "Travail régulier",
    ledgerPushThrough: "On s’accroche",
    ledgerHomeStretch: "Dernière ligne droite",
    ledgerFinalSprint: "Sprint final",

    milestoneStarted: "Session lancée",
    milestoneSettledIn: "Bien installé",
    milestoneHalfway: "À mi-chemin",
    milestoneFinalStretch: "Dernier effort",
    milestoneBreakEarned: "Pause méritée",

    terminalSession: "session {session} · {state}",
    terminalHint: "^C pour abandonner · s pour arrêter",

    logInProgress: "min {minute} — en cours…",
    logLogged: "min {minute} — enregistrée ✓",

    wordsUnderAMinute: "il reste moins d’une minute de concentration",
    wordsSentence:
      "il reste environ {spelled} {count, plural, one {minute} other {minutes}} de concentration",
  },

  chrome: {
    openHeader: "Ouvrir l’en-tête",
    closeHeader: "Fermer l’en-tête",
    drawerTitle: "GLU",
    loading: "Chargement…",
    github: "GitHub",
    appearance: "Apparence",
    switchToLight: "Passer au thème clair",
    switchToDark: "Passer au thème sombre",
    toggleScheme: "Changer de thème",
    dark: "Sombre",
    light: "Clair",
    docs: "Manuel",
    settings: "Paramètres",
    docsTitle: "Comment fonctionne GLU",
    closeDocs: "Fermer le manuel",
    settingsTitle: "Paramètres",
    closeSettings: "Fermer les paramètres",
    legalAriaLabel: "Mentions légales",
    privacy: "Politique de confidentialité",
    terms: "Conditions d’utilisation",

    swipeHint: "Faites glisser l’horloge pour changer de design",
    tip: "Astuce",
    dismissTip: "Masquer l’astuce",
  },

  meta: {
    homeTitle: "GLU — minuteur pomodoro et concentration",
    homeDescription:
      "Un minuteur pomodoro et concentration pensé pour la tablette : des dizaines de designs d’horloge, le suivi de l’environnement, un historique qui reste sur votre appareil et l’enregistrement du temps dans Todoist, en option.",
    welcomeTitle: "Un minuteur de concentration pour la tablette posée sur votre bureau",
    welcomeDescription:
      "Choisissez une durée, appuyez sur démarrer et travaillez jusqu’à ce que l’horloge arrive à zéro. GLU est un minuteur pomodoro avec des dizaines de designs d’horloge et sans compte — l’historique reste sur votre appareil.",
    privacyTitle: "Politique de confidentialité",
    privacyDescription:
      "Ce que GLU traite, où cela va, et ce qu’il ne fait jamais. Pas de compte, pas d’analyse, un historique conservé sur votre propre appareil.",
    termsTitle: "Conditions d’utilisation",
    termsDescription:
      "Les conditions d’utilisation de GLU : un minuteur de concentration personnel et gratuit, fourni tel quel, vos données sur votre appareil et votre compte Todoist qui reste le vôtre.",
    docsTitle: "Comment fonctionne GLU",
    docsDescription:
      "Le manuel de GLU : le minuteur et ses raccourcis, la galerie d’horloges, les réglages d’environnement, l’historique des sessions, les alertes et la connexion Todoist en option.",
  },

  welcome: {
    eyebrow: "Minuteur pomodoro et concentration",
    headline: "Un minuteur de concentration pour la tablette posée sur votre bureau.",
    sub: "Choisissez une durée, appuyez sur démarrer, et travaillez jusqu’à ce que l’horloge arrive à zéro. GLU garde l’historique sur l’appareil où vous vous êtes concentré — pas de compte, pas d’inscription, rien à configurer avant que ce soit utile.",
    cta: "Commencer à me concentrer",

    featureClockTitle: "L’horloge est la page",
    featureClockBody:
      "Le minuteur occupe toute la moitié gauche d’une tablette, assez grand pour se lire d’un bout à l’autre de la pièce. Faites-le glisser et vous parcourez <b>{count} designs d’horloge</b>, chacun avec sa palette — et celui sur lequel vous vous arrêtez recolore tout autour de lui, en sombre comme en clair.",
    featureEnvironmentTitle: "Il retient comment vous avez travaillé",
    featureEnvironmentBody:
      "Six pastilles — <b>musique, podcast, télé, silence, bruit, casque</b> — enregistrent la pièce dans laquelle vous vous êtes concentré. Un seul appui, et une pile de sessions identiques devient quelque chose que vous pouvez vraiment relire.",
    featureRecordTitle: "Votre historique reste le vôtre",
    featureRecordBody:
      "Les sessions sont comptées par jour et conservées dans <b>ce navigateur</b>. Aucun compte à créer, aucun serveur qui en garde une copie, aucune analyse qui vous regarde travailler. Effacer les données de votre navigateur suffit à effacer GLU.",
    featureTodoistTitle: "Todoist, seulement si vous le voulez",
    featureTodoistBody:
      "Connectez Todoist et vous pourrez épingler la tâche sur laquelle vous travaillez, puis laisser GLU y publier le temps en commentaire à la fin de la session. Passez votre chemin et tout le reste de GLU fonctionne exactement pareil.",

    installNote:
      "<b>Installez-le.</b> Cherchez l’icône d’installation dans la barre d’adresse de votre navigateur, ou « Sur l’écran d’accueil » sur un iPad, et GLU s’ouvre en plein écran comme une application — sans barre de navigateur. Ce n’est <b>pas</b> une application hors ligne pour autant : installée ou non, elle a besoin d’une connexion pour démarrer.",
    aboutNavAriaLabel: "À propos de GLU",
    footnote: "GLU est gratuit et open source.",
  },

  document: {
    lastUpdated: "Dernière mise à jour : {date}",
    backToGlu: "← Retour à GLU",
    footerAriaLabel: "Mentions légales",
    welcome: "Bienvenue",
    documentation: "Documentation",
    privacy: "Politique de confidentialité",
    terms: "Conditions d’utilisation",
    sourceOnGitHub: "Code source sur GitHub",
    docsNavAriaLabel: "Navigation du manuel",
    openAsPage: "Ouvrir en pleine page",
    translationNotice:
      "Ceci est une traduction de courtoisie. C’est la version anglaise qui fait foi.",
  },

  todoist: {
    logIn: "Se connecter avec Todoist",
    logOut: "Se déconnecter",
    accountFallback: "Todoist",
    accountAriaLabel: "Compte Todoist : {label}",

    sourceFilter: "Filtre",
    sourceLabel: "Étiquette",
    sourceProject: "Projet",
    sourceHint:
      "Les sections d’un projet s’affichent les unes après les autres, dans l’ordre de Todoist.",
    chooseSource: "Choisir la source des tâches",
    sourceTitle: "Source des tâches",
    closeSource: "Fermer la source des tâches",
    chooseFilter: "Choisissez un filtre",
    chooseLabel: "Choisissez une étiquette",
    chooseProject: "Choisissez un projet",
    filters: "Filtres",
    labels: "Étiquettes",
    projects: "Projets",
    loading: "Chargement…",
    nothingHere: "Il n’y a rien ici.",

    pickSourceHint: "Choisissez un filtre, une étiquette ou un projet avec l’icône ci-dessus.",
    sourceEmpty: "Il n’y a rien ici — {name} est vide.",
    moreHidden: "+{count} de plus",
    showingFirst: "Affichage des {count} premières",
    refreshTasks: "Actualiser les tâches",

    taskTitle: "Tâche",
    closeTask: "Fermer la tâche",
    refreshTask: "Actualiser la tâche",
    taskGone: "Cette tâche n’existe plus dans Todoist.",
    close: "Fermer",
    comments: "Commentaires · les plus anciens d’abord",
    noComments: "Pas encore de commentaires.",

    focused: "Ciblée",
    unfocus: "Ne plus cibler",
    noLongerInTodoist: "N’est plus dans Todoist",
    pendingComments:
      "{count, plural, one {# commentaire en attente} other {# commentaires en attente}}",

    openTask: "Ouvrir « {title} »",
    focusTask: "Cibler « {title} »",
    unfocusTask: "Ne plus cibler « {title} »",
    completeTask: "Terminer « {title} »",
    priority: "Priorité {level}",

    completed: "Terminée · {title}",
    commentWillBeAdded: "un commentaire sera ajouté",
    commentAdded: "commentaire ajouté",
    undo: "Annuler",

    couldNotComplete: "Impossible de terminer",
    couldNotUndo: "Impossible d’annuler",
    retry: "Réessayer",
  },

  errors: {
    unreachable: "Impossible de joindre Todoist.",
  },

  notifications: {
    sessionEndTitle: "GLU — c’est l’heure",
    sessionEndBody: "Session de {duration} terminée.",
  },

  environment: {
    legend: "Environnement",
    ariaLabel: "Environnement",
    music: "Musique",
    podcast: "Podcast",
    tv: "Télé",
    silence: "Silence",
    noisy: "Bruit",
    headphones: "Casque",
  },
} satisfies Messages;

export default messages;
