import { test as base, expect, type Page } from "@playwright/test";

export type SeededBlob = {
  version: number;
  state: Record<string, unknown>;
};

type GluFixtures = {
  /** Plants a `glu:vN` blob before any page script runs. */
  seedStorage: (blob: SeededBlob, version?: number) => Promise<void>;
  /** Navigates under the basePath. Never use a leading slash — see below. */
  open: (path?: string) => Promise<void>;
  consoleErrors: string[];
};

/**
 * `baseURL` ends in `/glu/`, so relative navigation must be `page.goto('.')`.
 * A leading slash resolves against the *origin* and silently escapes the
 * basePath — the footgun ADR 09 called out. Every test goes through here.
 */
async function openPath(page: Page, baseURL: string | undefined, path = ".") {
  /*
   * ADR 44 pinned the suite to English.
   *
   * Without this the language comes from `Accept-Language`, which is the
   * *browser's* setting, not the app's — so the ~390 assertions in this suite
   * that match on English copy would pass or fail depending on the machine
   * running them. Pinning the cookie makes the suite say out loud which
   * language it is testing, and leaves `e2e/i18n.spec.ts` as the one place
   * that deliberately says something else.
   *
   * Explicit `domain` + `path: "/"` rather than `url`: a cookie added by URL
   * takes the URL's *directory* as its path (`/glu/`), which does not match a
   * request for `/glu` itself — the app's own home route.
   */
  if (baseURL) {
    const { hostname } = new URL(baseURL);
    await page.context().addCookies([
      { name: "glu-locale", value: "en", domain: hostname, path: "/" },
    ]);
  }

  // ADR 31 put a welcome gate in front of `/glu`, and this helper waits on the
  // clock — so without this, a test that seeds nothing sits on the landing page
  // until it times out. Every existing test means to be a *returning* user,
  // which is the app's normal state, so that is what `open()` provides.
  //
  // Registered here rather than in the fixture's setup, and that ordering is
  // the whole trick: init scripts run in registration order, and a test's own
  // `seedStorage()` call happens in the test body — after setup, before
  // `open()`. Planting this first would make the real seed's
  // "only-if-nothing-there" guard skip, silently replacing every seeded blob
  // with this stub. The guard below is the mirror image: an explicit seed wins,
  // untouched.
  await page.addInitScript(() => {
    const seeded = Object.keys(window.localStorage).some((k) => k.startsWith("glu:v"));
    if (seeded) return;
    // A partial state is fine — `persist` merges it over the store's defaults.
    window.localStorage.setItem(
      "glu:v2",
      JSON.stringify({ state: { hasEnteredApp: true }, version: 2 }),
    );
  });
  // `load`, not `networkidle`: the app keeps no long-lived connections, and
  // networkidle is both discouraged by Playwright and hostage to any single
  // slow request (the Todoist `/status` probe, for one). Every assertion after
  // this point is web-first anyway.
  await page.goto(path, { waitUntil: "load" });
  await page.locator('[data-testid="clock-slot"]').waitFor({ state: "visible" });
}

export const test = base.extend<GluFixtures>({
  /**
   * Every test gets its own client identity (ADR 24).
   *
   * The whole suite drives the app from one loopback address, so without this
   * all ~330 tests share a single rate-limit bucket and the back half of the
   * run is served `rate limited` instead of the app — which is exactly what
   * happened before this fixture existed. Raising the production limit to fit
   * a test harness would be the wrong repair; this is the right one, and it is
   * *more* faithful than the alternative: in production every request arrives
   * with a proxy-set client header, which is precisely what this sends.
   *
   * `X-Glu-Client-IP` is the explicit override in the resolution chain, and it
   * is deliberately not an address any real client could hold.
   */
  extraHTTPHeaders: async ({}, use, testInfo) => {
    await use({ "x-glu-client-ip": `e2e-w${testInfo.workerIndex}-${testInfo.testId}` });
  },

  /**
   * The console tripwire: any console error or hydration warning fails the
   * test.
   *
   * One allowlist, and only because a test forced it: Chromium emits
   * `Failed to load resource` for *any* non-2xx or aborted request, with no app
   * code involved. Load-time 404s are covered separately by the response
   * listener in the "no 404s" test, so nothing is lost — and an app-emitted
   * `console.error` still fails, which is the point.
   */
  consoleErrors: async ({ page }, use) => {
    const browserNoise = /^Failed to load resource:/;
    const errors: string[] = [];
    page.on("console", (message) => {
      const text = message.text();
      if (browserNoise.test(text)) return;
      if (message.type() === "error") errors.push(`console.error: ${text}`);
      else if (/hydrat/i.test(text)) errors.push(`hydration: ${text}`);
    });
    page.on("pageerror", (error) => errors.push(`pageerror: ${error.message}`));

    await use(errors);

    expect(errors, "console must stay clean").toEqual([]);
  },

  seedStorage: async ({ page }, use) => {
    await use(async (blob, version = 2) => {
      // `addInitScript` runs on *every* navigation, so the seed must only
      // plant when nothing is there — otherwise a `page.reload()` silently
      // restores the seed and every reload assertion passes vacuously.
      await page.addInitScript(
        ([key, value]) => {
          const alreadySeeded = Object.keys(window.localStorage).some((k) =>
            k.startsWith("glu:v"),
          );
          if (!alreadySeeded) window.localStorage.setItem(key as string, value as string);
        },
        [`glu:v${version}`, JSON.stringify(blob)] as const,
      );
    });
  },

  open: async ({ page, baseURL }, use) => {
    await use((path) => openPath(page, baseURL, path));
  },
});

export { expect };

/** The persisted shape's defaults, so seeds only have to say what differs. */
export const defaultState = {
  status: "idle",
  endAt: null,
  remaining: 20 * 60_000,
  total: 20 * 60_000,
  selectedDuration: 20 * 60_000,
  runId: null,
  ranMs: 0,
  runningSince: null,
  environment: {
    music: false,
    podcast: false,
    tv: false,
    silence: false,
    noisy: false,
    headphones: false,
  },
  chromeThemeId: "studio-quiet",
  activeClockId: "halo",
  showSessionOnClock: true,
  swipeHintDismissed: false,
  hasStartedRun: false,
  // ADR 31: a seeded blob is a returning user by definition. A test that wants
  // the welcome gate seeds nothing and drives `page.goto` directly.
  hasEnteredApp: true,
  stayAwakeAlways: false,
  stayAwakeWhileRunning: true,
  // ADR 40: the shipped alert — ADR 18's chime, played once.
  alertSoundId: "chime",
  alertDurationSeconds: 0,
  // ADR 41: nothing spent yet, and GLU's own half of the switch is on.
  alertPromptsUsed: 0,
  notifyOnSessionEnd: true,
  commentEnvironment: true,
  commentThresholdMinutes: 1,
  // ADR 39: `SECTION_ITEM_LIMIT_ALL` — no ceiling.
  sectionItemLimit: 0,
  // ADR 44: follow the browser until told otherwise. Note this is the *store's*
  // mirror; the language a test actually renders in comes from the `glu-locale`
  // cookie, which `open()` pins to English for the whole suite.
  locale: "auto",
  todoistSource: null,
  focusedTask: null,
  outbox: [],
  day: { startedAt: 0, sessions: [] },
  archive: [],
  recordedRunIds: [],
};

export const seed = (patch: Record<string, unknown> = {}, version = 2): SeededBlob => ({
  version,
  state: { ...defaultState, ...patch },
});

/** Reads the persisted blob out of the running page. */
export async function readBlob(page: Page, version = 2) {
  return page.evaluate((v) => {
    const raw = window.localStorage.getItem(`glu:v${v}`);
    return raw ? JSON.parse(raw).state : null;
  }, version);
}

