/**
 * The canonical message catalog (ADR 44).
 *
 * **English is authored here and the other five are typed against it.** Each
 * translation module ends in `satisfies Messages`, so a key added here that a
 * translator has not reached yet is a type error rather than a string that
 * silently renders in English — the same "a missing thing fails the build"
 * discipline ADR 42 applies to clock designs.
 *
 * What lives here: the interactive UI — settings, timer, chrome, Todoist,
 * alerts, clock frames, notifications, error text, and the short metadata
 * copy. What deliberately does *not*: the long-form prose of the manual, the
 * Privacy Policy and the Terms. Those are ~280 sentences of JSX with inline
 * emphasis and links, and they live as per-locale content modules under
 * `components/docs/content/` and `components/legal/content/` so they stay
 * server-rendered and readable. See ADR 44's "Why prose is not in the catalog".
 *
 * Messages are ICU. Anything that pluralises, lists or counts must say so here
 * rather than being assembled with `+` in a component — English's "1 minute /
 * 2 minutes" is a two-case rule and almost nothing else in the roster agrees
 * with it.
 */
// No `as const`: the type below is derived from this object, and literal value
// types would make every translation a mismatch ("Idioma" is not "Language").
// The *keys* are what the type is for.
const messages = {
  language: {
    sectionTitle: "Language",
    sectionAriaLabel: "Language settings",
    label: "Language",
    description:
      "The language GLU is shown in. “Automatic” follows the language your browser asks for.",
    automatic: "Automatic",
  },

  settings: {
    todoistAriaLabel: "Todoist settings",
    todoistTitle: "Todoist",
    // The account name is the user's own and is never translated; only the
    // sentence around it is. The fallback stands in when Todoist gave us no
    // name at all.
    signedInAs: "Signed in as {name}",
    signedInFallbackName: "your Todoist account",
    logOut: "Log out",

    tasksAriaLabel: "Task settings",
    tasksTitle: "Tasks",
    sectionItemLimitLabel: "Limit the items in a section to",
    sectionItemLimitDescription:
      "Long sections show this many tasks; the rest sit behind a “+N more” you can tap.",
    sectionItemLimitAll: "All",

    screenAriaLabel: "Screen settings",
    screenTitle: "Screen",
    stayAwakeAlwaysLabel: "Stay awake on the website",
    stayAwakeAlwaysDescription: "Keeps the screen on for as long as GLU is open, timer or no timer.",
    stayAwakeRunningLabel: "Stay awake when the timer is running",
    stayAwakeRunningDescription:
      "Keeps it on during a run, and for five minutes after it pauses or ends.",

    alertsAriaLabel: "Alert settings",
    alertsTitle: "Alerts",

    commentsAriaLabel: "Time comment settings",
    commentsTitle: "Time comments",
    thresholdLabel: "Minimum time to log",
    thresholdDescription: "A run shorter than this posts no comment on the focused task.",
    // The ladder's rungs. `min` is the abbreviation, not the word.
    minutesShort: "{count} min",
    sayHowYouWorkedLabel: "Say how you worked",
    sayHowYouWorkedDescription:
      "Adds your environment toggles to the comment GLU posts on the focused task.",
    previewOn: "On",
    previewOff: "Off",
    // The two live previews. `label` is "On"/"Off" above; the suffix says
    // whether the preview is built from a sample or from the live toggles.
    previewSampled: "{label} · Example",
    previewLive: "{label} · Now",
    previewSampleNote:
      "No environment toggles are on yet — the example shows what {first} and {second} would look like.",
  },

  alerts: {
    soundLabel: "Sound",
    soundDescription: "Plays when a run reaches zero. Tap one to hear exactly what you will get.",
    durationLabel: "How long it plays",
    durationDescription:
      "GLU repeats the sound until this much time has passed. The last repeat always finishes, so it can run a moment longer.",
    // `0` on the ladder means the sound's own length, played through once.
    durationOnce: "Once",
    durationSeconds: "{count} s",

    // The nine sounds (ADR 40). Their ids are stable keys and are never
    // translated — these are only what the buttons read.
    soundChime: "Chime",
    soundBell: "Bell",
    soundWood: "Wood",
    soundRise: "Rise",
    soundSettle: "Settle",
    soundPulse: "Pulse",
    soundDigital: "Digital",
    soundGlass: "Glass",
    soundDeep: "Deep",

    notifyLabel: "Notify me when a session ends",
    notifyDescription:
      "A notification when a run reaches zero while you are looking at something else. The sound plays either way.",
    // ADR 41's amendment exists because "blocked" without a *route out* is a
    // dead end. Keep the where — the address-bar icon, the Android path — in
    // every translation.
    notifyDenied:
      "Your browser is blocking notifications for this site. Open its site settings — the icon beside the address bar, or ⋮ → Site settings on Android — set Notifications to Allow, then switch this back on.",
    notifyDismissed:
      "The prompt closed without an answer. Switch this on again and choose Allow.",
    notifyUnsupported:
      "This browser does not offer notifications. The sound still plays when a run ends.",
  },

  timer: {
    // ADR 06 puts these on Latin keys, and they stay Latin in every language —
    // only the word in front of the dash is translated.
    startHint: "Start — {key}",
    pauseHint: "Pause — {key}",
    resumeHint: "Resume — {key}",
    stopHint: "Stop — {key}",
    start: "Start",
    pause: "Pause",
    resume: "Resume",
    stop: "Stop",

    presetsAriaLabel: "Preset durations",
    adjustAriaLabel: "Adjust remaining time",
    // One message rather than "Add"/"Subtract" glued to a number and a
    // pluralised unit: the verb, the count and the noun agree differently in
    // every language on the roster.
    adjustAdd: "Add {count, plural, one {# minute} other {# minutes}}",
    adjustSubtract: "Subtract {count, plural, one {# minute} other {# minutes}}",

    sessionsAriaLabel: "Sessions today",
    sessionsToday: "{count} today",
    sessionsOverflow: "+{count}",
    newDay: "New day",
    newDayConfirmAriaLabel: "Confirm new day",
    newDayHeading: "Start a new day?",
    newDayNothing: "Nothing to reset yet.",
    newDayReset:
      "{count, plural, one {Today's # session is reset to zero.} other {Today's # sessions reset to zero.}}",
    cancel: "Cancel",
    reset: "Reset",
    showSessions: "Show sessions",
  },

  app: {
    timerAriaLabel: "Timer",
    todoistAriaLabel: "Todoist area",
    environmentAriaLabel: "Environment toggles",
  },

  /**
   * The clock faces (ADR 07/42/45, translated by ADR 44).
   *
   * Every design draws a short status line, and most of them word it their own
   * way — "Orbit", "Until break", "Focus · keep climbing". Those are **copy**,
   * not identifiers, so they live here; the design *names* in `registry.ts` stay
   * English because nothing renders them.
   *
   * Designs pass a **key** to `useStateLabel`, never a sentence, which is what
   * keeps 39 call sites from each having to reach for `useTranslations`.
   */
  clock: {
    // The four states every design shares.
    focus: "Focus",
    paused: "Paused",
    done: "Done",
    ready: "Ready",

    // Per-design running labels. Named for the design so a translator can see
    // what they are describing; two designs sharing a word still get a key each,
    // because a language that needs them different must be able to say so.
    ascending: "Ascending",
    apertureOpening: "Aperture opening",
    banking: "banking",
    counting: "counting",
    growingBubble: "Growing",
    dontBreakIt: "don’t break it",
    orbit: "Orbit",
    celebratingEarly: "Celebrating early",
    deepWork: "Deep work",
    momentumDominoes: "Momentum",
    untilBreak: "Until break",
    momentumGauge: "Momentum",
    warmingUp: "Warming up",
    leftInk: "left",
    credited: "credited",
    inSession: "in session",
    countingDownNeon: "Counting down",
    leftPercent: "left",
    pouring: "pouring",
    stillAlive: "Still alive",
    stamping: "stamping",
    heatingUp: "Heating up",
    scanning: "Scanning",
    radiating: "Radiating",
    enRoute: "En route",
    focusSignal: "Focus signal",
    building: "building",
    earning: "earning",
    growingSprout: "growing",
    keepClimbing: "Focus · keep climbing",
    focusRising: "Focus rising",
    focusUntilSundown: "Focus until sundown",
    leftToScore: "left to score",
    lightingUp: "Lighting up",
    fillingFocus: "Filling · focus",
    filling: "Filling",
    rec: "Rec",
    thenABreak: "Then a break",

    // Prose that wraps the label. `{label}` is the state word above.
    arcadeLine: "1UP · {label}",
    broadsideLine: "Pomodoro — {label}",
    cellLine: "Energy left · {label}",
    lunarLine: "Waxing · {label}",
    mercuryLine: "Focus heat · {label}",
    odometerLine: "Minutes · seconds · {label}",
    splitFlapLine: "Now departing · {label}",
    starsLine: "One star per {seconds}s · {label}",
    tempoLine: "Tempo · {label}",
    percentThenLabel: "{percent}% {label}",
    ghostLine: ":{seconds} · {label}",
    altitudeLine: "{label} · {percent}%",
    nixieTube: " · tube {session}",

    // Standalone lines.
    arcadeTime: "Time {time}",
    beamDone: "{percent}% of {minutes}m done",
    blueprintFigure: "Fig. — time remaining",
    broadsideSessions: "Sessions {session}",
    depthMetres: "-{metres} m",
    inkFocus: "FOCUS",
    lapsCounter: "Lap {lap} of {total}",
    logRemaining: "{time} left",
    marqueeCountingDown: "Counting down",
    milestoneRow: "{label} — {minutes} min",
    monoTimer: "Timer_01",
    percentProgress: "Session progress",
    pillDone: "{percent}% done",
    punchcardTitle: "Focus card",
    splitFlapPlatform: "Platform {session}",
    wordsRightNow: "Right now",
    ledgerCredited: "{minutes} min",

    // Ledger's five rows.
    ledgerDeepFocus: "Deep focus",
    ledgerSteadyWork: "Steady work",
    ledgerPushThrough: "Push through",
    ledgerHomeStretch: "Home stretch",
    ledgerFinalSprint: "Final sprint",

    // Milestones' five marks.
    milestoneStarted: "Session started",
    milestoneSettledIn: "Settled in",
    milestoneHalfway: "Halfway there",
    milestoneFinalStretch: "Final stretch",
    milestoneBreakEarned: "Break earned",

    // Terminal. The command itself is not prose and stays as it is; only the
    // words around it move.
    terminalSession: "session {session} · {state}",
    terminalHint: "^C to abandon · s to stop",

    // Log's two line shapes.
    logInProgress: "min {minute} — in progress…",
    logLogged: "min {minute} — logged ✓",

    // Words spells its number out; see `wordsNumbers.ts` for the tables.
    wordsUnderAMinute: "less than a minute of focus left",
    wordsSentence: "about {spelled} {count, plural, one {minute} other {minutes}} of focus left",
  },

  chrome: {
    openHeader: "Open header",
    closeHeader: "Close header",
    // The product name. Never translated, in any language.
    drawerTitle: "GLU",
    loading: "Loading…",
    github: "GitHub",
    appearance: "Appearance",
    switchToLight: "Switch to light theme",
    switchToDark: "Switch to dark theme",
    toggleScheme: "Toggle colour scheme",
    dark: "Dark",
    light: "Light",
    docs: "Docs",
    settings: "Settings",
    docsTitle: "How GLU works",
    closeDocs: "Close docs",
    settingsTitle: "Settings",
    closeSettings: "Close settings",
    legalAriaLabel: "Legal",
    privacy: "Privacy Policy",
    terms: "Terms of Service",

    swipeHint: "Swipe the clock to switch designs",
    tip: "Tip",
    dismissTip: "Dismiss tip",
  },

  /**
   * The frame around the three long-form documents — the page header, the
   * footer navigation, the modal's own nav (ADR 26 / 29). The *prose* inside
   * them is not here; it lives in per-locale content modules (ADR 44).
   */
  /**
   * The pitch (ADR 31). Unlike the manual and the legal documents, this one
   * *is* in the catalog (ADR 44): it is short, and the first-visit gate renders
   * it on the client — a lazily-loaded content module would put a loading flash
   * in front of the very first thing a new visitor sees. `<b>` arrives through
   * `t.rich`.
   *
   * The clock count is interpolated from `CLOCK_COUNT`, never written out: this
   * file used to say "eighteen" and the roster is long past that.
   */
  /**
   * Page metadata (ADR 30), per language (ADR 44).
   *
   * Only the `<title>` and the meta description live here. The Open Graph
   * card's copy — heading, blurb, image alt — deliberately does **not**:
   * crawlers send no cookie, so the card can only ever be rendered in one
   * language, and `PAGE_META` keeps it in English.
   */
  meta: {
    homeTitle: "GLU — pomodoro and focus timer",
    homeDescription:
      "A tablet-first pomodoro and focus timer: dozens of clock designs, environment tracking, a session record that stays on your device, and optional Todoist time logging.",
    welcomeTitle: "A focus timer for the tablet on your desk",
    welcomeDescription:
      "Pick a length, press start, and work until the clock runs out. GLU is a pomodoro timer with dozens of clock designs and no account — the record stays on your device.",
    privacyTitle: "Privacy Policy",
    privacyDescription:
      "What GLU handles, where it goes, and what it never does. No accounts, no analytics, history stored on your own device.",
    termsTitle: "Terms of Service",
    termsDescription:
      "The terms for using GLU: a free personal focus timer, provided as-is, with your data on your device and your Todoist account your own.",
    docsTitle: "How GLU works",
    docsDescription:
      "The GLU manual: the timer and its shortcuts, the clock gallery, environment toggles, the session record, alerts, and the optional Todoist connection.",
  },

  welcome: {
    eyebrow: "Pomodoro and focus timer",
    headline: "A focus timer for the tablet on your desk.",
    sub: "Pick a length, press start, and work until the clock runs out. GLU keeps the record on the device you focused on — no account, no sign-up, nothing to configure before it is useful.",
    cta: "Start focusing",

    featureClockTitle: "The clock is the page",
    featureClockBody:
      "The timer takes the whole left half of a tablet, big enough to read from across a room. Swipe it and you flip through <b>{count} clock designs</b>, each with its own palette — and the one you land on recolours everything around it, in dark and light.",
    featureEnvironmentTitle: "It notices how you worked",
    featureEnvironmentBody:
      "Six chips — <b>music, podcast, TV, silence, noise, headphones</b> — record the room you focused in. It takes one tap, and it turns a pile of identical sessions into something you can actually read back.",
    featureRecordTitle: "Your record stays yours",
    featureRecordBody:
      "Sessions are counted per day and kept in <b>this browser</b>. There is no account to make, no server holding a copy, and no analytics watching you work. Clearing your browser data is all it takes to erase GLU.",
    featureTodoistTitle: "Todoist, only if you want it",
    featureTodoistBody:
      "Connect Todoist and you can pin the task you are working on, then let GLU post the time to it as a comment when the run ends. Skip it and every other part of GLU works exactly the same.",

    installNote:
      "<b>Install it.</b> Look for the install icon in your browser’s address bar, or “Add to Home Screen” on an iPad, and GLU opens full-screen like an app — no browser bar. It is <b>not</b> an offline app, though: installed or not, it needs a connection to start.",
    aboutNavAriaLabel: "About GLU",
    footnote: "GLU is free and open source.",
  },

  document: {
    lastUpdated: "Last updated: {date}",
    backToGlu: "← Back to GLU",
    footerAriaLabel: "Legal",
    welcome: "Welcome",
    documentation: "Documentation",
    privacy: "Privacy Policy",
    terms: "Terms of Service",
    sourceOnGitHub: "Source on GitHub",
    docsNavAriaLabel: "Docs navigation",
    openAsPage: "Open as a page",
    /** Shown above every non-English legal document (ADR 44). */
    translationNotice:
      "This is a convenience translation. The English version is the one that applies.",
  },

  todoist: {
    logIn: "Log in with Todoist",
    logOut: "Log out",
    accountFallback: "Todoist",
    accountAriaLabel: "Todoist account: {label}",

    // The three source kinds. Held as words rather than derived from the enum:
    // "Choose a {type}" only works in English, where the article happens not to
    // agree with the noun.
    sourceFilter: "Filter",
    sourceLabel: "Label",
    sourceProject: "Project",
    sourceHint: "Sections of a project show one after another, in Todoist’s order.",
    chooseSource: "Choose task source",
    sourceTitle: "Task source",
    closeSource: "Close task source",
    chooseFilter: "Choose a filter",
    chooseLabel: "Choose a label",
    chooseProject: "Choose a project",
    filters: "Filters",
    labels: "Labels",
    projects: "Projects",
    loading: "Loading…",
    nothingHere: "Nothing here.",

    pickSourceHint: "Pick a filter, label or project with the tools icon above.",
    sourceEmpty: "Nothing here — {name} is clear.",
    moreHidden: "+{count} more",
    showingFirst: "Showing first {count}",
    refreshTasks: "Refresh tasks",

    taskTitle: "Task",
    closeTask: "Close task",
    refreshTask: "Refresh task",
    taskGone: "This task no longer exists in Todoist.",
    close: "Close",
    comments: "Comments · oldest first",
    noComments: "No comments yet.",

    focused: "Focused",
    unfocus: "Unfocus",
    noLongerInTodoist: "No longer in Todoist",
    pendingComments: "{count, plural, one {# comment pending} other {# comments pending}}",

    // Task titles are the user's own words and are interpolated verbatim. The
    // quotation marks belong to the *sentence*, so each language brings its own
    // (« » in French, „ “ in German) rather than inheriting English's.
    openTask: "Open “{title}”",
    focusTask: "Focus “{title}”",
    unfocusTask: "Unfocus “{title}”",
    completeTask: "Complete “{title}”",
    priority: "Priority {level}",

    completed: "Completed · {title}",
    commentWillBeAdded: "comment will be added",
    commentAdded: "comment added",
    undo: "Undo",

    couldNotComplete: "Could not complete",
    couldNotUndo: "Could not undo",
    retry: "Retry",
  },

  /**
   * What GLU says when a request fails.
   *
   * One message today, because that is all the app can honestly distinguish:
   * `apiFetch` (`lib/api.ts`) discards the response body, so the backend's
   * snake_case `error` code never reaches the client. Teaching it to keep the
   * body is what would let this grow into a code-keyed map — see ADR 44's note
   * on the reversed filter-error behaviour.
   */
  errors: {
    unreachable: "Could not reach Todoist.",
  },

  notifications: {
    sessionEndTitle: "GLU — time’s up",
    sessionEndBody: "{duration} session finished.",
  },

  environment: {
    legend: "Environment",
    ariaLabel: "Environment",
    // Keys are stable and persisted; these are only the chip faces.
    music: "Music",
    podcast: "Podcast",
    tv: "TV",
    silence: "Silence",
    noisy: "Noisy",
    headphones: "Headphones",
  },
};

/**
 * The shape every other catalog has to fill. Derived from the English module
 * so there is no separate interface to keep in step — adding a message here
 * is the only edit that widens it.
 */
export type Messages = typeof messages;

export default messages;
