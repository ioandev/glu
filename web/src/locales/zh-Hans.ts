import type { Messages } from "./en";

/**
 * Chinese has a single plural category, so every `plural` here carries only
 * `other` — an `one` branch would be dead text that no count ever selects.
 */
const messages = {
  language: {
    sectionTitle: "语言",
    sectionAriaLabel: "语言设置",
    label: "语言",
    description: "GLU 显示所用的语言。“自动”会跟随浏览器请求的语言。",
    automatic: "自动",
  },

  settings: {
    todoistAriaLabel: "Todoist 设置",
    todoistTitle: "Todoist",
    signedInAs: "已登录为 {name}",
    signedInFallbackName: "你的 Todoist 账户",
    logOut: "退出登录",

    tasksAriaLabel: "任务设置",
    tasksTitle: "任务",
    sectionItemLimitLabel: "每个分区最多显示",
    sectionItemLimitDescription: "较长的分区只显示这么多任务，其余的收在可点按的“+N 更多”后面。",
    sectionItemLimitAll: "全部",

    screenAriaLabel: "屏幕设置",
    screenTitle: "屏幕",
    stayAwakeAlwaysLabel: "在本站保持屏幕常亮",
    stayAwakeAlwaysDescription: "只要 GLU 处于打开状态就保持屏幕常亮，无论计时器是否运行。",
    stayAwakeRunningLabel: "计时器运行时保持常亮",
    stayAwakeRunningDescription: "在一次专注期间保持常亮，暂停或结束后再保持五分钟。",

    alertsAriaLabel: "提示音设置",
    alertsTitle: "提示",

    commentsAriaLabel: "时间备注设置",
    commentsTitle: "时间备注",
    thresholdLabel: "记录的最短时间",
    thresholdDescription: "短于此时长的专注不会在聚焦任务上留下备注。",
    minutesShort: "{count} 分钟",
    sayHowYouWorkedLabel: "记录你是怎么工作的",
    sayHowYouWorkedDescription: "把你的环境开关一并写进 GLU 发布在聚焦任务上的备注里。",
    previewOn: "开",
    previewOff: "关",
    previewSampled: "{label} · 示例",
    previewLive: "{label} · 当前",
    previewSampleNote: "目前还没有打开任何环境开关——示例展示的是{first}和{second}时的样子。",
  },

  alerts: {
    soundLabel: "声音",
    soundDescription: "一次专注归零时播放。点一下就能听到实际效果。",
    durationLabel: "播放多久",
    durationDescription:
      "GLU 会重复播放该声音直到这段时间结束。最后一遍总会播完，所以可能会多响一会儿。",
    durationOnce: "一次",
    durationSeconds: "{count} 秒",

    soundChime: "叮咚",
    soundBell: "铃声",
    soundWood: "木鱼",
    soundRise: "上扬",
    soundSettle: "沉落",
    soundPulse: "脉冲",
    soundDigital: "电子",
    soundGlass: "玻璃",
    soundDeep: "低沉",

    notifyLabel: "专注结束时通知我",
    notifyDescription: "当你在看别处而一次专注归零时发出通知。无论如何都会播放声音。",
    notifyDenied:
      "浏览器正在拦截本站点的通知。请打开站点设置——地址栏旁边的图标，或 Android 上的 ⋮ → 网站设置——把“通知”设为“允许”，然后重新打开此开关。",
    notifyDismissed: "提示框已关闭且未作选择。请重新打开此开关并选择“允许”。",
    notifyUnsupported: "此浏览器不提供通知。专注结束时仍会播放声音。",
  },

  timer: {
    startHint: "开始 — {key}",
    pauseHint: "暂停 — {key}",
    resumeHint: "继续 — {key}",
    stopHint: "停止 — {key}",
    start: "开始",
    pause: "暂停",
    resume: "继续",
    stop: "停止",

    presetsAriaLabel: "预设时长",
    adjustAriaLabel: "调整剩余时间",
    adjustAdd: "增加 {count, plural, other {# 分钟}}",
    adjustSubtract: "减少 {count, plural, other {# 分钟}}",

    sessionsAriaLabel: "今天的专注次数",
    sessionsToday: "今天 {count} 次",
    sessionsOverflow: "+{count}",
    newDay: "新的一天",
    newDayConfirmAriaLabel: "确认开始新的一天",
    newDayHeading: "开始新的一天？",
    newDayNothing: "目前还没有可重置的内容。",
    newDayReset: "{count, plural, other {今天的 # 次专注将归零。}}",
    cancel: "取消",
    reset: "重置",
    showSessions: "显示专注次数",
  },

  app: {
    timerAriaLabel: "计时器",
    todoistAriaLabel: "Todoist 区域",
    environmentAriaLabel: "环境开关",
  },

  clock: {
    focus: "专注",
    paused: "已暂停",
    done: "已完成",
    ready: "就绪",

    ascending: "爬升中",
    apertureOpening: "光圈渐开",
    banking: "存入中",
    counting: "计数中",
    growingBubble: "膨胀中",
    dontBreakIt: "别断了",
    orbit: "环绕",
    celebratingEarly: "提前庆祝",
    deepWork: "深度工作",
    momentumDominoes: "势头",
    untilBreak: "距离休息",
    momentumGauge: "势头",
    warmingUp: "升温中",
    leftInk: "剩余",
    credited: "已入账",
    inSession: "进行中",
    countingDownNeon: "倒计时",
    leftPercent: "剩余",
    pouring: "倾注中",
    stillAlive: "还在跳",
    stamping: "打卡中",
    heatingUp: "加热中",
    scanning: "扫描中",
    radiating: "扩散中",
    enRoute: "在路上",
    focusSignal: "专注信号",
    building: "施工中",
    earning: "积累中",
    growingSprout: "生长中",
    keepClimbing: "专注 · 继续攀登",
    focusRising: "专注升起",
    focusUntilSundown: "专注到日落",
    leftToScore: "还差",
    lightingUp: "点亮中",
    fillingFocus: "注满 · 专注",
    filling: "注满中",
    // Left as-is: the universal recording abbreviation, and it is drawn small.
    rec: "Rec",
    thenABreak: "然后休息",

    arcadeLine: "1UP · {label}",
    broadsideLine: "番茄钟 — {label}",
    cellLine: "剩余电量 · {label}",
    lunarLine: "盈月 · {label}",
    mercuryLine: "专注热度 · {label}",
    odometerLine: "分 · 秒 · {label}",
    splitFlapLine: "即将出发 · {label}",
    starsLine: "每 {seconds} 秒一颗星 · {label}",
    tempoLine: "节奏 · {label}",
    percentThenLabel: "{percent}% {label}",
    ghostLine: ":{seconds} · {label}",
    altitudeLine: "{label} · {percent}%",
    nixieTube: " · 第 {session} 管",

    arcadeTime: "时间 {time}",
    beamDone: "{minutes} 分钟已完成 {percent}%",
    blueprintFigure: "图 — 剩余时间",
    broadsideSessions: "第 {session} 轮",
    depthMetres: "-{metres} 米",
    // A wordmark drawn as artwork, not a label.
    inkFocus: "FOCUS",
    lapsCounter: "第 {lap} 圈，共 {total} 圈",
    logRemaining: "剩余 {time}",
    marqueeCountingDown: "倒计时",
    milestoneRow: "{label} — {minutes} 分钟",
    // A machine label, deliberately untranslated.
    monoTimer: "Timer_01",
    percentProgress: "本轮进度",
    pillDone: "已完成 {percent}%",
    punchcardTitle: "专注卡",
    splitFlapPlatform: "{session} 号站台",
    wordsRightNow: "此刻",
    ledgerCredited: "{minutes} 分钟",

    ledgerDeepFocus: "深度专注",
    ledgerSteadyWork: "稳步推进",
    ledgerPushThrough: "咬牙坚持",
    ledgerHomeStretch: "最后一段",
    ledgerFinalSprint: "最后冲刺",

    milestoneStarted: "本轮开始",
    milestoneSettledIn: "进入状态",
    milestoneHalfway: "过半了",
    milestoneFinalStretch: "最后阶段",
    milestoneBreakEarned: "该休息了",

    terminalSession: "session {session} · {state}",
    // `^C` and `s` are literal keystrokes.
    terminalHint: "^C 放弃 · s 停止",

    logInProgress: "第 {minute} 分 — 进行中…",
    logLogged: "第 {minute} 分 — 已记录 ✓",

    wordsUnderAMinute: "还剩不到一分钟的专注",
    wordsSentence: "还剩大约{spelled}分钟的专注",
  },

  chrome: {
    openHeader: "打开顶栏",
    closeHeader: "关闭顶栏",
    drawerTitle: "GLU",
    loading: "加载中…",
    github: "GitHub",
    appearance: "外观",
    switchToLight: "切换到浅色主题",
    switchToDark: "切换到深色主题",
    toggleScheme: "切换配色方案",
    dark: "深色",
    light: "浅色",
    docs: "手册",
    settings: "设置",
    docsTitle: "GLU 使用说明",
    closeDocs: "关闭手册",
    settingsTitle: "设置",
    closeSettings: "关闭设置",
    legalAriaLabel: "法律条款",
    privacy: "隐私政策",
    terms: "服务条款",

    swipeHint: "滑动时钟即可切换设计",
    tip: "提示",
    dismissTip: "关闭提示",
  },

  meta: {
    homeTitle: "GLU — 番茄钟与专注计时器",
    homeDescription:
      "一款为平板打造的番茄钟与专注计时器：数十种表盘设计、环境记录、留在你自己设备上的专注记录，以及可选的 Todoist 时间登记。",
    welcomeTitle: "为你桌上的平板打造的专注计时器",
    welcomeDescription:
      "选一个时长，按下开始，一直做到时间归零。GLU 是一款番茄钟，拥有数十种表盘设计，且无需账户——记录留在你自己的设备上。",
    privacyTitle: "隐私政策",
    privacyDescription:
      "GLU 处理什么、数据去了哪里、以及它从不做什么。没有账户，没有分析统计，历史记录保存在你自己的设备上。",
    termsTitle: "服务条款",
    termsDescription:
      "使用 GLU 的条款：一款免费的个人专注计时器，按现状提供；你的数据在你的设备上，你的 Todoist 账户仍然属于你。",
    docsTitle: "GLU 使用说明",
    docsDescription:
      "GLU 使用手册：计时器及其快捷键、表盘图库、环境开关、专注记录、提示音，以及可选的 Todoist 连接。",
  },

  welcome: {
    eyebrow: "番茄钟与专注计时器",
    headline: "为你桌上的平板打造的专注计时器。",
    sub: "选一个时长，按下开始，一直做到时间归零。GLU 把记录留在你用来专注的那台设备上——不用账户，不用注册，也不用先配置什么才能用起来。",
    cta: "开始专注",

    featureClockTitle: "表盘就是整个页面",
    featureClockBody:
      "计时器占据平板的整个左半边，隔着房间也看得清。滑动它就能翻过 <b>{count} 种表盘设计</b>，每一种都有自己的配色；你停在哪一种，周围的一切就跟着换色，深色浅色都一样。",
    featureEnvironmentTitle: "它会记下你是怎么工作的",
    featureEnvironmentBody:
      "六个标签——<b>音乐、播客、电视、安静、嘈杂、耳机</b>——记录你专注时所处的环境。只需一次点按，一堆看起来毫无差别的专注记录就变成了真正能回看的东西。",
    featureRecordTitle: "你的记录始终属于你",
    featureRecordBody:
      "专注次数按天统计，保存在<b>这个浏览器</b>里。不需要注册账户，没有服务器留副本，也没有分析工具盯着你工作。清除浏览器数据，就足以抹掉 GLU。",
    featureTodoistTitle: "Todoist，想用才用",
    featureTodoistBody:
      "连接 Todoist 之后，你可以固定正在做的任务，让 GLU 在一次专注结束时把用时作为评论写上去。不用它也完全没关系，GLU 的其他部分照常运作。",

    installNote:
      "<b>把它装起来。</b>在浏览器地址栏找安装图标，或在 iPad 上选“添加到主屏幕”，GLU 就会像应用一样全屏打开，没有浏览器地址栏。不过它<b>不是</b>离线应用：无论是否安装，启动时都需要网络。",
    aboutNavAriaLabel: "关于 GLU",
    footnote: "GLU 免费且开源。",
  },

  document: {
    lastUpdated: "最后更新：{date}",
    backToGlu: "← 返回 GLU",
    footerAriaLabel: "法律条款",
    welcome: "欢迎",
    documentation: "使用手册",
    privacy: "隐私政策",
    terms: "服务条款",
    sourceOnGitHub: "在 GitHub 查看源码",
    docsNavAriaLabel: "手册导航",
    openAsPage: "以页面方式打开",
    translationNotice: "本译文仅供参考，具有法律效力的是英文版本。",
  },

  todoist: {
    logIn: "使用 Todoist 登录",
    logOut: "退出登录",
    accountFallback: "Todoist",
    accountAriaLabel: "Todoist 账户：{label}",

    sourceFilter: "筛选器",
    sourceLabel: "标签",
    sourceProject: "项目",
    sourceHint: "项目的各个分区会按 Todoist 中的顺序依次显示。",
    chooseSource: "选择任务来源",
    sourceTitle: "任务来源",
    closeSource: "关闭任务来源",
    chooseFilter: "选择一个筛选器",
    chooseLabel: "选择一个标签",
    chooseProject: "选择一个项目",
    filters: "筛选器",
    labels: "标签",
    projects: "项目",
    loading: "加载中…",
    nothingHere: "这里什么也没有。",

    pickSourceHint: "用上方的工具图标选择筛选器、标签或项目。",
    sourceEmpty: "这里什么也没有——{name} 已清空。",
    moreHidden: "+{count} 更多",
    showingFirst: "仅显示前 {count} 条",
    refreshTasks: "刷新任务",

    taskTitle: "任务",
    closeTask: "关闭任务",
    refreshTask: "刷新任务",
    taskGone: "该任务已不在 Todoist 中。",
    close: "关闭",
    comments: "评论 · 由旧到新",
    noComments: "还没有评论。",

    focused: "已聚焦",
    unfocus: "取消聚焦",
    noLongerInTodoist: "已不在 Todoist 中",
    pendingComments: "{count, plural, other {# 条备注待发送}}",

    openTask: "打开“{title}”",
    focusTask: "聚焦“{title}”",
    unfocusTask: "取消聚焦“{title}”",
    completeTask: "完成“{title}”",
    priority: "优先级 {level}",

    completed: "已完成 · {title}",
    commentWillBeAdded: "备注将被添加",
    commentAdded: "备注已添加",
    undo: "撤销",

    couldNotComplete: "无法完成",
    couldNotUndo: "无法撤销",
    retry: "重试",
  },

  errors: {
    unreachable: "无法连接 Todoist。",
  },

  notifications: {
    sessionEndTitle: "GLU — 时间到",
    sessionEndBody: "{duration} 的专注已结束。",
  },

  environment: {
    legend: "环境",
    ariaLabel: "环境",
    music: "音乐",
    podcast: "播客",
    tv: "电视",
    silence: "安静",
    noisy: "嘈杂",
    headphones: "耳机",
  },
} satisfies Messages;

export default messages;
