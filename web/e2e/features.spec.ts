import { expect, readBlob, seed, test } from "./fixtures";

const MINUTE = 60_000;

/**
 * A finished run raises ADR 21's takeover, which captures pointer events. Tests
 * that need to press a control afterwards dismiss it first.
 */
async function dismissTakeover(page: import("@playwright/test").Page) {
  const overlay = page.getByTestId("takeover-overlay");
  // Retry: the entrance sweep can still be settling when we arrive, and a click
  // mid-animation is swallowed. Poll until the overlay is genuinely gone.
  for (let attempt = 0; attempt < 5 && (await overlay.count()) > 0; attempt += 1) {
    await overlay.click({ position: { x: 5, y: 5 }, force: true }).catch(() => {});
    await overlay.waitFor({ state: "detached", timeout: 1500 }).catch(() => {});
  }
  await expect(overlay).toHaveCount(0);
}


/* ------------------------------------------------------------------------- */
/* ADR 05 — session tracking                                                  */
/* ------------------------------------------------------------------------- */

test.describe("sessions (ADR 05)", () => {
  test.beforeEach(async ({ page }) => {
    await page.clock.install();
  });

  test("@smoke finish → count 1 → finish → count 2", async ({ page, open }) => {
    await open();
    await page.getByRole("button", { name: "5m", exact: true }).click();

    await page.getByRole("button", { name: "Start" }).click();
    await page.clock.fastForward("05:01");
    await expect(page.getByTestId("session-count")).toHaveText("1 today");
    // A finished run raises the takeover (ADR 21); dismiss it to reach Start.
    await dismissTakeover(page);

    await page.getByRole("button", { name: "Start" }).click();
    await page.clock.fastForward("05:01");
    await expect(page.getByTestId("session-count")).toHaveText("2 today");
  });

  test("stopping mid-run records nothing", async ({ page, open }) => {
    await open();
    await page.getByRole("button", { name: "Start" }).click();
    await page.clock.fastForward("02:00");
    await page.getByRole("button", { name: "Stop" }).click();
    await expect(page.getByTestId("session-count")).toHaveText("0 today");
  });

  test("expired-while-closed records exactly once across two reloads", async ({
    page,
    open,
    seedStorage,
  }) => {
    await page.clock.install({ time: new Date("2026-07-24T09:00:00Z") });
    await seedStorage(
      seed({
        status: "running",
        endAt: new Date("2026-07-24T08:55:00Z").getTime(),
        remaining: 0,
        total: 10 * MINUTE,
        runId: "expired-run",
        runningSince: new Date("2026-07-24T08:45:00Z").getTime(),
      }),
    );

    await open();
    await expect(page.getByTestId("session-count")).toHaveText("1 today");

    for (let i = 0; i < 2; i += 1) {
      await page.reload({ waitUntil: "load" });
      await expect(page.getByTestId("session-count")).toHaveText("1 today");
    }
  });

  test("New day: cancel changes nothing, confirm archives and resets", async ({
    page,
    open,
    seedStorage,
  }) => {
    const sessions = Array.from({ length: 3 }, (_, i) => ({
      endedAt: 1_700_000_000_000 + i,
      durationMs: 20 * MINUTE,
      environment: seed().state.environment,
    }));
    await seedStorage(seed({ day: { startedAt: 1_700_000_000_000, sessions } }));

    await open();
    await expect(page.getByTestId("session-count")).toHaveText("3 today");

    await page.getByRole("button", { name: "New day" }).click();
    await page.getByRole("button", { name: "Cancel" }).click();
    await expect(page.getByTestId("session-count")).toHaveText("3 today");

    await page.getByRole("button", { name: "New day" }).click();
    await page.getByRole("button", { name: "Reset" }).click();
    await expect(page.getByTestId("session-count")).toHaveText("0 today");
    await expect.poll(async () => (await readBlob(page))?.archive.length).toBe(1);

    await page.reload({ waitUntil: "load" });
    await expect(page.getByTestId("session-count")).toHaveText("0 today");
    await expect.poll(async () => (await readBlob(page))?.archive.length).toBe(1);
  });

  test("a v1 blob migrates in place, preserving a running timer", async ({
    page,
    open,
    seedStorage,
  }) => {
    await page.clock.install({ time: new Date("2026-07-24T09:00:00Z") });
    await seedStorage(
      {
        version: 1,
        state: {
          status: "running",
          endAt: new Date("2026-07-24T09:06:00Z").getTime(),
          remaining: 6 * MINUTE,
          total: 20 * MINUTE,
          selectedDuration: 20 * MINUTE,
          runId: "v1-run",
          ranMs: 14 * MINUTE,
          runningSince: new Date("2026-07-24T08:46:00Z").getTime(),
          environment: {
            music: false,
            podcast: true,
            tv: false,
            silence: false,
            noisy: false,
            headphones: true,
          },
        },
      },
      1,
    );

    await open();
    await expect(page.getByTestId("clock-slot")).toContainText("06:00");
    await expect(page.getByTestId("session-count")).toHaveText("0 today");

    // A transition writes the v2 blob back and drops v1.
    await page.getByRole("button", { name: "Pause" }).click();
    await expect
      .poll(() => page.evaluate(() => Object.keys(localStorage).filter((k) => k.startsWith("glu"))))
      .toEqual(["glu:v2"]);
    await expect
      .poll(async () => (await readBlob(page))?.environment)
      .toMatchObject({ podcast: true, headphones: true });
  });
});

/* ------------------------------------------------------------------------- */
/* ADR 06 — keyboard control                                                  */
/* ------------------------------------------------------------------------- */

test.describe("keyboard (ADR 06)", () => {
  test.beforeEach(async ({ page }) => {
    await page.clock.install();
  });

  test("s stops, p toggles, n restarts at the selected duration", async ({ page, open }) => {
    await open();
    await page.getByRole("button", { name: "Start" }).click();
    await page.clock.fastForward("00:20");

    await page.keyboard.press("p");
    await expect.poll(async () => (await readBlob(page))?.status).toBe("paused");
    await page.keyboard.press("p");
    await expect.poll(async () => (await readBlob(page))?.status).toBe("running");

    // `n` after a ± adjustment restarts at the *selected* duration.
    await page.getByRole("button", { name: /Add 5 minutes/ }).click();
    await page.keyboard.press("n");
    await expect(page.getByTestId("clock-slot")).toContainText("20:00");
    await expect(page.getByTestId("session-count")).toHaveText("0 today");

    await page.keyboard.press("s");
    await expect.poll(async () => (await readBlob(page))?.status).toBe("idle");
  });

  test("Ctrl+C stops only when nothing is selected", async ({ page, open }) => {
    await open();
    await page.getByRole("button", { name: "Start" }).click();

    // With a selection it stays the copy shortcut, untouched.
    await page.evaluate(() => {
      const target = document.querySelector('[data-testid="session-count"]');
      const range = document.createRange();
      range.selectNodeContents(target!);
      const selection = window.getSelection()!;
      selection.removeAllRanges();
      selection.addRange(range);
    });
    await page.keyboard.press("Control+c");
    await expect.poll(async () => (await readBlob(page))?.status).toBe("running");

    await page.evaluate(() => window.getSelection()?.removeAllRanges());
    await page.keyboard.press("Control+c");
    await expect.poll(async () => (await readBlob(page))?.status).toBe("idle");
  });
});

/* ------------------------------------------------------------------------- */
/* ADR 08 — clock gallery                                                     */
/* ------------------------------------------------------------------------- */

test.describe("clock gallery (ADR 08)", () => {
  const pageBackground = (page: import("@playwright/test").Page) =>
    page.evaluate(() =>
      getComputedStyle(document.querySelector('[aria-label="Timer"]')!.parentElement!)
        .backgroundColor,
    );

  test("@smoke flipping changes the clock and repaints the page, and survives a reload", async ({
    page,
    open,
  }) => {
    await open();
    await expect(page.getByTestId("clock-slot")).toHaveAttribute("data-clock-id", "halo");
    const before = await pageBackground(page);

    await page.getByRole("button", { name: "Next clock design" }).click();
    await expect(page.getByTestId("clock-slot")).not.toHaveAttribute("data-clock-id", "halo");
    await expect.poll(() => pageBackground(page)).not.toBe(before);

    const chosen = await page.getByTestId("clock-slot").getAttribute("data-clock-id");
    await page.reload({ waitUntil: "load" });
    await expect(page.getByTestId("clock-slot")).toHaveAttribute("data-clock-id", chosen!);
  });

  test("wraps at both ends", async ({ page, open }) => {
    await open();
    await page.getByRole("button", { name: "Previous clock design" }).click();
    await expect(page.getByTestId("clock-slot")).toHaveAttribute("data-clock-id", "edge");
    await page.getByRole("button", { name: "Next clock design" }).click();
    await expect(page.getByTestId("clock-slot")).toHaveAttribute("data-clock-id", "halo");
  });

  test("an unknown clock id falls back to Halo", async ({ page, open, seedStorage }) => {
    await seedStorage(seed({ activeClockId: "not-a-clock" }));
    await open();
    await expect(page.getByTestId("clock-slot")).toHaveAttribute("data-clock-id", "halo");
  });

  test("a running timer keeps counting across flips", async ({ page, open }) => {
    await page.clock.install();
    await open();
    await page.getByRole("button", { name: "Start" }).click();
    await page.clock.fastForward("00:30");
    await page.getByRole("button", { name: "Next clock design" }).click();
    await page.clock.fastForward("00:30");
    await expect(page.getByTestId("clock-slot")).toContainText("19:00");
  });

  test("the session display can be switched off and stays off", async ({ page, open }) => {
    await open();
    await expect(page.getByTestId("clock-session")).toBeVisible();
    await page.getByLabel("Show sessions").click();
    await expect(page.getByTestId("clock-session")).toHaveCount(0);
    await page.reload({ waitUntil: "load" });
    await expect(page.getByTestId("clock-session")).toHaveCount(0);
  });

  test("a horizontal swipe flips; a vertical drag never does", async ({ page, open }) => {
    await open();
    const slot = page.getByTestId("clock-slot");
    const box = (await slot.boundingBox())!;
    const cx = box.x + box.width / 2;
    const cy = box.y + box.height / 2;

    await page.mouse.move(cx, cy);
    await page.mouse.down();
    await page.mouse.move(cx - 120, cy + 4, { steps: 8 });
    await page.mouse.up();
    await expect(slot).not.toHaveAttribute("data-clock-id", "halo");

    const after = await slot.getAttribute("data-clock-id");
    await page.mouse.move(cx, cy);
    await page.mouse.down();
    await page.mouse.move(cx + 10, cy - 220, { steps: 8 });
    await page.mouse.up();
    await expect(slot).toHaveAttribute("data-clock-id", after!);
  });

  /* ADR 25 — the flip slides. */

  test("a flip mounts a departing layer and settles back to one clock", async ({ page, open }) => {
    await open();
    const slot = page.getByTestId("clock-slot");
    const layers = slot.locator("[data-role]");
    await expect(layers).toHaveCount(1);

    await page.getByRole("button", { name: "Next clock design" }).click();
    await expect(slot.locator('[data-role="leaving"]')).toHaveAttribute(
      "data-direction",
      "forward",
    );
    // The slide is clock-sized: the departing layer never escapes the slot.
    expect(await slot.evaluate((el) => getComputedStyle(el).overflowX)).toBe("clip");

    await expect(layers).toHaveCount(1);
  });

  test("a swipe whose release lands outside the slot still flips", async ({ page, open }) => {
    await open();
    const slot = page.getByTestId("clock-slot");
    const box = (await slot.boundingBox())!;

    // Start inside, release well past the left edge — the natural tablet
    // gesture, and the one pointer capture is here to keep (ADR 25).
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x - 80, box.y + box.height / 2, { steps: 8 });
    await page.mouse.up();

    await expect(slot).not.toHaveAttribute("data-clock-id", "halo");
  });
});

/* ------------------------------------------------------------------------- */
/* ADR 04 — PWA install collateral                                            */
/* ------------------------------------------------------------------------- */

test.describe("PWA collateral (ADR 04)", () => {
  test("the manifest and icons are served under /glu with no service worker", async ({
    page,
    open,
    request,
    baseURL,
  }) => {
    const manifestResponse = await request.get(new URL("manifest.webmanifest", baseURL).toString());
    expect(manifestResponse.status()).toBe(200);
    const manifest = await manifestResponse.json();
    expect(manifest.start_url).toContain("/glu");
    expect(manifest.display).toBe("standalone");

    // Manifest-internal URLs are relative, so they resolve under /glu/ by spec.
    const purposes = (manifest.icons as { src: string; purpose: string; sizes: string }[]).map(
      (icon) => `${icon.sizes}:${icon.purpose}`,
    );
    expect(purposes).toContain("192x192:any");
    expect(purposes).toContain("512x512:any");
    expect(purposes).toContain("512x512:maskable");

    for (const icon of manifest.icons as { src: string }[]) {
      const iconResponse = await request.get(new URL(icon.src, baseURL).toString());
      expect(iconResponse.status(), icon.src).toBe(200);
    }

    await open();
    // PWA = installable only, NOT offline: no service worker anywhere.
    const registrations = await page.evaluate(async () =>
      "serviceWorker" in navigator
        ? (await navigator.serviceWorker.getRegistrations()).length
        : 0,
    );
    expect(registrations).toBe(0);

    // Two theme-color variants, emitted from the viewport export.
    const themeColors = await page.evaluate(() =>
      [...document.querySelectorAll('meta[name="theme-color"]')].map((meta) => ({
        media: meta.getAttribute("media"),
        content: meta.getAttribute("content"),
      })),
    );
    expect(themeColors.length).toBeGreaterThanOrEqual(2);
    expect(themeColors.map((t) => t.media)).toEqual(
      expect.arrayContaining([
        "(prefers-color-scheme: light)",
        "(prefers-color-scheme: dark)",
      ]),
    );

    // The tab and Apple icons come from the file convention. Asserting the tags
    // exist is not enough — the bug this replaces was a `metadata.icons` entry
    // that both deleted every `rel="icon"` link and pointed Apple at a
    // basePath-less URL. So: the links must be there *and* their hrefs must
    // resolve, prefix included.
    const iconLinks = await page.evaluate(() =>
      [
        // `rel~="icon"` does not match `apple-touch-icon` — that rel is one
        // word, not a list containing "icon". Both selectors are needed.
        ...document.querySelectorAll<HTMLLinkElement>(
          'link[rel~="icon"], link[rel="apple-touch-icon"]',
        ),
      ].map((link) => ({ rel: link.getAttribute("rel")!, href: link.href })),
    );

    const rels = iconLinks.map((link) => link.rel);
    expect(rels).toContain("icon");
    expect(rels).toContain("apple-touch-icon");

    for (const { rel, href } of iconLinks) {
      expect(new URL(href).pathname, `${rel} must carry the basePath`).toContain("/glu/");
      const response = await request.get(href);
      expect(response.status(), `${rel} → ${href}`).toBe(200);
    }
  });
});

/* ------------------------------------------------------------------------- */
/* ADR 17 — wake lock                                                         */
/* ------------------------------------------------------------------------- */

test.describe("wake lock (ADR 17)", () => {
  test("the app runs clean with the Wake Lock API absent", async ({
    page,
    open,
    consoleErrors,
  }) => {
    await page.clock.install();
    await page.addInitScript(() => {
      // The tolerance path: browsers that don't ship it, and battery saver.
      Reflect.deleteProperty(navigator as unknown as Record<string, unknown>, "wakeLock");
    });

    await open();
    await page.getByRole("button", { name: "Start" }).click();
    await page.clock.fastForward("01:00");
    await expect(page.getByTestId("clock-slot")).toContainText("19:00");
    await page.getByRole("button", { name: "Stop" }).click();
    await expect(page.getByTestId("clock-slot")).toContainText("20:00");

    expect(consoleErrors).toEqual([]);
  });

  test("a rejecting request() changes nothing", async ({ page, open, consoleErrors }) => {
    await page.clock.install();
    await page.addInitScript(() => {
      Object.defineProperty(navigator, "wakeLock", {
        configurable: true,
        value: { request: () => Promise.reject(new Error("battery saver")) },
      });
    });

    await open();
    await page.getByRole("button", { name: "Start" }).click();
    await page.clock.fastForward("00:30");
    await expect(page.getByTestId("clock-slot")).toContainText("19:30");
    expect(consoleErrors).toEqual([]);
  });
});

/* ------------------------------------------------------------------------- */
/* ADR 18 — session-end alerts                                                */
/* ------------------------------------------------------------------------- */

test.describe("session-end alerts (ADR 18)", () => {
  /** Records Notification construction without needing an OS notification. */
  const installRecorder = (page: import("@playwright/test").Page) =>
    page.addInitScript(() => {
      const recorded: { title: string; tag?: string }[] = [];
      (window as unknown as { __notifications: typeof recorded }).__notifications = recorded;
      class RecordingNotification {
        onclick: (() => void) | null = null;
        close() {}
        constructor(title: string, options?: { tag?: string }) {
          recorded.push({ title, tag: options?.tag });
        }
        static permission = "granted";
        static requestPermission = async () => "granted" as const;
      }
      Object.defineProperty(window, "Notification", {
        configurable: true,
        value: RecordingNotification,
      });
    });

  const recorded = (page: import("@playwright/test").Page) =>
    page.evaluate(() => (window as unknown as { __notifications: unknown[] }).__notifications);

  test("a visible finish alerts without a notification", async ({ page, open, consoleErrors }) => {
    await page.clock.install();
    await installRecorder(page);

    await open();
    await page.getByRole("button", { name: "5m", exact: true }).click();
    await page.getByRole("button", { name: "Start" }).click();
    await page.clock.fastForward("05:01");

    await expect(page.getByTestId("clock-slot")).toContainText("00:00");
    expect(await recorded(page)).toEqual([]);
    expect(consoleErrors).toEqual([]);
  });

  test("a hidden finish posts exactly one tagged notification", async ({ page, open }) => {
    await page.clock.install();
    await installRecorder(page);
    // Emulate a backgrounded tab without losing the page.
    await page.addInitScript(() => {
      Object.defineProperty(document, "visibilityState", {
        configurable: true,
        get: () => "hidden",
      });
    });

    await open();
    await page.getByRole("button", { name: "5m", exact: true }).click();
    await page.getByRole("button", { name: "Start" }).click();
    await page.clock.fastForward("05:01");

    await expect.poll(() => recorded(page)).toHaveLength(1);
    expect((await recorded(page))[0]).toMatchObject({ title: "GLU — time's up" });
  });

  test("stopping and restoring-expired never alert", async ({ page, open, seedStorage }) => {
    await page.clock.install({ time: new Date("2026-07-24T09:00:00Z") });
    await installRecorder(page);
    await page.addInitScript(() => {
      Object.defineProperty(document, "visibilityState", {
        configurable: true,
        get: () => "hidden",
      });
    });
    await seedStorage(
      seed({
        status: "running",
        endAt: new Date("2026-07-24T08:50:00Z").getTime(),
        remaining: 0,
        total: 10 * MINUTE,
        runId: "expired-alert",
        runningSince: new Date("2026-07-24T08:40:00Z").getTime(),
      }),
    );

    await open();
    await expect(page.getByTestId("clock-slot")).toContainText("00:00");
    expect(await recorded(page)).toEqual([]);
    // The restored-expired state raises the takeover; dismiss it first.
    await dismissTakeover(page);

    await page.getByRole("button", { name: "Start" }).click();
    await page.clock.fastForward("01:00");
    await page.getByRole("button", { name: "Stop" }).click();
    expect(await recorded(page)).toEqual([]);
  });
});

/* ------------------------------------------------------------------------- */
/* ADR 10 — hidden header drawer                                              */
/* ------------------------------------------------------------------------- */

test.describe("header drawer (ADR 10)", () => {
  test("is hidden by default and the arrow is the only new chrome", async ({ page, open }) => {
    await open();
    await expect(page.getByRole("button", { name: "Open header" })).toBeVisible();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    // The relocated theme control exists nowhere else.
    await expect(page.getByRole("button", { name: /Switch to (light|dark) theme/ })).toHaveCount(0);
  });

  test("opens with exactly three entries, GitHub linked safely", async ({ page, open }) => {
    await open();
    await page.getByRole("button", { name: "Open header" }).click();

    const drawer = page.getByRole("dialog");
    await expect(drawer).toBeVisible();

    const github = drawer.getByRole("link", { name: /GitHub/ });
    await expect(github).toHaveAttribute("href", "https://github.com/ioandev/glu");
    await expect(github).toHaveAttribute("target", "_blank");
    await expect(github).toHaveAttribute("rel", "noopener noreferrer");
    await expect(drawer.getByText("Appearance")).toBeVisible();
    await expect(drawer.getByText("Settings")).toBeVisible();
  });

  test("the drawer's theme row flips the scheme and the choice survives a reload", async ({
    page,
    open,
  }) => {
    await open();
    const before = await page.locator("html").getAttribute("data-mantine-color-scheme");

    await page.getByRole("button", { name: "Open header" }).click();
    await page.getByRole("dialog").getByText("Appearance").click();

    const after = await page.locator("html").getAttribute("data-mantine-color-scheme");
    expect(after).not.toBe(before);

    await page.reload({ waitUntil: "load" });
    await expect(page.locator("html")).toHaveAttribute("data-mantine-color-scheme", after!);
    // Hidden by default means every load, including this one.
    await expect(page.getByRole("dialog")).toHaveCount(0);
  });

  test("Settings opens a modal that Escape closes", async ({ page, open }) => {
    await open();
    await page.getByRole("button", { name: "Open header" }).click();
    await page.getByRole("dialog").getByText("Settings").click();

    await expect(page.getByRole("button", { name: "Close settings" })).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("button", { name: "Close settings" })).toHaveCount(0);
  });

  test("a running timer keeps counting with the drawer open, hotkeys included", async ({
    page,
    open,
  }) => {
    await page.clock.install();
    await open();
    await page.getByRole("button", { name: "Start" }).click();
    await page.getByRole("button", { name: "Open header" }).click();

    await page.clock.fastForward("01:00");
    await page.keyboard.press("Escape");
    await expect(page.getByTestId("clock-slot")).toContainText("19:00");

    // ADR 06's keys still act on the timer with chrome open — a feature.
    await page.getByRole("button", { name: "Open header" }).click();
    await page.keyboard.press("p");
    await expect.poll(async () => (await readBlob(page))?.status).toBe("paused");
  });
});

/* ------------------------------------------------------------------------- */
/* ADR 11 — Todoist authentication                                            */
/* ------------------------------------------------------------------------- */

test.describe("Todoist auth (ADR 11)", () => {
  /**
   * `/status` is stubbed with `page.route`. A full real-IdP OAuth round trip is
   * explicitly not E2E-automatable — recorded in the ADR, deferred to a human.
   */
  const stubStatus = (
    page: import("@playwright/test").Page,
    body: Record<string, unknown>,
  ) =>
    page.route("**/glu/api/auth/todoist/status", (route) =>
      route.fulfill({ json: body }),
    );

  test("shows only the login button when logged out", async ({ page, open }) => {
    await stubStatus(page, { authenticated: false });
    await open();

    const login = page.getByRole("link", { name: /Log in with Todoist/ });
    await expect(login).toBeVisible();
    await expect(login).toHaveAttribute("href", "/glu/api/auth/todoist/login");

    const box = (await login.boundingBox())!;
    expect(Math.min(box.width, box.height)).toBeGreaterThanOrEqual(44);
  });

  test("degrades to logged out with no Todoist app and with no server at all", async ({
    page,
    open,
    consoleErrors,
  }) => {
    // With an empty `backend/.env` the real server answers exactly this.
    await stubStatus(page, { authenticated: false });
    await open();
    await expect(page.getByRole("link", { name: /Log in with Todoist/ })).toBeVisible();

    // And with no API process at all.
    await page.unrouteAll();
    await page.route("**/glu/api/auth/todoist/status", (route) => route.abort());
    await page.reload({ waitUntil: "load" });
    await expect(page.getByRole("link", { name: /Log in with Todoist/ })).toBeVisible();
    // A missing Todoist app is a clean logged-out state, never an error screen.
    expect(consoleErrors).toEqual([]);
  });

  test("shows the account chip and logs out again", async ({ page, open }) => {
    await stubStatus(page, { authenticated: true, name: "Ioan", id: "42" });
    await page.route("**/glu/api/auth/todoist/logout", (route) =>
      route.fulfill({ json: { authenticated: false } }),
    );
    await open();

    const chip = page.getByRole("button", { name: "Todoist account: Ioan" });
    await expect(chip).toBeVisible();
    await chip.click();
    await page.getByRole("button", { name: "Log out" }).click();
    await expect(page.getByRole("link", { name: /Log in with Todoist/ })).toBeVisible();
  });

  test("no token material is readable from the page", async ({ page, open }) => {
    await stubStatus(page, { authenticated: true, name: "Ioan", id: "42" });
    await open();
    const leaked = await page.evaluate(() => ({
      cookie: document.cookie,
      storage: JSON.stringify(Object.entries(localStorage)),
    }));
    expect(leaked.cookie).not.toMatch(/glu_todoist/);
    expect(leaked.storage).not.toMatch(/access_?token/i);
  });
});

/* ------------------------------------------------------------------------- */
/* ADR 19 — Settings: Todoist log out / log in                                */
/* ------------------------------------------------------------------------- */

test.describe("settings (ADR 19)", () => {
  const stubStatus = (page: import("@playwright/test").Page, body: Record<string, unknown>) =>
    page.route("**/glu/api/auth/todoist/status", (route) => route.fulfill({ json: body }));

  const openSettings = async (page: import("@playwright/test").Page) => {
    await page.getByRole("button", { name: "Open header" }).click();
    await page.getByRole("dialog").getByText("Settings").click();
    await expect(page.getByRole("button", { name: "Close settings" })).toBeVisible();
  };

  test("logging out in Settings flips the top-right area without a reload", async ({
    page,
    open,
  }) => {
    await stubStatus(page, { authenticated: true, name: "Ioan", id: "42" });
    await page.route("**/glu/api/auth/todoist/logout", (route) =>
      route.fulfill({ json: { authenticated: false } }),
    );
    await open();
    await expect(page.getByRole("button", { name: "Todoist account: Ioan" })).toBeVisible();

    await openSettings(page);
    await page.getByRole("button", { name: "Log out" }).click();

    // The top-right region flips…
    await expect(
      page.getByLabel("Todoist area").getByRole("link", { name: /Log in with Todoist/ }),
    ).toBeVisible();
    // …and the modal stays open, now showing the branded login.
    await expect(page.getByRole("button", { name: "Close settings" })).toBeVisible();
    await expect(page.getByLabel("Todoist settings").getByRole("link")).toBeVisible();
  });

  test("the Settings login is the same branded control and the same URL", async ({
    page,
    open,
  }) => {
    await stubStatus(page, { authenticated: false });
    await open();
    await openSettings(page);

    const settingsLogin = page.getByLabel("Todoist settings").getByRole("link");
    await expect(settingsLogin).toHaveAttribute("href", "/glu/api/auth/todoist/login");
    await expect(settingsLogin).toHaveText(/Log in with Todoist/);
  });

  test("preferences survive a logout", async ({ page, open }) => {
    await stubStatus(page, { authenticated: true, name: "Ioan", id: "42" });
    await page.route("**/glu/api/auth/todoist/logout", (route) =>
      route.fulfill({ json: { authenticated: false } }),
    );
    await open();

    // Establish preferences that logout must not touch.
    await page.getByRole("button", { name: "Next clock design" }).click();
    const before = await readBlob(page);

    await openSettings(page);
    await page.getByRole("button", { name: "Log out" }).click();
    await expect(
      page.getByLabel("Todoist area").getByRole("link", { name: /Log in with Todoist/ }),
    ).toBeVisible();

    const after = await readBlob(page);
    expect(after).toEqual(before);
  });
});

/* ------------------------------------------------------------------------- */
/* ADR 12 — Todoist task view                                                 */
/* ------------------------------------------------------------------------- */

test.describe("task view (ADR 12)", () => {
  type Page = import("@playwright/test").Page;

  const loginAs = (page: Page) =>
    page.route("**/glu/api/auth/todoist/status", (route) =>
      route.fulfill({ json: { authenticated: true, name: "Ioan", id: "42" } }),
    );

  const stubLists = (page: Page) =>
    Promise.all([
      page.route("**/glu/api/todoist/projects", (route) =>
        route.fulfill({ json: { items: [{ id: "p1", name: "GLU" }] } }),
      ),
      page.route("**/glu/api/todoist/labels", (route) =>
        route.fulfill({ json: { items: [{ id: "l1", name: "deep-work" }] } }),
      ),
      page.route("**/glu/api/todoist/filters", (route) =>
        route.fulfill({ json: { items: [{ id: "f1", name: "Today", query: "today" }] } }),
      ),
      page.route("**/glu/api/todoist/sections**", (route) =>
        route.fulfill({
          json: {
            items: [
              { id: "s1", name: "Today", order: 1 },
              { id: "s2", name: "Later", order: 2 },
            ],
          },
        }),
      ),
    ]);

  const stubTasks = (page: Page, body: unknown) =>
    page.route("**/glu/api/todoist/tasks**", (route) => route.fulfill({ json: body }));

  test("logged out shows only the login button — no tools icon, no list", async ({
    page,
    open,
  }) => {
    await page.route("**/glu/api/auth/todoist/status", (route) =>
      route.fulfill({ json: { authenticated: false } }),
    );
    await open();

    await expect(page.getByRole("link", { name: /Log in with Todoist/ })).toBeVisible();
    await expect(page.getByRole("button", { name: "Choose task source" })).toHaveCount(0);
    await expect(page.getByTestId("task-hint")).toHaveCount(0);
  });

  test("picking a project renders its tasks grouped, and the choice survives a reload", async ({
    page,
    open,
  }) => {
    await loginAs(page);
    await stubLists(page);
    await stubTasks(page, {
      items: [
        { id: "3", title: "Someday", description: "", uiPriority: 4, sectionId: "s2", order: 0 },
        { id: "2", title: "Today task", description: "", uiPriority: 1, sectionId: "s1", order: 0 },
        { id: "1", title: "Loose task", description: "keeps its line", uiPriority: 3, sectionId: null, order: 0 },
      ],
      truncated: false,
      cap: 200,
    });
    await open();

    await expect(page.getByTestId("task-hint")).toBeVisible();
    await page.getByRole("button", { name: "Choose task source" }).click();
    await page.getByPlaceholder("Choose a project").click();
    await page.getByRole("option", { name: "GLU" }).click();

    await expect(page.getByTestId("task-card")).toHaveCount(3);
    const order = await page.getByTestId("task-card").allTextContents();
    expect(order[0]).toContain("Loose task");
    expect(order[1]).toContain("Today task");
    expect(order[2]).toContain("Someday");
    await expect(page.getByText("Today", { exact: true })).toBeVisible();

    await page.reload({ waitUntil: "load" });
    await expect(page.getByTestId("task-card")).toHaveCount(3);
    await expect.poll(async () => (await readBlob(page))?.todoistSource?.id).toBe("p1");
  });

  test("the refresh button refetches in place — no skeleton flash", async ({
    page,
    open,
    seedStorage,
  }) => {
    await loginAs(page);
    await stubLists(page);

    // The title is read at request time, so an extra focus-revalidate before
    // the click cannot race this test.
    let title = "Before refresh";
    await page.route("**/glu/api/todoist/tasks**", async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 500));
      return route.fulfill({
        json: {
          items: [{ id: "1", title, description: "", uiPriority: 4, sectionId: null, order: 0 }],
          truncated: false,
          cap: 200,
        },
      });
    });
    await seedStorage(seed({ todoistSource: { type: "project", id: "p1", name: "GLU" } }));
    await open();

    await expect(page.getByText("Before refresh")).toBeVisible();

    title = "After refresh";
    await page.getByRole("button", { name: "Refresh tasks" }).click();

    // In flight: the rendered list stays put and the control reports busy.
    await expect(page.getByTestId("task-refresh")).toHaveAttribute("aria-busy", "true");
    await expect(page.getByTestId("task-skeletons")).toHaveCount(0);
    await expect(page.getByText("Before refresh")).toBeVisible();

    await expect(page.getByText("After refresh")).toBeVisible();
    await expect(page.getByTestId("task-refresh")).toHaveAttribute("aria-busy", "false");
  });

  test("the 200-task cap is visible, not silent", async ({ page, open, seedStorage }) => {
    await loginAs(page);
    await stubLists(page);
    await stubTasks(page, {
      items: Array.from({ length: 5 }, (_, i) => ({
        id: String(i),
        title: `Task ${i}`,
        description: "",
        uiPriority: 4,
        sectionId: null,
        order: i,
      })),
      truncated: true,
      cap: 200,
    });
    await seedStorage(seed({ todoistSource: { type: "project", id: "p1", name: "GLU" } }));
    await open();

    await expect(page.getByTestId("task-truncation")).toHaveText("Showing first 200");
  });

  test("a source deleted upstream degrades to the hint", async ({ page, open, seedStorage }) => {
    await loginAs(page);
    await stubLists(page);
    await page.route("**/glu/api/todoist/tasks**", (route) =>
      route.fulfill({ status: 404, json: { error: "not_found" } }),
    );
    await seedStorage(seed({ todoistSource: { type: "project", id: "gone", name: "Deleted" } }));
    await open();

    await expect(page.getByTestId("task-hint")).toBeVisible();
    await expect(page.getByTestId("task-error")).toHaveCount(0);
  });

  test("the list scrolls internally and the page does not, at tablet width", async ({
    page,
    open,
    seedStorage,
  }, testInfo) => {
    test.skip(testInfo.project.name.includes("half-tablet"), "tablet-only contract");

    await loginAs(page);
    await stubLists(page);
    await stubTasks(page, {
      items: Array.from({ length: 40 }, (_, i) => ({
        id: String(i),
        title: `Task ${i}`,
        description: "",
        uiPriority: 4,
        sectionId: null,
        order: i,
      })),
      truncated: false,
      cap: 200,
    });
    await seedStorage(seed({ todoistSource: { type: "project", id: "p1", name: "GLU" } }));
    await open();

    await expect(page.getByTestId("task-list")).toBeVisible();
    const scrolls = await page.evaluate(() => {
      const list = document.querySelector('[data-testid="task-list"]')!;
      return {
        listScrolls: list.scrollHeight > list.clientHeight,
        pageScrolls: document.documentElement.scrollHeight > window.innerHeight,
      };
    });
    expect(scrolls.listScrolls).toBe(true);
    expect(scrolls.pageScrolls).toBe(false);
  });

  test("rapid source switching never shows the previous source's tasks", async ({
    page,
    open,
  }) => {
    await loginAs(page);
    await stubLists(page);

    // The big project answers slowly; the label answers instantly. Without the
    // abort, the slow response would land last and win.
    await page.route("**/glu/api/todoist/tasks**", async (route) => {
      const url = new URL(route.request().url());
      const type = url.searchParams.get("type");
      if (type === "project") {
        await new Promise((resolve) => setTimeout(resolve, 1200));
        return route.fulfill({
          json: {
            items: [
              { id: "big", title: "Slow project task", description: "", uiPriority: 4, sectionId: null, order: 0 },
            ],
            truncated: false,
            cap: 200,
          },
        });
      }
      return route.fulfill({
        json: {
          items: [
            { id: "small", title: "Fast label task", description: "", uiPriority: 4, sectionId: null, order: 0 },
          ],
          truncated: false,
          cap: 200,
        },
      });
    });

    await open();
    await page.getByRole("button", { name: "Choose task source" }).click();
    await page.getByPlaceholder("Choose a project").click();
    await page.getByRole("option", { name: "GLU" }).click();

    await page.getByRole("button", { name: "Choose task source" }).click();
    await page.getByText("Label", { exact: true }).click();
    await page.getByPlaceholder("Choose a label").click();
    await page.getByRole("option", { name: "deep-work" }).click();

    await expect(page.getByText("Fast label task")).toBeVisible();
    await page.waitForTimeout(1500);
    await expect(page.getByText("Slow project task")).toHaveCount(0);
    await expect(page.getByText("Fast label task")).toBeVisible();
  });
});

/* ------------------------------------------------------------------------- */
/* ADR 13 — Todoist task detail (read-only)                                   */
/* ------------------------------------------------------------------------- */

test.describe("task detail (ADR 13)", () => {
  type Page = import("@playwright/test").Page;

  const PIXEL = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
    "base64",
  );

  const stubEverything = async (page: Page, overrides: { taskStatus?: number } = {}) => {
    await page.route("**/glu/api/auth/todoist/status", (route) =>
      route.fulfill({ json: { authenticated: true, name: "Ioan", id: "42" } }),
    );
    await page.route("**/glu/api/todoist/sections**", (route) =>
      route.fulfill({ json: { items: [] } }),
    );
    await page.route("**/glu/api/todoist/tasks**", (route) =>
      route.fulfill({
        json: {
          items: [
            {
              id: "t1",
              title: "Fix the palette flash",
              description: "",
              uiPriority: 1,
              sectionId: null,
              order: 0,
            },
          ],
          truncated: false,
          cap: 200,
        },
      }),
    );
    await page.route("**/glu/api/todoist/task/**", (route) =>
      overrides.taskStatus === 404
        ? route.fulfill({ status: 404, json: { error: "not_found" } })
        : route.fulfill({
            json: {
              task: {
                id: "t1",
                title: "Fix the palette flash",
                description: "First line.\nSecond line.",
                uiPriority: 1,
                sectionId: null,
                order: 0,
              },
            },
          }),
    );
    await page.route("**/glu/api/todoist/comments**", (route) =>
      route.fulfill({
        json: {
          items: [
            {
              id: "c1",
              text: "Screenshot:",
              postedAt: "2026-07-24T09:12:00.000Z",
              postedByUid: "42",
              attachment: {
                kind: "image",
                fileName: "shot.png",
                fileType: "image/png",
                src: "/glu/api/todoist/attachment?url=https%3A%2F%2Ffiles.todoist.com%2Fshot.png",
                width: 800,
                height: 500,
              },
            },
          ],
          truncated: false,
          cap: 100,
        },
      }),
    );
    await page.route("**/glu/api/todoist/attachment**", (route) =>
      route.fulfill({ body: PIXEL, contentType: "image/png" }),
    );
  };

  const withSource = (patch: Record<string, unknown> = {}) =>
    seed({ todoistSource: { type: "project", id: "p1", name: "GLU" }, ...patch });

  test("opens from a card and shows the task, read-only", async ({
    page,
    open,
    seedStorage,
  }) => {
    await stubEverything(page);
    await seedStorage(withSource());
    await open();

    await page.getByRole("button", { name: /Open “Fix the palette flash”/ }).click();
    await expect(page.getByTestId("task-detail")).toBeVisible();
    await expect(page.getByTestId("detail-description")).toContainText("Second line.");
    await expect(page.getByTestId("comment")).toHaveCount(1);

    // ADR 13 shipped read-only; ADR 20 added exactly one write action here —
    // the priority circle. Nothing else in the detail mutates anything.
    await expect(page.getByRole("button", { name: /Edit|Delete|Reschedule/ })).toHaveCount(0);
  });

  test("every byte of a comment image is same-origin", async ({ page, open, seedStorage }) => {
    const external: string[] = [];
    page.on("request", (request) => {
      const host = new URL(request.url()).hostname;
      if (host.includes("todoist")) external.push(request.url());
    });

    await stubEverything(page);
    await seedStorage(withSource());
    await open();
    await page.getByRole("button", { name: /Open “Fix the palette flash”/ }).click();

    const image = page.getByTestId("comment-image");
    await expect(image).toBeVisible();
    await expect(image).toHaveAttribute("src", /^\/glu\/api\/todoist\/attachment/);
    expect(external).toEqual([]);
  });

  test("a task that vanished upstream shows the calm gone state", async ({
    page,
    open,
    seedStorage,
  }) => {
    await stubEverything(page, { taskStatus: 404 });
    await seedStorage(withSource());
    await open();

    await page.getByRole("button", { name: /Open “Fix the palette flash”/ }).click();
    await expect(page.getByTestId("detail-gone")).toBeVisible();
    await page.getByTestId("detail-gone").getByRole("button", { name: "Close" }).click();
    await expect(page.getByTestId("detail-gone")).toHaveCount(0);
  });

  test("the timer keeps counting while the detail is open, and a reload opens nothing", async ({
    page,
    open,
    seedStorage,
  }) => {
    await page.clock.install();
    await stubEverything(page);
    await seedStorage(withSource());
    await open();

    await page.getByRole("button", { name: "Start" }).click();
    await page.getByRole("button", { name: /Open “Fix the palette flash”/ }).click();
    await expect(page.getByTestId("task-detail")).toBeVisible();

    await page.clock.fastForward("01:00");
    await page.keyboard.press("Escape");
    await expect(page.getByTestId("clock-slot")).toContainText("19:00");

    await page.reload({ waitUntil: "load" });
    await expect(page.getByTestId("task-detail")).toHaveCount(0);
  });
});

/* ------------------------------------------------------------------------- */
/* ADR 14 — focused task and time comments                                    */
/* ------------------------------------------------------------------------- */

type Box = { x: number; y: number; width: number; height: number };

const overlaps = (a: Box, b: Box) =>
  a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;

test.describe("focused task time comments (ADR 14)", () => {
  type Page = import("@playwright/test").Page;

  const stubProxy = async (page: Page, posted: { body: unknown }[]) => {
    await page.route("**/glu/api/auth/todoist/status", (route) =>
      route.fulfill({ json: { authenticated: true, name: "Ioan", id: "42" } }),
    );
    await page.route("**/glu/api/todoist/sections**", (route) =>
      route.fulfill({ json: { items: [] } }),
    );
    await page.route("**/glu/api/todoist/tasks**", (route) =>
      route.fulfill({
        json: {
          items: [
            { id: "t1", title: "Ship ADR 14", description: "", uiPriority: 2, sectionId: null, order: 0 },
            { id: "t2", title: "Other task", description: "", uiPriority: 4, sectionId: null, order: 1 },
          ],
          truncated: false,
          cap: 200,
        },
      }),
    );
    let minutes = 0;
    await page.route("**/glu/api/todoist/task/*/time-total", (route) =>
      route.fulfill({ json: { minutes, counted: 1, ignored: 0, clamped: false } }),
    );
    await page.route("**/glu/api/todoist/comment", async (route) => {
      const body = route.request().postDataJSON();
      posted.push({ body });
      minutes += (body as { minutes: number }).minutes;
      await route.fulfill({ json: { posted: true } });
    });
  };

  const withSource = () =>
    seed({ todoistSource: { type: "project", id: "p1", name: "GLU" } });

  test("focusing pins the task above the list and removes it from the list", async ({
    page,
    open,
    seedStorage,
  }) => {
    await stubProxy(page, []);
    await seedStorage(withSource());
    await open();

    await expect(page.getByTestId("task-card")).toHaveCount(2);
    await page.getByRole("button", { name: /Focus “Ship ADR 14”/ }).click();

    await expect(page.getByTestId("focused-task")).toContainText("Ship ADR 14");
    await expect(page.getByTestId("task-card")).toHaveCount(1);
    await expect(page.getByTestId("task-card")).toContainText("Other task");

    await page.reload({ waitUntil: "load" });
    await expect(page.getByTestId("focused-task")).toContainText("Ship ADR 14");

    await page.getByRole("button", { name: /Unfocus/ }).click();
    await expect(page.getByTestId("task-card")).toHaveCount(2);
  });

  test("a qualifying run queues a comment, the undo bar appears, and Undo cancels it", async ({
    page,
    open,
    seedStorage,
  }) => {
    const posted: { body: unknown }[] = [];
    await page.clock.install();
    await stubProxy(page, posted);
    await seedStorage(withSource());
    await open();

    await page.getByRole("button", { name: /Focus “Ship ADR 14”/ }).click();
    await page.getByRole("button", { name: "Start" }).click();
    await page.clock.fastForward("05:00");
    await page.getByRole("button", { name: "Stop" }).click();

    const bar = page.getByTestId("undo-bar");
    await expect(bar).toBeVisible();
    await expect(bar).toContainText("[5m]");

    await bar.getByRole("button", { name: "Undo" }).click();
    await expect(bar).toHaveCount(0);

    // Nothing was ever sent: cancelling an unsent post needs no delete verb.
    await page.clock.fastForward("00:30");
    expect(posted).toEqual([]);
    await expect.poll(async () => (await readBlob(page))?.outbox).toEqual([]);
  });

  test("letting the grace lapse posts exactly one composed comment", async ({
    page,
    open,
    seedStorage,
  }) => {
    const posted: { body: unknown }[] = [];
    await page.clock.install();
    await stubProxy(page, posted);
    await seedStorage(withSource());
    await open();

    await page.getByRole("button", { name: /Focus “Ship ADR 14”/ }).click();
    await page.getByRole("button", { name: "Start" }).click();
    await page.clock.fastForward("07:00");
    await page.getByRole("button", { name: "Stop" }).click();

    await page.clock.fastForward("00:20");
    await expect.poll(() => posted.length).toBe(1);
    expect(posted[0].body).toEqual({ taskId: "t1", minutes: 7 });

    // The outbox drains, and the badge refreshes off the post.
    await expect.poll(async () => (await readBlob(page))?.outbox).toEqual([]);
    await expect(page.getByTestId("focused-total")).toContainText("[7m]");
  });

  test("a run under the threshold posts nothing at all", async ({
    page,
    open,
    seedStorage,
  }) => {
    const posted: { body: unknown }[] = [];
    await page.clock.install();
    await stubProxy(page, posted);
    await seedStorage(withSource());
    await open();

    await page.getByRole("button", { name: /Focus “Ship ADR 14”/ }).click();
    await page.getByRole("button", { name: "Start" }).click();
    await page.clock.fastForward("00:45");
    await page.getByRole("button", { name: "Stop" }).click();
    await page.clock.fastForward("00:20");

    await expect(page.getByTestId("undo-bar")).toHaveCount(0);
    expect(posted).toEqual([]);
  });

  test("finishing at 0:00 and `n` restart both post; 61 s posts [1m]", async ({
    page,
    open,
    seedStorage,
  }) => {
    const posted: { body: unknown }[] = [];
    await page.clock.install();
    await stubProxy(page, posted);
    await seedStorage(withSource());
    await open();

    await page.getByRole("button", { name: /Focus “Ship ADR 14”/ }).click();

    // Reaching 0:00.
    await page.getByRole("button", { name: "5m", exact: true }).click();
    await page.getByRole("button", { name: "Start" }).click();
    await page.clock.fastForward("05:01");
    await page.clock.fastForward("00:20");
    await expect.poll(() => posted.length).toBe(1);
    expect(posted[0].body).toEqual({ taskId: "t1", minutes: 5 });
    await dismissTakeover(page);

    // `n` restart: abandons the session count but still posts the attention.
    await page.getByRole("button", { name: "Start" }).click();
    await page.clock.fastForward("03:00");
    await page.keyboard.press("n");
    await page.clock.fastForward("00:20");
    await expect.poll(() => posted.length).toBe(2);
    expect(posted[1].body).toEqual({ taskId: "t1", minutes: 3 });

    // 61 seconds is the smallest qualifying run.
    await page.getByRole("button", { name: "Stop" }).click();
    await page.getByRole("button", { name: "Start" }).click();
    await page.clock.fastForward(61_000);
    await page.getByRole("button", { name: "Stop" }).click();
    await page.clock.fastForward("00:20");
    await expect.poll(() => posted.length).toBe(3);
    expect(posted[2].body).toEqual({ taskId: "t1", minutes: 1 });
  });

  test("a second run end during the grace commits the first immediately", async ({
    page,
    open,
    seedStorage,
  }) => {
    const posted: { body: unknown }[] = [];
    await page.clock.install();
    await stubProxy(page, posted);
    await seedStorage(withSource());
    await open();

    await page.getByRole("button", { name: /Focus “Ship ADR 14”/ }).click();

    await page.getByRole("button", { name: "Start" }).click();
    await page.clock.fastForward("04:00");
    await page.getByRole("button", { name: "Stop" }).click();
    await expect(page.getByTestId("undo-bar")).toContainText("[4m]");

    // Second qualifying end, still inside the first one's grace.
    await page.getByRole("button", { name: "Start" }).click();
    await page.clock.fastForward("02:00");
    await page.getByRole("button", { name: "Stop" }).click();

    // The displaced entry commits at once; the bar now offers the newer one.
    await expect.poll(() => posted.length).toBe(1);
    expect(posted[0].body).toEqual({ taskId: "t1", minutes: 4 });
    await expect(page.getByTestId("undo-bar")).toContainText("[2m]");
  });

  test("reloading during the grace posts once — closing the site is not an undo", async ({
    page,
    open,
    seedStorage,
  }) => {
    const posted: { body: unknown }[] = [];
    await page.clock.install();
    await stubProxy(page, posted);
    await seedStorage(withSource());
    await open();

    await page.getByRole("button", { name: /Focus “Ship ADR 14”/ }).click();
    await page.getByRole("button", { name: "Start" }).click();
    await page.clock.fastForward("06:00");
    await page.getByRole("button", { name: "Stop" }).click();
    await expect(page.getByTestId("undo-bar")).toBeVisible();

    await page.reload({ waitUntil: "load" });
    // The undo opportunity lapsed with the navigation — tracked time must not
    // depend on a ten-second race.
    await page.clock.fastForward("00:20");
    await expect.poll(() => posted.length).toBe(1);
    expect(posted[0].body).toEqual({ taskId: "t1", minutes: 6 });
    await expect(page.getByTestId("undo-bar")).toHaveCount(0);
  });

  test("a failed post is retried once, never duplicated", async ({
    page,
    open,
    seedStorage,
  }) => {
    const posted: { body: unknown }[] = [];
    await page.clock.install();
    await stubProxy(page, posted);

    let failNext = true;
    await page.unroute("**/glu/api/todoist/comment");
    await page.route("**/glu/api/todoist/comment", async (route) => {
      if (failNext) {
        failNext = false;
        return route.fulfill({ status: 500, json: { error: "boom" } });
      }
      posted.push({ body: route.request().postDataJSON() });
      return route.fulfill({ json: { posted: true } });
    });

    await seedStorage(withSource());
    await open();
    await page.getByRole("button", { name: /Focus “Ship ADR 14”/ }).click();
    await page.getByRole("button", { name: "Start" }).click();
    await page.clock.fastForward("08:00");
    await page.getByRole("button", { name: "Stop" }).click();

    // First attempt fails; the entry stays queued and the badge says so.
    await page.clock.fastForward("00:15");
    await expect(page.getByTestId("focused-pending")).toContainText("1 comment pending");

    // A reload between failure and retry must not duplicate it.
    await page.reload({ waitUntil: "load" });
    await page.clock.fastForward("00:15");

    await expect.poll(() => posted.length).toBe(1);
    expect(posted[0].body).toEqual({ taskId: "t1", minutes: 8 });
    await expect(page.getByTestId("focused-pending")).toHaveCount(0);
  });

  test("the undo bar never covers the controls or the toggles", async ({
    page,
    open,
    seedStorage,
  }) => {
    await page.clock.install();
    await stubProxy(page, []);
    await seedStorage(withSource());
    await open();

    await page.getByRole("button", { name: /Focus “Ship ADR 14”/ }).click();
    await page.getByRole("button", { name: "Start" }).click();
    await page.clock.fastForward("05:00");
    await page.getByRole("button", { name: "Stop" }).click();

    // Below `sm` the page scrolls, so the worst case is the bottom of it: that
    // is where the reserved room has to actually be.
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));

    const bar = await page.getByTestId("undo-bar").boundingBox();
    expect(bar).not.toBeNull();

    // The controls themselves, not their containers: the bar is allowed to
    // float over empty padding, never over something you might need to press.
    for (const name of ["Start", "Stop", "Pause"]) {
      const button = await page.getByRole("button", { name, exact: true }).boundingBox();
      expect(overlaps(bar!, button!), `${name} must stay clear`).toBe(false);
    }
    for (const chip of ["Music", "Podcast", "TV", "Silence", "Noisy", "Headphones"]) {
      const box = await page.getByText(chip, { exact: true }).boundingBox();
      expect(overlaps(bar!, box!), `${chip} must stay clear`).toBe(false);
    }
  });

  test("with no focused task, nothing is posted for any run", async ({
    page,
    open,
    seedStorage,
  }) => {
    const posted: { body: unknown }[] = [];
    await page.clock.install();
    await stubProxy(page, posted);
    await seedStorage(withSource());
    await open();

    await page.getByRole("button", { name: "Start" }).click();
    await page.clock.fastForward("10:00");
    await page.getByRole("button", { name: "Stop" }).click();
    await page.clock.fastForward("00:20");

    expect(posted).toEqual([]);
  });
});

/* ------------------------------------------------------------------------- */
/* ADR 20 — Todoist task actions: complete + undo                             */
/* ------------------------------------------------------------------------- */

test.describe("task actions (ADR 20)", () => {
  type Page = import("@playwright/test").Page;

  interface Calls {
    close: string[];
    reopen: string[];
    comment: unknown[];
  }

  const stubProxy = async (
    page: Page,
    calls: Calls,
    options: { closeStatus?: number; closeDelayMs?: number } = {},
  ) => {
    await page.route("**/glu/api/auth/todoist/status", (route) =>
      route.fulfill({ json: { authenticated: true, name: "Ioan", id: "42" } }),
    );
    await page.route("**/glu/api/todoist/sections**", (route) =>
      route.fulfill({ json: { items: [] } }),
    );
    await page.route("**/glu/api/todoist/tasks**", (route) =>
      route.fulfill({
        json: {
          items: [
            { id: "t1", title: "Ship ADR 20", description: "", uiPriority: 1, sectionId: null, order: 0 },
            { id: "t2", title: "Other task", description: "", uiPriority: 4, sectionId: null, order: 1 },
          ],
          truncated: false,
          cap: 200,
        },
      }),
    );
    await page.route("**/glu/api/todoist/task/*/time-total", (route) =>
      route.fulfill({ json: { minutes: 0, counted: 0, ignored: 0, clamped: false } }),
    );
    await page.route("**/glu/api/todoist/comment", async (route) => {
      calls.comment.push(route.request().postDataJSON());
      await route.fulfill({ json: { posted: true } });
    });
    await page.route("**/glu/api/todoist/task/*/close", async (route) => {
      const id = new URL(route.request().url()).pathname.split("/").at(-2)!;
      calls.close.push(id);
      if (options.closeDelayMs) {
        await new Promise((resolve) => setTimeout(resolve, options.closeDelayMs));
      }
      if (options.closeStatus && options.closeStatus >= 400) {
        return route.fulfill({ status: options.closeStatus, json: { error: "boom" } });
      }
      return route.fulfill({ json: { closed: true } });
    });
    await page.route("**/glu/api/todoist/task/*/reopen", async (route) => {
      calls.reopen.push(new URL(route.request().url()).pathname.split("/").at(-2)!);
      return route.fulfill({ json: { reopened: true } });
    });
  };

  const withSource = () => seed({ todoistSource: { type: "project", id: "p1", name: "GLU" } });
  const noCalls = (): Calls => ({ close: [], reopen: [], comment: [] });

  test("the circle completes a card instantly, and Undo brings it back", async ({
    page,
    open,
    seedStorage,
  }) => {
    const calls = noCalls();
    // A slow close proves the removal does not wait for the network.
    await stubProxy(page, calls, { closeDelayMs: 800 });
    await seedStorage(withSource());
    await open();

    await expect(page.getByTestId("task-card")).toHaveCount(2);
    await page.getByRole("button", { name: /Complete “Ship ADR 20”/ }).click();

    await expect(page.getByTestId("task-card")).toHaveCount(1);
    await expect(page.getByTestId("undo-bar")).toContainText("Ship ADR 20");

    await page.getByTestId("undo-bar").getByRole("button", { name: "Undo" }).click();
    await expect(page.getByTestId("task-card")).toHaveCount(2);
    expect(calls.close).toEqual(["t1"]);
    expect(calls.reopen).toEqual(["t1"]);
  });

  test("letting the bar lapse fires no reopen", async ({ page, open, seedStorage }) => {
    const calls = noCalls();
    await page.clock.install();
    await stubProxy(page, calls);
    await seedStorage(withSource());
    await open();

    await page.getByRole("button", { name: /Complete “Ship ADR 20”/ }).click();
    await expect(page.getByTestId("undo-bar")).toBeVisible();

    await page.clock.fastForward("00:15");
    await expect(page.getByTestId("undo-bar")).toHaveCount(0);
    await expect(page.getByTestId("task-card")).toHaveCount(1);
    expect(calls.reopen).toEqual([]);
  });

  test("a failed close reverts the card in place with an error, and no undo bar", async ({
    page,
    open,
    seedStorage,
  }) => {
    const calls = noCalls();
    await stubProxy(page, calls, { closeStatus: 500 });
    await seedStorage(withSource());
    await open();

    await page.getByRole("button", { name: /Complete “Ship ADR 20”/ }).click();
    await expect(page.getByTestId("task-card-error")).toBeVisible();
    await expect(page.getByTestId("task-card")).toHaveCount(2);
    await expect(page.getByTestId("undo-bar")).toHaveCount(0);
  });

  test("a running timer is untouched by completing anything", async ({
    page,
    open,
    seedStorage,
  }) => {
    await page.clock.install();
    await stubProxy(page, noCalls());
    await seedStorage(withSource());
    await open();

    await page.getByRole("button", { name: "Start" }).click();
    await page.clock.fastForward("01:00");
    await page.getByRole("button", { name: /Complete “Ship ADR 20”/ }).click();
    await page.clock.fastForward("01:00");

    await expect(page.getByTestId("clock-slot")).toContainText("18:00");
    await expect.poll(async () => (await readBlob(page))?.status).toBe("running");
  });

  test("completing the focused task keeps it in the slot, then auto-unfocuses", async ({
    page,
    open,
    seedStorage,
  }) => {
    await page.clock.install();
    await stubProxy(page, noCalls());
    await seedStorage(withSource());
    await open();

    await page.getByRole("button", { name: /Focus “Ship ADR 20”/ }).click();
    await expect(page.getByTestId("focused-task")).toContainText("Ship ADR 20");

    await page
      .getByTestId("focused-task")
      .getByRole("button", { name: /Complete “Ship ADR 20”/ })
      .click();
    await expect(page.getByTestId("focused-task")).toBeVisible();
    await expect(page.getByTestId("undo-bar")).toBeVisible();

    await page.clock.fastForward("00:15");
    await expect(page.getByTestId("focused-task")).toHaveCount(0);
  });

  test("cross-type displacement commits a pending comment immediately", async ({
    page,
    open,
    seedStorage,
  }) => {
    const calls = noCalls();
    await page.clock.install();
    await stubProxy(page, calls);
    await seedStorage(withSource());
    await open();

    // A qualifying run puts a comment in its grace window…
    await page.getByRole("button", { name: /Focus “Ship ADR 20”/ }).click();
    await page.getByRole("button", { name: "Start" }).click();
    await page.clock.fastForward("04:00");
    await page.getByRole("button", { name: "Stop" }).click();
    await expect(page.getByTestId("undo-bar")).toContainText("[4m]");

    // …and completing another task displaces it, committing the comment.
    await page.getByRole("button", { name: /Complete “Other task”/ }).click();
    await expect(page.getByTestId("undo-bar")).toContainText("Completed · Other task");
    await expect.poll(() => calls.comment.length).toBe(1);
    expect(calls.comment[0]).toEqual({ taskId: "t1", minutes: 4 });
  });

  test("complete and focus targets are both ≥44px and never overlap", async ({
    page,
    open,
    seedStorage,
  }) => {
    await stubProxy(page, noCalls());
    await seedStorage(withSource());
    await open();

    const complete = await page
      .getByRole("button", { name: /Complete “Ship ADR 20”/ })
      .boundingBox();
    const focus = await page.getByRole("button", { name: /Focus “Ship ADR 20”/ }).boundingBox();

    for (const [name, box] of [["complete", complete], ["focus", focus]] as const) {
      expect(Math.min(box!.width, box!.height), `${name} target`).toBeGreaterThanOrEqual(44);
    }
    expect(overlaps(complete!, focus!)).toBe(false);
  });
});

/* ------------------------------------------------------------------------- */
/* ADR 21 — final-countdown takeover                                          */
/* ------------------------------------------------------------------------- */

test.describe("final-countdown takeover (ADR 21)", () => {
  const overlay = (page: import("@playwright/test").Page) =>
    page.getByTestId("takeover-overlay");

  test("engages at the 60 s mark and covers everything but the clock", async ({
    page,
    open,
  }) => {
    await page.clock.install();
    await open();

    await page.getByRole("button", { name: "5m", exact: true }).click();
    await page.getByRole("button", { name: "Start" }).click();
    await expect(overlay(page)).toHaveCount(0);

    await page.clock.fastForward("04:05");
    await expect(overlay(page)).toBeVisible();

    const layers = await page.evaluate(() => ({
      overlayZ: Number(
        getComputedStyle(document.querySelector('[data-testid="takeover-overlay"]')!).zIndex,
      ),
      clockZ: Number(
        getComputedStyle(document.querySelector('[data-testid="clock-slot"]')!).zIndex,
      ),
    }));
    expect(layers.clockZ).toBeGreaterThan(layers.overlayZ);
  });

  test("a tap where a control would be peeks instead of pressing it", async ({ page, open }) => {
    await page.clock.install();
    await open();

    await page.getByRole("button", { name: "5m", exact: true }).click();
    await page.getByRole("button", { name: "Start" }).click();
    await page.clock.fastForward("04:05");
    // Let the entrance sweep finish; only then is the overlay full-viewport.
    await page.clock.fastForward(1000);
    await expect(overlay(page)).toHaveAttribute("data-phase", "on");

    // Aim at the Stop button: the overlay takes the tap.
    const stop = (await page.getByRole("button", { name: "Stop" }).boundingBox())!;
    await page.mouse.click(stop.x + stop.width / 2, stop.y + stop.height / 2);

    await expect.poll(async () => (await readBlob(page))?.status).toBe("running");
    await expect(overlay(page)).toHaveCount(0);

    // During the peek the controls really work.
    await page.getByRole("button", { name: /Add 5 minutes/ }).click();
    await expect(page.getByTestId("clock-slot")).toContainText("05:5");
    await expect(overlay(page)).toHaveCount(0);
  });

  test("hotkeys work while covered, and pausing retracts it", async ({ page, open }) => {
    await page.clock.install();
    await open();

    await page.getByRole("button", { name: "5m", exact: true }).click();
    await page.getByRole("button", { name: "Start" }).click();
    await page.clock.fastForward("04:05");
    await page.clock.fastForward(1000);
    await expect(overlay(page)).toBeVisible();

    await page.keyboard.press("p");
    await expect.poll(async () => (await readBlob(page))?.status).toBe("paused");
    await expect(overlay(page)).toHaveCount(0);
  });

  test("a reload inside the final minute shows it immediately, and 0:00 keeps it", async ({
    page,
    open,
    seedStorage,
  }) => {
    await page.clock.install({ time: new Date("2026-07-24T09:00:00Z") });
    await seedStorage(
      seed({
        status: "running",
        endAt: new Date("2026-07-24T09:00:40Z").getTime(),
        remaining: 40_000,
        total: 20 * 60_000,
        runId: "seeded-run",
        runningSince: new Date("2026-07-24T08:41:00Z").getTime(),
      }),
    );

    await open();
    await expect(overlay(page)).toHaveAttribute("data-phase", "on");

    // Through 0:00 it persists — it *is* the distraction-free display.
    await page.clock.fastForward("00:45");
    await expect(page.getByTestId("clock-slot")).toContainText("00:00");
    await expect(overlay(page)).toBeVisible();

    // …and any tap dissolves it, permanently.
    await overlay(page).click({ position: { x: 20, y: 20 } });
    await expect(overlay(page)).toHaveCount(0);
    await page.clock.fastForward("00:10");
    await expect(overlay(page)).toHaveCount(0);
  });

  test("the undo bar outranks the takeover and stays operable", async ({
    page,
    open,
    seedStorage,
  }) => {
    await page.clock.install();
    await page.route("**/glu/api/auth/todoist/status", (route) =>
      route.fulfill({ json: { authenticated: true, name: "Ioan", id: "42" } }),
    );
    await page.route("**/glu/api/todoist/sections**", (route) =>
      route.fulfill({ json: { items: [] } }),
    );
    await page.route("**/glu/api/todoist/tasks**", (route) =>
      route.fulfill({
        json: {
          items: [
            { id: "t1", title: "Ship it", description: "", uiPriority: 1, sectionId: null, order: 0 },
          ],
          truncated: false,
          cap: 200,
        },
      }),
    );
    await page.route("**/glu/api/todoist/task/*/time-total", (route) =>
      route.fulfill({ json: { minutes: 0, counted: 0, ignored: 0, clamped: false } }),
    );
    await page.route("**/glu/api/todoist/comment", (route) =>
      route.fulfill({ json: { posted: true } }),
    );
    await seedStorage(
      seed({
        todoistSource: { type: "project", id: "p1", name: "GLU" },
        focusedTask: { id: "t1", title: "Ship it", priority: 1 },
      }),
    );

    await open();
    await page.getByRole("button", { name: "5m", exact: true }).click();
    await page.getByRole("button", { name: "Start" }).click();
    await page.clock.fastForward("05:01");

    // Finished: the takeover is up, and so is the run-end undo bar.
    await expect(overlay(page)).toBeVisible();
    const bar = page.getByTestId("undo-bar");
    await expect(bar).toBeVisible();

    const layers = await page.evaluate(() => ({
      overlayZ: Number(
        getComputedStyle(document.querySelector('[data-testid="takeover-overlay"]')!).zIndex,
      ),
      barZ: Number(getComputedStyle(document.querySelector('[data-testid="undo-bar"]')!).zIndex),
    }));
    // Aesthetics never outrank an expiring choice.
    expect(layers.barZ).toBeGreaterThan(layers.overlayZ);

    await bar.getByRole("button", { name: "Undo" }).click();
    await expect(bar).toHaveCount(0);
  });

  test("reduced motion crossfades instead of sweeping", async ({ page, open }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.clock.install();
    await open();

    await page.getByRole("button", { name: "5m", exact: true }).click();
    await page.getByRole("button", { name: "Start" }).click();
    await page.clock.fastForward("04:05");

    // Straight to `on`: no positional entrance phase at all.
    await expect(overlay(page)).toHaveAttribute("data-phase", "on");
    const transform = await overlay(page).evaluate((el) => getComputedStyle(el).transform);
    expect(["none", "matrix(1, 0, 0, 1, 0, 0)"]).toContain(transform);
  });
});
