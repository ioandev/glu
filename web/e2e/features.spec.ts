import { expect, readBlob, seed, test } from "./fixtures";
import { CLOCKS } from "@/clocks/registry";

const MINUTE = 60_000;

/**
 * A finished run raises ADR 21's takeover, which captures pointer events. Tests
 * that need to press a control afterwards dismiss it first.
 */
async function dismissTakeover(page: import("@playwright/test").Page) {
  const overlay = page.getByTestId("takeover-overlay");
  // Retry: the entrance sweep can still be settling when we arrive, and a click
  // mid-animation is swallowed. Poll until the overlay is genuinely gone.
  for (
    let attempt = 0;
    attempt < 5 && (await overlay.count()) > 0;
    attempt += 1
  ) {
    await tapClock(page).catch(() => {});
    await overlay.waitFor({ state: "detached", timeout: 1500 }).catch(() => {});
  }
  await expect(overlay).toHaveCount(0);
}

/**
 * Taps the clock itself — the gesture that dismisses a takeover at any width
 * (ADR 21 amendment). Aiming at the *overlay* only works where some of it is
 * still exposed: below `sm` the clock is the whole first viewport and rides
 * above it (ADR 08 × ADR 21), so there is no overlay pixel left to press.
 *
 * Scrolls to the top first: below `sm` the page scrolls, and a click that
 * reached a control lower down leaves the clock off-screen.
 */
async function tapClock(page: import("@playwright/test").Page) {
  await page.evaluate(() => window.scrollTo(0, 0));
  const box = (await page.getByTestId("clock-slot").boundingBox())!;
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
}

/** Mantine's `sm`, in px — the line the gallery chrome lives above (ADR 08). */
const SM_BREAKPOINT = 768;

/**
 * Flips one clock forward (`1`) or back (`-1`) the way this viewport can.
 *
 * Below `sm` there are no chevrons at all (ADR 08 amendment) — the swipe is the
 * only flip, which is what the half-tablet projects exercise for free by
 * running the same tests through here.
 */
async function flipClock(page: import("@playwright/test").Page, step: 1 | -1) {
  if ((page.viewportSize()?.width ?? 0) >= SM_BREAKPOINT) {
    const name = step === 1 ? "Next clock design" : "Previous clock design";
    await page.getByRole("button", { name }).click();
    return;
  }

  const box = (await page.getByTestId("clock-slot").boundingBox())!;
  const cx = box.x + box.width / 2;
  const cy = box.y + box.height / 2;
  await page.mouse.move(cx, cy);
  await page.mouse.down();
  // Dragging left moves forward through the registry, like a carousel.
  await page.mouse.move(cx - step * 120, cy, { steps: 8 });
  await page.mouse.up();
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
    await seedStorage(
      seed({ day: { startedAt: 1_700_000_000_000, sessions } }),
    );

    await open();
    await expect(page.getByTestId("session-count")).toHaveText("3 today");

    await page.getByRole("button", { name: "New day" }).click();
    await page.getByRole("button", { name: "Cancel" }).click();
    await expect(page.getByTestId("session-count")).toHaveText("3 today");

    await page.getByRole("button", { name: "New day" }).click();
    await page.getByRole("button", { name: "Reset" }).click();
    await expect(page.getByTestId("session-count")).toHaveText("0 today");
    await expect
      .poll(async () => (await readBlob(page))?.archive.length)
      .toBe(1);

    await page.reload({ waitUntil: "load" });
    await expect(page.getByTestId("session-count")).toHaveText("0 today");
    await expect
      .poll(async () => (await readBlob(page))?.archive.length)
      .toBe(1);
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

    // A transition writes the v2 blob back and drops v1. The restored blob is
    // running, so the primary transport button reads Pause (ADR 37).
    await page.getByRole("button", { name: "Pause" }).click();
    await expect
      .poll(() =>
        page.evaluate(() =>
          Object.keys(localStorage).filter((k) => k.startsWith("glu")),
        ),
      )
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

  test("s stops, p toggles, n restarts at the selected duration", async ({
    page,
    open,
  }) => {
    await open();
    await page.getByRole("button", { name: "Start" }).click();
    await page.clock.fastForward("00:20");

    await page.keyboard.press("p");
    await expect
      .poll(async () => (await readBlob(page))?.status)
      .toBe("paused");
    await page.keyboard.press("p");
    await expect
      .poll(async () => (await readBlob(page))?.status)
      .toBe("running");

    // `n` after a ± adjustment restarts at the *selected* duration.
    await page.getByRole("button", { name: /Add 5 minutes/ }).click();
    await page.keyboard.press("n");
    await expect(page.getByTestId("clock-slot")).toContainText("20:00");
    await expect(page.getByTestId("session-count")).toHaveText("0 today");

    await page.keyboard.press("s");
    await expect.poll(async () => (await readBlob(page))?.status).toBe("idle");
  });

  test("Ctrl+C stops only when nothing is selected", async ({ page, open }) => {
    /*
     * The selection is made in the **docs modal**, and it has to be: the app is
     * a touch surface, so `globals.css` turns `user-select` off for the whole
     * body and lifts it again only where copying is the point — the manual, the
     * legal pages, and a Todoist task's detail. Selecting the session count (as
     * this test used to) produces a *range* but an empty `toString()`, so it
     * was asserting a state the app cannot actually be in.
     *
     * Reading the manual mid-run and copying a line out of it is also the real
     * scenario the guard exists for.
     */
    await open();
    await page.getByRole("button", { name: "Start" }).click();
    await expect.poll(async () => (await readBlob(page))?.status).toBe("running");

    await page.getByRole("button", { name: "Open header" }).click();
    await page.getByRole("dialog").getByText("Docs").click();
    await page.getByTestId("docs-modal-body").waitFor();

    const selected = await page.evaluate(() => {
      const target = document.querySelector('[data-testid="docs-modal-body"] p');
      const range = document.createRange();
      range.selectNodeContents(target!);
      const selection = window.getSelection()!;
      selection.removeAllRanges();
      selection.addRange(range);
      return selection.toString();
    });
    // Guard the guard: an empty selection would make the next assertion pass
    // for the wrong reason, which is exactly how this test rotted before.
    expect(selected.length).toBeGreaterThan(0);

    await page.keyboard.press("Control+c");
    await expect.poll(async () => (await readBlob(page))?.status).toBe("running");

    // Nothing selected: the shortcut is the app's again.
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
    page.evaluate(
      () =>
        getComputedStyle(
          document.querySelector('[aria-label="Timer"]')!.parentElement!,
        ).backgroundColor,
    );

  test("@smoke flipping changes the clock and repaints the page, and survives a reload", async ({
    page,
    open,
  }) => {
    await open();
    await expect(page.getByTestId("clock-slot")).toHaveAttribute(
      "data-clock-id",
      "halo",
    );
    const before = await pageBackground(page);

    await flipClock(page, 1);
    await expect(page.getByTestId("clock-slot")).not.toHaveAttribute(
      "data-clock-id",
      "halo",
    );
    await expect.poll(() => pageBackground(page)).not.toBe(before);

    const chosen = await page
      .getByTestId("clock-slot")
      .getAttribute("data-clock-id");
    await page.reload({ waitUntil: "load" });
    await expect(page.getByTestId("clock-slot")).toHaveAttribute(
      "data-clock-id",
      chosen!,
    );
  });

  test("wraps at both ends", async ({ page, open }) => {
    /*
     * The two ends are **derived, never named** (ADR 42). This test used to
     * assert `"edge"` was the last design, which was true of a roster of
     * eighteen and quietly stopped being true twice — at ADR 42's forty and
     * again at ADR 45's eighty-six. A test that writes the roster down is the
     * same defect ADR 42 removed from the docs page and the stories.
     */
    const first = CLOCKS[0].id;
    const last = CLOCKS[CLOCKS.length - 1].id;

    await open();
    await flipClock(page, -1);
    await expect(page.getByTestId("clock-slot")).toHaveAttribute("data-clock-id", last);
    await flipClock(page, 1);
    await expect(page.getByTestId("clock-slot")).toHaveAttribute("data-clock-id", first);
  });

  test("an unknown clock id falls back to Halo", async ({
    page,
    open,
    seedStorage,
  }) => {
    await seedStorage(seed({ activeClockId: "not-a-clock" }));
    await open();
    await expect(page.getByTestId("clock-slot")).toHaveAttribute(
      "data-clock-id",
      "halo",
    );
  });

  test("a running timer keeps counting across flips", async ({
    page,
    open,
  }) => {
    await page.clock.install();
    await open();
    await page.getByRole("button", { name: "Start" }).click();
    await page.clock.fastForward("00:30");
    await flipClock(page, 1);
    await page.clock.fastForward("00:30");
    await expect(page.getByTestId("clock-slot")).toContainText("19:00");
  });

  test("the session display can be switched off and stays off", async ({
    page,
    open,
  }) => {
    await open();
    await expect(page.getByTestId("clock-session")).toBeVisible();
    await page.getByLabel("Show sessions").click();
    await expect(page.getByTestId("clock-session")).toHaveCount(0);
    await page.reload({ waitUntil: "load" });
    await expect(page.getByTestId("clock-session")).toHaveCount(0);
  });

  test("a horizontal swipe flips; a vertical drag never does", async ({
    page,
    open,
  }) => {
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

  /* ADR 08 amendment (2026-07-25) — full-bleed phone clock, quiet chevrons. */

  test("the gallery chrome matches the viewport", async ({ page, open }) => {
    await open();
    const next = page.getByRole("button", { name: "Next clock design" });

    if ((page.viewportSize()?.width ?? 0) >= SM_BREAKPOINT) {
      // Present enough to be found, quiet enough not to compete with the clock.
      await expect(next).toBeVisible();
      expect(await next.evaluate((el) => getComputedStyle(el).opacity)).toBe(
        "0.1",
      );
      return;
    }

    // Below `sm`: no chevrons, and the clock *is* the first viewport.
    await expect(next).toHaveCount(0);
    const viewport = page.viewportSize()!;
    const box = (await page.getByTestId("clock-slot").boundingBox())!;
    expect(Math.round(box.x)).toBe(0);
    expect(Math.round(box.y)).toBe(0);
    expect(Math.round(box.width)).toBe(viewport.width);
    expect(Math.round(box.height)).toBe(viewport.height);
  });

  test("the swipe hint shows once, then never again", async ({
    page,
    open,
  }) => {
    await open();
    const hint = page.getByTestId("swipe-hint");
    await expect(hint).toBeVisible();

    // It rides at the top of the clock — below `sm` that is the top of the page.
    const slot = (await page.getByTestId("clock-slot").boundingBox())!;
    const box = (await hint.boundingBox())!;
    expect(box.y).toBeLessThan(slot.y + 60);
    // And it is inert, so the gesture it teaches passes straight through it.
    expect(
      await hint.evaluate((el) => getComputedStyle(el).pointerEvents),
    ).toBe("none");

    await page.getByRole("button", { name: "Dismiss tip" }).click();
    await expect(hint).toHaveCount(0);

    await page.reload({ waitUntil: "load" });
    await expect(page.getByTestId("swipe-hint")).toHaveCount(0);
    expect(await readBlob(page)).toMatchObject({ swipeHintDismissed: true });
  });

  test("the scroll arrow points past the fold until the first run", async ({
    page,
    open,
  }) => {
    await open();
    const hint = page.getByTestId("scroll-hint");

    if ((page.viewportSize()?.width ?? 0) >= SM_BREAKPOINT) {
      // No page scroll up here (ADR 02's contract), so nothing to point at.
      expect(await hint.evaluate((el) => getComputedStyle(el).display)).toBe(
        "none",
      );
      return;
    }

    await expect(hint).toBeVisible();
    // It rides the bottom edge of the first viewport, and there is really more
    // page below it.
    const slot = (await page.getByTestId("clock-slot").boundingBox())!;
    const box = (await hint.boundingBox())!;
    expect(box.y + box.height).toBeLessThanOrEqual(slot.y + slot.height);
    expect(slot.y + slot.height - (box.y + box.height)).toBeLessThan(60);
    expect(
      await page.evaluate(() => document.documentElement.scrollHeight),
    ).toBeGreaterThan(page.viewportSize()!.height);
    // Inert, so the swipe it sits on top of passes straight through.
    expect(
      await hint.evaluate((el) => getComputedStyle(el).pointerEvents),
    ).toBe("none");

    await page.getByRole("button", { name: "Start" }).click();
    await expect(hint).toHaveCount(0);

    await page.reload({ waitUntil: "load" });
    await expect(page.getByTestId("scroll-hint")).toHaveCount(0);
    expect(await readBlob(page)).toMatchObject({ hasStartedRun: true });
  });

  /* ADR 25 — the flip slides. */

  test("a flip mounts a departing layer and settles back to one clock", async ({
    page,
    open,
  }) => {
    await open();
    const slot = page.getByTestId("clock-slot");
    const layers = slot.locator("[data-role]");
    await expect(layers).toHaveCount(1);

    await flipClock(page, 1);
    await expect(slot.locator('[data-role="leaving"]')).toHaveAttribute(
      "data-direction",
      "forward",
    );
    // The slide is clock-sized: the departing layer never escapes the slot.
    expect(await slot.evaluate((el) => getComputedStyle(el).overflowX)).toBe(
      "clip",
    );

    await expect(layers).toHaveCount(1);
  });

  test("a swipe whose release lands outside the slot still flips", async ({
    page,
    open,
  }) => {
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
  test("the manifest and icons are served under /glu, one notification-only worker registered", async ({
    page,
    open,
    request,
    baseURL,
  }) => {
    const manifestResponse = await request.get(
      new URL("manifest.webmanifest", baseURL).toString(),
    );
    expect(manifestResponse.status()).toBe(200);
    const manifest = await manifestResponse.json();
    expect(manifest.start_url).toContain("/glu");
    expect(manifest.display).toBe("standalone");

    // The launch path must land *inside* `scope` without a redirect. Next serves
    // the app at `/glu` and 308s `/glu/` onto it, so a `start_url` of `/glu/`
    // with a `scope` of `/glu/` launches out of scope — and Chrome answers an
    // out-of-scope WebAPK launch with its in-app toolbar (title + origin, ✕, ⋮)
    // instead of standalone. That shipped, and this is the tripwire (2026-07-25
    // amendment). Scope is a plain path prefix: `/glu/` does not contain `/glu`.
    const startUrl = new URL(manifest.start_url, baseURL).toString();
    const launch = await request.get(startUrl);
    expect(
      launch.status(),
      `${manifest.start_url} must serve the app directly`,
    ).toBe(200);
    expect(
      launch.url(),
      `${manifest.start_url} must not redirect on launch`,
    ).toBe(startUrl);
    const scopePath = new URL(manifest.scope, baseURL).pathname;
    expect(
      new URL(launch.url()).pathname.startsWith(scopePath),
      `${manifest.start_url} must be within scope ${manifest.scope}`,
    ).toBe(true);

    // Manifest-internal URLs are relative, so they resolve under /glu/ by spec.
    const purposes = (
      manifest.icons as { src: string; purpose: string; sizes: string }[]
    ).map((icon) => `${icon.sizes}:${icon.purpose}`);
    expect(purposes).toContain("192x192:any");
    expect(purposes).toContain("512x512:any");
    expect(purposes).toContain("512x512:maskable");

    for (const icon of manifest.icons as { src: string }[]) {
      const iconResponse = await request.get(
        new URL(icon.src, baseURL).toString(),
      );
      expect(iconResponse.status(), icon.src).toBe(200);
    }

    await open();
    // PWA = installable only, NOT offline. The law was "no service worker
    // anywhere" until ADR 33; now it is exactly one — the notification-only
    // worker — and "no fetch handler anywhere", asserted on its source below.
    await expect
      .poll(async () =>
        page.evaluate(async () =>
          "serviceWorker" in navigator
            ? (await navigator.serviceWorker.getRegistrations()).map(
                (r) => r.scope,
              )
            : [],
        ),
      )
      .toHaveLength(1);
    const [scope] = await page.evaluate(async () =>
      (await navigator.serviceWorker.getRegistrations()).map((r) => r.scope),
    );
    expect(new URL(scope).pathname).toBe("/glu/");

    // Two theme-color variants, emitted from the viewport export.
    const themeColors = await page.evaluate(() =>
      [...document.querySelectorAll('meta[name="theme-color"]')].map(
        (meta) => ({
          media: meta.getAttribute("media"),
          content: meta.getAttribute("content"),
        }),
      ),
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
      expect(
        new URL(href).pathname,
        `${rel} must carry the basePath`,
      ).toContain("/glu/");
      const response = await request.get(href);
      expect(response.status(), `${rel} → ${href}`).toBe(200);
    }
  });

  test("the service worker is notification-only — no fetch handler, ever (ADR 33)", async ({
    request,
    baseURL,
  }) => {
    // The machine-checkable form of ADR 04's surviving law: installable, not
    // offline. A fetch listener appearing in this file is offline machinery
    // arriving without its ADR.
    const response = await request.get(new URL("sw.js", baseURL).toString());
    expect(response.status()).toBe(200);
    expect(response.headers()["content-type"]).toContain("javascript");
    const source = await response.text();
    expect(source).toContain("notificationclick");
    expect(source, "sw.js must never register a fetch handler").not.toMatch(
      /addEventListener\(\s*["']fetch["']/,
    );
    expect(source, "sw.js must never assign an onfetch handler").not.toMatch(
      /\bonfetch\b/,
    );
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
      Reflect.deleteProperty(
        navigator as unknown as Record<string, unknown>,
        "wakeLock",
      );
    });

    await open();
    await page.getByRole("button", { name: "Start" }).click();
    await page.clock.fastForward("01:00");
    await expect(page.getByTestId("clock-slot")).toContainText("19:00");
    await page.getByRole("button", { name: "Stop" }).click();
    await expect(page.getByTestId("clock-slot")).toContainText("20:00");

    expect(consoleErrors).toEqual([]);
  });

  test("a rejecting request() changes nothing", async ({
    page,
    open,
    consoleErrors,
  }) => {
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
      const recorded: { title: string; tag?: string; via?: "page" | "sw" }[] =
        [];
      (
        window as unknown as { __notifications: typeof recorded }
      ).__notifications = recorded;
      class RecordingNotification {
        onclick: (() => void) | null = null;
        close() {}
        constructor(title: string, options?: { tag?: string }) {
          recorded.push({ title, tag: options?.tag, via: "page" });
        }
        static permission = "granted";
        static requestPermission = async () => "granted" as const;
      }
      Object.defineProperty(window, "Notification", {
        configurable: true,
        value: RecordingNotification,
      });
      // ADR 33 made the alert path SW-first, and in real Chromium the worker
      // does register — the hidden-finish notification now flows through
      // `registration.showNotification`, not the constructor. Both paths
      // record into the same ledger, so each spec asserts whichever path the
      // browser actually took.
      const registrationProto = (
        window as unknown as {
          ServiceWorkerRegistration?: { prototype: Record<string, unknown> };
        }
      ).ServiceWorkerRegistration?.prototype;
      if (registrationProto) {
        registrationProto.showNotification = async (
          title: string,
          options?: { tag?: string },
        ) => {
          recorded.push({ title, tag: options?.tag, via: "sw" });
        };
        registrationProto.getNotifications = async () => [];
      }
    });

  const recorded = (page: import("@playwright/test").Page) =>
    page.evaluate(
      () =>
        (window as unknown as { __notifications: unknown[] }).__notifications,
    );

  test("a visible finish alerts without a notification", async ({
    page,
    open,
    consoleErrors,
  }) => {
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

  test("a hidden finish posts exactly one tagged notification", async ({
    page,
    open,
  }) => {
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
    // The alert path is SW-first (ADR 33); waiting for the worker to activate
    // pins which path fires, so `via` below is an assertion, not a coin toss.
    await expect
      .poll(() =>
        page.evaluate(async () =>
          Boolean(
            (await navigator.serviceWorker.getRegistration("/glu/"))?.active,
          ),
        ),
      )
      .toBe(true);
    await page.getByRole("button", { name: "5m", exact: true }).click();
    await page.getByRole("button", { name: "Start" }).click();
    await page.clock.fastForward("05:01");

    await expect.poll(() => recorded(page)).toHaveLength(1);
    expect((await recorded(page))[0]).toMatchObject({
      title: "GLU — time’s up",
      via: "sw",
    });
  });

  test("without a service worker the hidden finish falls back to the page constructor", async ({
    page,
    open,
    consoleErrors,
  }) => {
    await page.clock.install();
    await installRecorder(page);
    await page.addInitScript(() => {
      Object.defineProperty(document, "visibilityState", {
        configurable: true,
        get: () => "hidden",
      });
      // The accessor lives on the prototype — deleting it there is what
      // actually removes the API (an instance delete is a silent no-op).
      Reflect.deleteProperty(Navigator.prototype, "serviceWorker");
    });

    await open();
    await page.getByRole("button", { name: "5m", exact: true }).click();
    await page.getByRole("button", { name: "Start" }).click();
    await page.clock.fastForward("05:01");

    await expect.poll(() => recorded(page)).toHaveLength(1);
    expect((await recorded(page))[0]).toMatchObject({
      title: "GLU — time’s up",
      tag: "glu-session-end",
      via: "page",
    });
    expect(consoleErrors).toEqual([]);
  });

  test("stopping and restoring-expired never alert", async ({
    page,
    open,
    seedStorage,
  }) => {
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

  test("the permission ask rides the start gesture, never the pause (ADR 37)", async ({
    page,
    open,
  }) => {
    await page.clock.install();
    // Permission still `default`, so the ask is live; count the calls.
    await page.addInitScript(() => {
      (window as unknown as { __asks: number }).__asks = 0;
      class CountingNotification {
        close() {}
        static permission = "default";
        static requestPermission = async () => {
          (window as unknown as { __asks: number }).__asks += 1;
          return "default" as const;
        };
      }
      Object.defineProperty(window, "Notification", {
        configurable: true,
        value: CountingNotification,
      });
    });
    const asks = () =>
      page.evaluate(() => (window as unknown as { __asks: number }).__asks);

    await open();
    expect(await asks()).toBe(0);

    await page.getByRole("button", { name: "Start" }).click();
    expect(await asks()).toBe(1);

    // The same button, now a Pause: no AudioContext to prime, nothing to ask.
    await page.getByRole("button", { name: "Pause" }).click();
    expect(await asks()).toBe(1);
  });
});

/* ------------------------------------------------------------------------- */
/* ADR 40 — the sound library and how long it plays                           */
/* ------------------------------------------------------------------------- */

test.describe("alert sounds (ADR 40)", () => {
  /**
   * Records what WebAudio was *asked* to play. Headless Chromium has an
   * AudioContext but no ears, so the ledger of oscillator frequencies and start
   * times is the only observable the sound has — and the master gain's ramp to
   * zero is the observable for stopping one.
   */
  const installAudioRecorder = (page: import("@playwright/test").Page) =>
    page.addInitScript(() => {
      type Tone = { frequency: number; at: number };
      const tones: Tone[] = [];
      const state = { tones, stops: 0 };
      (window as unknown as { __audio: typeof state }).__audio = state;

      class RecordingContext {
        state = "running";
        currentTime = 0;
        destination = { id: "destination" };
        resume() {
          return Promise.resolve();
        }
        createOscillator() {
          const tone: Tone = { frequency: 0, at: -1 };
          return {
            type: "sine",
            frequency: {
              get value() {
                return tone.frequency;
              },
              set value(hz: number) {
                tone.frequency = hz;
              },
            },
            connect: (next: unknown) => next,
            start: (at: number) => {
              tone.at = at;
              tones.push(tone);
            },
            stop: () => {},
          };
        }
        createGain() {
          return {
            gain: {
              value: 1,
              setValueAtTime: () => {},
              exponentialRampToValueAtTime: () => {},
              linearRampToValueAtTime: (target: number) => {
                if (target === 0) state.stops += 1;
              },
              cancelScheduledValues: () => {},
            },
            connect: (next: unknown) => next,
          };
        }
      }

      for (const key of ["AudioContext", "webkitAudioContext"]) {
        Object.defineProperty(window, key, {
          configurable: true,
          value: RecordingContext,
        });
      }
    });

  const audio = (page: import("@playwright/test").Page) =>
    page.evaluate(
      () =>
        (
          window as unknown as {
            __audio: {
              tones: { frequency: number; at: number }[];
              stops: number;
            };
          }
        ).__audio,
    );

  const clearAudio = (page: import("@playwright/test").Page) =>
    page.evaluate(() => {
      const state = (
        window as unknown as { __audio: { tones: unknown[]; stops: number } }
      ).__audio;
      state.tones.length = 0;
      state.stops = 0;
    });

  const openSettings = async (page: import("@playwright/test").Page) => {
    await page.getByRole("button", { name: "Open header" }).click();
    await page.getByRole("dialog").getByText("Settings").click();
    await expect(
      page.getByRole("button", { name: "Close settings" }),
    ).toBeVisible();
    return page.getByRole("dialog").last();
  };

  test("the chosen sound and length are what a finish plays", async ({
    page,
    open,
  }) => {
    await page.clock.install();
    await installAudioRecorder(page);
    await open();

    const settings = await openSettings(page);
    // Choosing is hearing: the tap that selects Wood also plays it.
    await settings.getByRole("radio", { name: "Wood" }).click();
    await expect
      .poll(async () => (await audio(page)).tones.map((t) => t.frequency))
      .toEqual([880, 1320]);

    await clearAudio(page);
    // Mantine's rungs are transparent inputs under labels — the label is the
    // clickable surface (the ADR 28 precedent).
    await settings
      .getByTestId("setting-alert-duration")
      .getByText("5 s", { exact: true })
      .click();
    // Wood's period is one second, so five seconds is five repeats of two hits.
    await expect.poll(async () => (await audio(page)).tones.length).toBe(10);

    await page.getByRole("button", { name: "Close settings" }).click();
    // One Escape closes the drawer behind it, or its overlay eats every click
    // meant for the timer.
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await clearAudio(page);

    await page.getByRole("button", { name: "5m", exact: true }).click();
    await page.getByRole("button", { name: "Start" }).click();
    await page.clock.fastForward("05:01");
    await expect(page.getByTestId("clock-slot")).toContainText("00:00");

    const played = await audio(page);
    expect(played.tones).toHaveLength(10);
    expect(new Set(played.tones.map((t) => t.frequency))).toEqual(
      new Set([880, 1320]),
    );
    // Five starts, one second apart — the repeats the rung asked for.
    expect(
      played.tones
        .filter((t) => t.frequency === 880)
        .map((t) => Math.round(t.at)),
    ).toEqual([0, 1, 2, 3, 4]);

    // Both fields ride the additive-blob pattern: same key, no version bump.
    const blob = await readBlob(page);
    expect(blob).toMatchObject({
      alertSoundId: "wood",
      alertDurationSeconds: 5,
    });
  });

  test("the defaults are ADR 18's chime, once", async ({ page, open }) => {
    await page.clock.install();
    await installAudioRecorder(page);
    await open();

    await page.getByRole("button", { name: "5m", exact: true }).click();
    await page.getByRole("button", { name: "Start" }).click();
    await page.clock.fastForward("05:01");

    const played = await audio(page);
    expect(played.tones.map((t) => t.frequency)).toEqual([660, 990]);
  });

  test("a transport press cuts a long alert short", async ({ page, open }) => {
    await page.clock.install();
    await installAudioRecorder(page);
    await open();

    const settings = await openSettings(page);
    await settings
      .getByTestId("setting-alert-duration")
      .getByText("20 s", { exact: true })
      .click();
    await page.getByRole("button", { name: "Close settings" }).click();
    // One Escape closes the drawer behind it, or its overlay eats every click
    // meant for the timer.
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await clearAudio(page);

    await page.getByRole("button", { name: "5m", exact: true }).click();
    await page.getByRole("button", { name: "Start" }).click();
    await page.clock.fastForward("05:01");
    await expect
      .poll(async () => (await audio(page)).tones.length)
      .toBeGreaterThan(2);

    // Pressing a transport control is the acknowledgment — the sound stops.
    // The key rather than the button: at 00:00 ADR 21's takeover is sitting
    // over the transport row, and the hotkey hook is the second edge the stop
    // is wired at anyway.
    await page.keyboard.press("s");
    await expect.poll(async () => (await audio(page)).stops).toBeGreaterThan(0);
  });

  test("leaving Settings stops a preview in flight", async ({ page, open }) => {
    await page.clock.install();
    await installAudioRecorder(page);
    await open();

    const settings = await openSettings(page);
    await settings
      .getByTestId("setting-alert-duration")
      .getByText("20 s", { exact: true })
      .click();
    await settings.getByRole("radio", { name: "Deep" }).click();
    await clearAudio(page);

    await page.getByRole("button", { name: "Close settings" }).click();
    await expect.poll(async () => (await audio(page)).stops).toBeGreaterThan(0);
  });

  /* ADR 41 — how many times GLU may raise the prompt by itself, and the door
     that stays open once it may not. A real permission dialog is not
     automatable, so the observable is a recorder standing in for the browser:
     it counts the asks and answers every one of them the way a *dismissal*
     does — by leaving the permission at `default`, which is the exact case
     ADR 18's "asked once" guard never covered. */
  const installPermissionRecorder = (page: import("@playwright/test").Page) =>
    page.addInitScript(() => {
      const state = { asks: 0 };
      (window as unknown as { __permission: typeof state }).__permission =
        state;
      Object.defineProperty(window, "Notification", {
        configurable: true,
        value: {
          get permission() {
            return "default";
          },
          requestPermission: () => {
            state.asks += 1;
            // Never resolves — a real prompt sits there until the user deals
            // with it, and ADR 18's rule is that the timer does not wait for
            // them. A promise that resolves instantly would hide a regression
            // that made the Start gesture await this.
            return new Promise<NotificationPermission>(() => {});
          },
        },
      });
    });

  const asks = (page: import("@playwright/test").Page) =>
    page.evaluate(
      () =>
        (window as unknown as { __permission: { asks: number } }).__permission
          .asks,
    );

  test("asks three times, then only Settings can (ADR 41)", async ({
    page,
    open,
  }) => {
    await installPermissionRecorder(page);
    await open();

    for (let attempt = 0; attempt < 5; attempt += 1) {
      await page.getByRole("button", { name: "Start" }).click();
      // The prompt is still open (the stub never answers) and the run is
      // already going: ADR 18's un-awaited ask, re-verified under the budget.
      await expect(page.getByRole("button", { name: "Pause" })).toBeVisible();
      await page.getByRole("button", { name: "Stop" }).click();
    }

    // Five Starts, three asks: before this ADR it was five.
    await expect.poll(() => asks(page)).toBe(3);
    expect(await readBlob(page)).toMatchObject({ alertPromptsUsed: 3 });

    const settings = await openSettings(page);
    await settings.getByTestId("setting-notify-on-end").click();

    // The door still opens with the budget spent — and costs nothing.
    await expect.poll(() => asks(page)).toBe(4);
    expect(await readBlob(page)).toMatchObject({ alertPromptsUsed: 3 });
  });

  test("the row repaints live when the browser flips the permission (ADR 41)", async ({
    page,
    open,
    context,
    baseURL,
    browserName,
  }) => {
    // Playwright cannot flip a WebKit permission mid-page (the change event
    // never fires — probed, not assumed). WebKit users are covered by the
    // remount floor: Settings mounts on open and reads fresh.
    test.skip(browserName === "webkit", "no live permission flips in WebKit");

    // Headless Chromium hard-codes `Notification.permission` to "denied"
    // whatever the context granted, while `permissions.query` tracks the real
    // grant and fires real `change` events. The shim makes the static read
    // mirror the query state, so the row sees what a headed browser shows —
    // everything this test exercises (the browser's change event, the hook's
    // subscription, the repaint) stays real.
    await page.addInitScript(() => {
      let current: NotificationPermission = "default";
      // The app must share the shim's PermissionStatus object: listeners on
      // one EventTarget fire in registration order, so the shim's sync (added
      // at resolve, long before Settings opens) always updates `current`
      // before the app's own change listener re-reads it. Separate status
      // objects have no such ordering — probed: the app's fired first and the
      // repaint read a stale value.
      const realQuery = navigator.permissions.query.bind(navigator.permissions);
      let shared: Promise<PermissionStatus> | null = null;
      navigator.permissions.query = (descriptor: PermissionDescriptor) => {
        if (descriptor?.name !== ("notifications" as PermissionName))
          return realQuery(descriptor);
        shared ??= realQuery(descriptor).then((status) => {
          const sync = () => {
            current = status.state === "prompt" ? "default" : status.state;
          };
          sync();
          status.addEventListener("change", sync);
          return status;
        });
        return shared;
      };
      class LiveNotification {
        static get permission() {
          return current;
        }
        static requestPermission = async () => current;
      }
      Object.defineProperty(window, "Notification", {
        configurable: true,
        value: LiveNotification,
      });
    });

    await open();
    const settings = await openSettings(page);
    const toggle = settings.getByTestId("setting-notify-on-end");
    await expect(toggle).not.toBeChecked();

    // The browser's site-settings toggle, flipped while Settings stays open:
    // the switch must follow it on with no remount and no tap.
    await context.grantPermissions(["notifications"], {
      origin: new URL(baseURL!).origin,
    });
    await expect(toggle).toBeChecked();

    // And back: revoking turns it off again, live.
    await context.clearPermissions();
    await expect(toggle).not.toBeChecked();
  });
});

/* ------------------------------------------------------------------------- */
/* ADR 10 — hidden header drawer                                              */
/* ------------------------------------------------------------------------- */

test.describe("header drawer (ADR 10)", () => {
  test("is hidden by default and the arrow is the only new chrome", async ({
    page,
    open,
  }) => {
    await open();
    await expect(
      page.getByRole("button", { name: "Open header" }),
    ).toBeVisible();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    // The relocated theme control exists nowhere else.
    await expect(
      page.getByRole("button", { name: /Switch to (light|dark) theme/ }),
    ).toHaveCount(0);
  });

  // ADR 10 said "exactly three entries"; ADR 26 amended it to three *action
  // rows* plus a legal footer, and ADR 29 added a fourth row (Docs). The footer
  // and the Docs modal are asserted in their own blocks below.
  test("opens with exactly four action rows, GitHub linked safely", async ({
    page,
    open,
  }) => {
    await open();
    await page.getByRole("button", { name: "Open header" }).click();

    const drawer = page.getByRole("dialog");
    await expect(drawer).toBeVisible();

    const github = drawer.getByRole("link", { name: /GitHub/ });
    await expect(github).toHaveAttribute(
      "href",
      "https://github.com/ioandev/glu",
    );
    await expect(github).toHaveAttribute("target", "_blank");
    await expect(github).toHaveAttribute("rel", "noopener noreferrer");
    await expect(drawer.getByText("Appearance")).toBeVisible();
    await expect(drawer.getByText("Docs")).toBeVisible();
    await expect(drawer.getByText("Settings")).toBeVisible();
  });

  test("the drawer's theme row flips the scheme and the choice survives a reload", async ({
    page,
    open,
  }) => {
    await open();
    const before = await page
      .locator("html")
      .getAttribute("data-mantine-color-scheme");

    await page.getByRole("button", { name: "Open header" }).click();
    await page.getByRole("dialog").getByText("Appearance").click();

    const after = await page
      .locator("html")
      .getAttribute("data-mantine-color-scheme");
    expect(after).not.toBe(before);

    await page.reload({ waitUntil: "load" });
    await expect(page.locator("html")).toHaveAttribute(
      "data-mantine-color-scheme",
      after!,
    );
    // Hidden by default means every load, including this one.
    await expect(page.getByRole("dialog")).toHaveCount(0);
  });

  test("Settings opens a modal that Escape closes", async ({ page, open }) => {
    await open();
    await page.getByRole("button", { name: "Open header" }).click();
    await page.getByRole("dialog").getByText("Settings").click();

    await expect(
      page.getByRole("button", { name: "Close settings" }),
    ).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(
      page.getByRole("button", { name: "Close settings" }),
    ).toHaveCount(0);
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
    await expect
      .poll(async () => (await readBlob(page))?.status)
      .toBe("paused");
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

  test("shows only the login button when logged out", async ({
    page,
    open,
  }) => {
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
    await expect(
      page.getByRole("link", { name: /Log in with Todoist/ }),
    ).toBeVisible();

    // And with no API process at all.
    await page.unrouteAll();
    await page.route("**/glu/api/auth/todoist/status", (route) =>
      route.abort(),
    );
    await page.reload({ waitUntil: "load" });
    await expect(
      page.getByRole("link", { name: /Log in with Todoist/ }),
    ).toBeVisible();
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
    await expect(
      page.getByRole("link", { name: /Log in with Todoist/ }),
    ).toBeVisible();
  });

  test("no token material is readable from the page", async ({
    page,
    open,
  }) => {
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
  const stubStatus = (
    page: import("@playwright/test").Page,
    body: Record<string, unknown>,
  ) =>
    page.route("**/glu/api/auth/todoist/status", (route) =>
      route.fulfill({ json: body }),
    );

  const openSettings = async (page: import("@playwright/test").Page) => {
    await page.getByRole("button", { name: "Open header" }).click();
    await page.getByRole("dialog").getByText("Settings").click();
    await expect(
      page.getByRole("button", { name: "Close settings" }),
    ).toBeVisible();
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
    await expect(
      page.getByRole("button", { name: "Todoist account: Ioan" }),
    ).toBeVisible();

    await openSettings(page);
    await page.getByRole("button", { name: "Log out" }).click();

    // The top-right region flips…
    await expect(
      page
        .getByLabel("Todoist area")
        .getByRole("link", { name: /Log in with Todoist/ }),
    ).toBeVisible();
    // …and the modal stays open, now showing the branded login.
    await expect(
      page.getByRole("button", { name: "Close settings" }),
    ).toBeVisible();
    await expect(
      page.getByLabel("Todoist settings").getByRole("link"),
    ).toBeVisible();
  });

  test("the Settings login is the same branded control and the same URL", async ({
    page,
    open,
  }) => {
    await stubStatus(page, { authenticated: false });
    await open();
    await openSettings(page);

    const settingsLogin = page.getByLabel("Todoist settings").getByRole("link");
    await expect(settingsLogin).toHaveAttribute(
      "href",
      "/glu/api/auth/todoist/login",
    );
    await expect(settingsLogin).toHaveText(/Log in with Todoist/);
  });

  test("the Screen section toggles land in the blob (ADR 17 amendment)", async ({
    page,
    open,
  }) => {
    await stubStatus(page, { authenticated: false });
    await open();
    await openSettings(page);

    const always = page.getByRole("switch", {
      name: "Stay awake on the website",
    });
    const whileRunning = page.getByRole("switch", {
      name: "Stay awake when the timer is running",
    });
    // The defaults are the shipped ADR 17 policy: the run holds the screen.
    await expect(always).not.toBeChecked();
    await expect(whileRunning).toBeChecked();

    await always.click();
    await whileRunning.click();

    await expect
      .poll(async () => (await readBlob(page)) as Record<string, unknown>)
      .toMatchObject({ stayAwakeAlways: true, stayAwakeWhileRunning: false });
  });

  test("preferences survive a logout", async ({ page, open }) => {
    await stubStatus(page, { authenticated: true, name: "Ioan", id: "42" });
    await page.route("**/glu/api/auth/todoist/logout", (route) =>
      route.fulfill({ json: { authenticated: false } }),
    );
    await open();

    // Establish preferences that logout must not touch.
    await flipClock(page, 1);
    const before = await readBlob(page);

    await openSettings(page);
    await page.getByRole("button", { name: "Log out" }).click();
    await expect(
      page
        .getByLabel("Todoist area")
        .getByRole("link", { name: /Log in with Todoist/ }),
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
        route.fulfill({
          json: { items: [{ id: "f1", name: "Today", query: "today" }] },
        }),
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
    page.route("**/glu/api/todoist/tasks**", (route) =>
      route.fulfill({ json: body }),
    );

  test("logged out shows only the login button — no tools icon, no list", async ({
    page,
    open,
  }) => {
    await page.route("**/glu/api/auth/todoist/status", (route) =>
      route.fulfill({ json: { authenticated: false } }),
    );
    await open();

    await expect(
      page.getByRole("link", { name: /Log in with Todoist/ }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Choose task source" }),
    ).toHaveCount(0);
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
        {
          id: "3",
          title: "Someday",
          description: "",
          uiPriority: 4,
          sectionId: "s2",
          order: 0,
        },
        {
          id: "2",
          title: "Today task",
          description: "",
          uiPriority: 1,
          sectionId: "s1",
          order: 0,
        },
        {
          id: "1",
          title: "Loose task",
          description: "keeps its line",
          uiPriority: 3,
          sectionId: null,
          order: 0,
        },
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
    await expect
      .poll(async () => (await readBlob(page))?.todoistSource?.id)
      .toBe("p1");
  });

  /** ADR 12 amendment: below `sm` the popover is a modal that owns the screen. */
  test("below sm the source picker opens as a near-full-screen modal", async ({
    page,
    open,
  }) => {
    const viewport = { width: 590, height: 900 };
    await page.setViewportSize(viewport);
    await loginAs(page);
    await stubLists(page);
    await stubTasks(page, {
      items: [
        {
          id: "1",
          title: "Loose task",
          description: "",
          uiPriority: 3,
          sectionId: null,
          order: 0,
        },
      ],
      truncated: false,
      cap: 200,
    });
    await open();

    await page.getByRole("button", { name: "Choose task source" }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();

    // "Most of the screen", measured rather than asserted by eye.
    const box = await dialog.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.width / viewport.width).toBeGreaterThan(0.85);
    expect(box!.height / viewport.height).toBeGreaterThan(0.8);

    // The list is the screen: options are on it, not behind a second dropdown.
    await expect(page.getByRole("option", { name: "GLU" })).toBeVisible();
    await page.getByPlaceholder("Choose a project").fill("nothing-matches");
    await expect(page.getByRole("option")).toHaveCount(0);
    await page.getByPlaceholder("Choose a project").fill("gl");

    await page.getByRole("option", { name: "GLU" }).click();
    await expect(dialog).toBeHidden();
    await expect(page.getByTestId("task-card")).toHaveCount(1);
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
          items: [
            {
              id: "1",
              title,
              description: "",
              uiPriority: 4,
              sectionId: null,
              order: 0,
            },
          ],
          truncated: false,
          cap: 200,
        },
      });
    });
    await seedStorage(
      seed({ todoistSource: { type: "project", id: "p1", name: "GLU" } }),
    );
    await open();

    await expect(page.getByText("Before refresh")).toBeVisible();

    title = "After refresh";
    await page.getByRole("button", { name: "Refresh tasks" }).click();

    // In flight: the rendered list stays put and the control reports busy.
    await expect(page.getByTestId("task-refresh")).toHaveAttribute(
      "aria-busy",
      "true",
    );
    await expect(page.getByTestId("task-skeletons")).toHaveCount(0);
    await expect(page.getByText("Before refresh")).toBeVisible();

    await expect(page.getByText("After refresh")).toBeVisible();
    await expect(page.getByTestId("task-refresh")).toHaveAttribute(
      "aria-busy",
      "false",
    );
  });

  /* ----------------------------------------------------------------------- */
  /* ADR 43 — pull to refresh                                                 */
  /* ----------------------------------------------------------------------- */

  /**
   * Playwright's touchscreen taps but does not drag, so the gesture is driven
   * by dispatching real `PointerEvent`s at the host — which is what a finger
   * produces anyway, and keeps the test running on all four projects rather
   * than only the two with `hasTouch`.
   */
  const pointerAt = (
    page: Page,
    type: string,
    y: number,
    pointerType = "touch",
  ) =>
    page.evaluate(
      ([type, y, pointerType]) => {
        const host = document.querySelector('[data-testid="pull-host"]');
        if (!host) throw new Error("no pull host");
        const box = host.getBoundingClientRect();
        host.dispatchEvent(
          new PointerEvent(type as string, {
            bubbles: true,
            cancelable: true,
            pointerId: 1,
            isPrimary: true,
            pointerType: pointerType as string,
            clientX: box.left + box.width / 2,
            clientY: box.top + (y as number),
          }),
        );
      },
      [type, y, pointerType] as const,
    );

  test("pulling the list down refreshes it, and the icon rides the finger", async ({
    page,
    open,
    seedStorage,
  }) => {
    await loginAs(page);
    await stubLists(page);

    let title = "Before pull";
    await page.route("**/glu/api/todoist/tasks**", async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 500));
      return route.fulfill({
        json: {
          items: [
            {
              id: "1",
              title,
              description: "",
              uiPriority: 4,
              sectionId: null,
              order: 0,
            },
          ],
          truncated: false,
          cap: 200,
        },
      });
    });
    await seedStorage(
      seed({ todoistSource: { type: "project", id: "p1", name: "GLU" } }),
    );
    await open();

    await expect(page.getByText("Before pull")).toBeVisible();
    const indicator = page.getByTestId("pull-indicator");
    // At rest it is above the top edge and invisible.
    await expect(indicator).toHaveCSS("opacity", "0");

    title = "After pull";
    await pointerAt(page, "pointerdown", 0);
    await pointerAt(page, "pointermove", 40);
    // Tracking, but a release here would do nothing — and it looks like it.
    await expect(indicator).not.toHaveAttribute("data-armed", "true");

    await pointerAt(page, "pointermove", 200);
    await expect(indicator).toHaveAttribute("data-armed", "true");
    await expect(indicator).toHaveCSS("opacity", "1");

    await pointerAt(page, "pointerup", 200);

    // In flight: same contract as the button — list stays put, no skeletons.
    await expect(indicator).toHaveAttribute("data-spinning", "true");
    await expect(page.getByTestId("task-refresh")).toHaveAttribute(
      "aria-busy",
      "true",
    );
    await expect(page.getByTestId("task-skeletons")).toHaveCount(0);
    await expect(page.getByText("Before pull")).toBeVisible();

    await expect(page.getByText("After pull")).toBeVisible();
    // …and then it goes back up and hides itself.
    await expect(indicator).not.toHaveAttribute("data-spinning", "true");
    await expect(indicator).toHaveCSS("opacity", "0");
  });

  test("a short pull refetches nothing, and a mouse drag never pulls at all", async ({
    page,
    open,
    seedStorage,
  }) => {
    await loginAs(page);
    await stubLists(page);

    let requests = 0;
    await page.route("**/glu/api/todoist/tasks**", (route) => {
      requests += 1;
      return route.fulfill({
        json: {
          items: [
            {
              id: "1",
              title: "Only task",
              description: "",
              uiPriority: 4,
              sectionId: null,
              order: 0,
            },
          ],
          truncated: false,
          cap: 200,
        },
      });
    });
    await seedStorage(
      seed({ todoistSource: { type: "project", id: "p1", name: "GLU" } }),
    );
    await open();
    await expect(page.getByText("Only task")).toBeVisible();
    const indicator = page.getByTestId("pull-indicator");

    const before = requests;
    // Released short of the line: visible, then gone, and nothing fetched.
    await pointerAt(page, "pointerdown", 0);
    await pointerAt(page, "pointermove", 60);
    await expect(indicator).not.toHaveAttribute("data-armed", "true");
    await pointerAt(page, "pointerup", 60);
    await expect(indicator).toHaveCSS("opacity", "0");

    // A mouse has the header button; the gesture is touch only.
    await pointerAt(page, "pointerdown", 0, "mouse");
    await pointerAt(page, "pointermove", 200, "mouse");
    await pointerAt(page, "pointerup", 200, "mouse");
    await expect(indicator).toHaveCSS("opacity", "0");

    expect(requests).toBe(before);
  });

  test.describe("with reduced motion", () => {
    test("still refreshes — it just does not spin or slide", async ({
      page,
      open,
      seedStorage,
    }) => {
      // `emulateMedia`, not the `reducedMotion` context option: the latter is
      // not honoured against this suite's already-created context.
      await page.emulateMedia({ reducedMotion: "reduce" });
      await loginAs(page);
      await stubLists(page);

      let title = "Before pull";
      await page.route("**/glu/api/todoist/tasks**", async (route) => {
        await new Promise((resolve) => setTimeout(resolve, 300));
        return route.fulfill({
          json: {
            items: [
              {
                id: "1",
                title,
                description: "",
                uiPriority: 4,
                sectionId: null,
                order: 0,
              },
            ],
            truncated: false,
            cap: 200,
          },
        });
      });
      await seedStorage(
        seed({ todoistSource: { type: "project", id: "p1", name: "GLU" } }),
      );
      await open();
      await expect(page.getByText("Before pull")).toBeVisible();

      title = "After pull";
      await pointerAt(page, "pointerdown", 0);
      await pointerAt(page, "pointermove", 200);
      await pointerAt(page, "pointerup", 200);

      const indicator = page.getByTestId("pull-indicator");
      await expect(indicator).toHaveAttribute("data-spinning", "true");
      await expect(indicator).toHaveCSS("transition-property", "none");
      await expect(indicator.locator("svg")).toHaveCSS(
        "animation-name",
        "none",
      );

      // The refresh itself is not motion, and still happens.
      await expect(page.getByText("After pull")).toBeVisible();
    });
  });

  test("the 200-task cap is visible, not silent", async ({
    page,
    open,
    seedStorage,
  }) => {
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
    await seedStorage(
      seed({ todoistSource: { type: "project", id: "p1", name: "GLU" } }),
    );
    await open();

    await expect(page.getByTestId("task-truncation")).toHaveText(
      "Showing first 200",
    );
  });

  test("a source deleted upstream degrades to the hint", async ({
    page,
    open,
    seedStorage,
  }) => {
    await loginAs(page);
    await stubLists(page);
    await page.route("**/glu/api/todoist/tasks**", (route) =>
      route.fulfill({ status: 404, json: { error: "not_found" } }),
    );
    await seedStorage(
      seed({ todoistSource: { type: "project", id: "gone", name: "Deleted" } }),
    );
    await open();

    await expect(page.getByTestId("task-hint")).toBeVisible();
    await expect(page.getByTestId("task-error")).toHaveCount(0);
  });

  test("the list scrolls internally and the page does not, at tablet width", async ({
    page,
    open,
    seedStorage,
  }, testInfo) => {
    test.skip(
      testInfo.project.name.includes("half-tablet"),
      "tablet-only contract",
    );

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
    await seedStorage(
      seed({ todoistSource: { type: "project", id: "p1", name: "GLU" } }),
    );
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
              {
                id: "big",
                title: "Slow project task",
                description: "",
                uiPriority: 4,
                sectionId: null,
                order: 0,
              },
            ],
            truncated: false,
            cap: 200,
          },
        });
      }
      return route.fulfill({
        json: {
          items: [
            {
              id: "small",
              title: "Fast label task",
              description: "",
              uiPriority: 4,
              sectionId: null,
              order: 0,
            },
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

  const stubEverything = async (
    page: Page,
    overrides: { taskStatus?: number } = {},
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
    seed({
      todoistSource: { type: "project", id: "p1", name: "GLU" },
      ...patch,
    });

  test("opens from a card and shows the task, read-only", async ({
    page,
    open,
    seedStorage,
  }) => {
    await stubEverything(page);
    await seedStorage(withSource());
    await open();

    await page
      .getByRole("button", { name: /Open “Fix the palette flash”/ })
      .click();
    await expect(page.getByTestId("task-detail")).toBeVisible();
    await expect(page.getByTestId("detail-description")).toContainText(
      "Second line.",
    );
    await expect(page.getByTestId("comment")).toHaveCount(1);

    // ADR 13 shipped read-only; ADR 20 added exactly one write action here —
    // the priority circle. Nothing else in the detail mutates anything.
    await expect(
      page.getByRole("button", { name: /Edit|Delete|Reschedule/ }),
    ).toHaveCount(0);
  });

  test("every byte of a comment image is same-origin", async ({
    page,
    open,
    seedStorage,
  }) => {
    const external: string[] = [];
    page.on("request", (request) => {
      const host = new URL(request.url()).hostname;
      if (host.includes("todoist")) external.push(request.url());
    });

    await stubEverything(page);
    await seedStorage(withSource());
    await open();
    await page
      .getByRole("button", { name: /Open “Fix the palette flash”/ })
      .click();

    const image = page.getByTestId("comment-image");
    await expect(image).toBeVisible();
    await expect(image).toHaveAttribute(
      "src",
      /^\/glu\/api\/todoist\/attachment/,
    );
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

    await page
      .getByRole("button", { name: /Open “Fix the palette flash”/ })
      .click();
    await expect(page.getByTestId("detail-gone")).toBeVisible();
    await page
      .getByTestId("detail-gone")
      .getByRole("button", { name: "Close" })
      .click();
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
    await page
      .getByRole("button", { name: /Open “Fix the palette flash”/ })
      .click();
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
  a.x < b.x + b.width &&
  a.x + a.width > b.x &&
  a.y < b.y + b.height &&
  a.y + a.height > b.y;

test.describe("focused task time comments (ADR 14)", () => {
  type Page = import("@playwright/test").Page;

  const stubProxy = async (
    page: Page,
    posted: { body: unknown }[],
    deleted: string[] = [],
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
            {
              id: "t1",
              title: "Ship ADR 14",
              description: "Pin it, run the clock, let the comment land",
              uiPriority: 2,
              sectionId: null,
              order: 0,
            },
            {
              id: "t2",
              title: "Other task",
              description: "",
              uiPriority: 4,
              sectionId: null,
              order: 1,
            },
          ],
          truncated: false,
          cap: 200,
        },
      }),
    );
    let minutes = 0;
    await page.route("**/glu/api/todoist/task/*/time-total", (route) =>
      route.fulfill({
        json: { minutes, counted: 1, ignored: 0, clamped: false },
      }),
    );
    let created = 0;
    await page.route("**/glu/api/todoist/comment", async (route) => {
      const body = route.request().postDataJSON();
      posted.push({ body });
      minutes += (body as { minutes: number }).minutes;
      created += 1;
      // The id is what the post-then-delete undo window aims at.
      await route.fulfill({ json: { posted: true, id: `c${created}` } });
    });
    // Registered after the POST stub, and narrower: `…/comment` never matches
    // `…/comment/c1`, so the two routes cannot shadow each other.
    await page.route("**/glu/api/todoist/comment/*", async (route) => {
      const id = new URL(route.request().url()).pathname.split("/").at(-1)!;
      deleted.push(id);
      minutes -= posted.length
        ? (posted.at(-1)!.body as { minutes: number }).minutes
        : 0;
      await route.fulfill({ json: { deleted: true } });
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
    // The list card's description line survives focusing (ADR 14 amendment, f).
    await expect(page.getByTestId("focused-description")).toHaveText(
      "Pin it, run the clock, let the comment land",
    );
    await expect(page.getByTestId("task-card")).toHaveCount(1);
    await expect(page.getByTestId("task-card")).toContainText("Other task");

    await page.reload({ waitUntil: "load" });
    await expect(page.getByTestId("focused-task")).toContainText("Ship ADR 14");
    // Persisted with the snapshot, so it is there before any fetch returns.
    await expect(page.getByTestId("focused-description")).toHaveText(
      "Pin it, run the clock, let the comment land",
    );

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
    await expect(bar).toContainText("comment will be added");

    await bar.getByRole("button", { name: "Undo" }).click();
    await expect(bar).toHaveCount(0);

    // Nothing was ever sent: cancelling inside the 2 s grace still needs no
    // delete verb — that is what phase one buys.
    await page.clock.fastForward("00:30");
    expect(posted).toEqual([]);
    await expect.poll(async () => (await readBlob(page))?.outbox).toEqual([]);
  });

  test("the comment lands two seconds later, and Undo then deletes it", async ({
    page,
    open,
    seedStorage,
  }) => {
    const posted: { body: unknown }[] = [];
    const deleted: string[] = [];
    await page.clock.install();
    await stubProxy(page, posted, deleted);
    await seedStorage(withSource());
    await open();

    await page.getByRole("button", { name: /Focus “Ship ADR 14”/ }).click();
    await page.getByRole("button", { name: "Start" }).click();
    await page.clock.fastForward("05:00");
    await page.getByRole("button", { name: "Stop" }).click();

    const bar = page.getByTestId("undo-bar");
    await expect(bar).toContainText("comment will be added");

    // Two seconds, not ten: the comment is real by now, and the bar says so
    // without ever leaving the screen.
    await page.clock.fastForward("00:03");
    await expect.poll(() => posted.length).toBe(1);
    await expect(bar).toBeVisible();
    await expect(bar).toContainText("comment added");
    await expect(bar).toContainText("[5m]");

    // Same bar, second mechanic: a real DELETE against the comment just made.
    await bar.getByRole("button", { name: "Undo" }).click();
    await expect.poll(() => deleted).toEqual(["c1"]);
    await expect(bar).toHaveCount(0);
    expect(posted).toHaveLength(1);
  });

  test("letting the whole window lapse posts exactly one composed comment", async ({
    page,
    open,
    seedStorage,
  }) => {
    const posted: { body: unknown }[] = [];
    const deleted: string[] = [];
    await page.clock.install();
    await stubProxy(page, posted, deleted);
    await seedStorage(withSource());
    await open();

    await page.getByRole("button", { name: /Focus “Ship ADR 14”/ }).click();
    await page.getByRole("button", { name: "Start" }).click();
    await page.clock.fastForward("07:00");
    await page.getByRole("button", { name: "Stop" }).click();

    await page.clock.fastForward("00:20");
    await expect.poll(() => posted.length).toBe(1);
    // The undo window lapsed unused; nothing was deleted behind our back.
    expect(deleted).toEqual([]);
    await expect(page.getByTestId("undo-bar")).toHaveCount(0);
    expect(posted[0].body).toEqual({ taskId: "t1", minutes: 7, locale: "en" });

    // The outbox drains, and the badge refreshes off the post.
    await expect.poll(async () => (await readBlob(page))?.outbox).toEqual([]);
    await expect(page.getByTestId("focused-total")).toContainText("[7m]");
  });

  /**
   * ADR 27. The wire carries *keys*, never the sentence — the whole point of
   * ADR 14's composing server survives this feature, and these two tests are
   * where that is visible end to end.
   */
  test("the comment reports the environment the run happened in", async ({
    page,
    open,
    seedStorage,
  }) => {
    const posted: { body: unknown }[] = [];
    await page.clock.install();
    await stubProxy(page, posted);
    await seedStorage(withSource());
    await open();

    await page.getByText("Music", { exact: true }).click();
    await page.getByText("Headphones", { exact: true }).click();

    await page.getByRole("button", { name: /Focus “Ship ADR 14”/ }).click();
    await page.getByRole("button", { name: "Start" }).click();
    await page.clock.fastForward("06:00");
    await page.getByRole("button", { name: "Stop" }).click();
    await page.clock.fastForward("00:20");

    await expect.poll(() => posted.length).toBe(1);
    expect(posted[0].body).toEqual({
      taskId: "t1",
      minutes: 6,
      environment: ["music", "headphones"],
      locale: "en",
    });
  });

  test("turning the setting off puts ADR 14's plain sentence back", async ({
    page,
    open,
    seedStorage,
  }) => {
    const posted: { body: unknown }[] = [];
    await page.clock.install();
    await stubProxy(page, posted);
    await seedStorage(withSource());
    await open();

    await page.getByText("Music", { exact: true }).click();

    // Through the real surface: drawer → Settings → the switch.
    await page.getByRole("button", { name: "Open header" }).click();
    await page.getByRole("dialog").getByText("Settings").click();
    const settings = page.getByRole("dialog").last();
    // The preview is the artifact the user is deciding about.
    await expect(settings.getByTestId("comment-preview-on-text")).toContainText(
      "with music",
    );
    await settings.getByRole("switch", { name: "Say how you worked" }).click();
    await page.getByRole("button", { name: "Close settings" }).click();
    // The drawer is still open behind the modal, and it overlays the list.
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toHaveCount(0);

    await page.getByRole("button", { name: /Focus “Ship ADR 14”/ }).click();
    await page.getByRole("button", { name: "Start" }).click();
    await page.clock.fastForward("06:00");
    await page.getByRole("button", { name: "Stop" }).click();
    await page.clock.fastForward("00:20");

    await expect.poll(() => posted.length).toBe(1);
    expect(posted[0].body).toEqual({ taskId: "t1", minutes: 6, locale: "en" });
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

  /**
   * ADR 14 amendment (2026-07-25g). A run that ended while the app was closed
   * kept its session and silently lost its comment: `rehydrate()` finishes the
   * run before the shell — and this listener with it — is mounted, so the run
   * end was emitted into an empty room. The buffer in the run-end bus is what
   * this asserts, from the outside.
   */
  test("a run that ended while the app was closed still posts its comment", async ({
    page,
    open,
    seedStorage,
  }) => {
    const posted: { body: unknown }[] = [];
    await page.clock.install({ time: new Date("2026-07-25T09:00:00Z") });
    await stubProxy(page, posted);
    await seedStorage(
      seed({
        todoistSource: { type: "project", id: "p1", name: "GLU" },
        focusedTask: { id: "t1", title: "Ship ADR 14", priority: 2 },
        // Five minutes of attention, ended two minutes before this load.
        status: "running",
        endAt: new Date("2026-07-25T08:58:00Z").getTime(),
        remaining: 0,
        total: 5 * 60_000,
        runId: "run-away-1",
        runningSince: new Date("2026-07-25T08:53:00Z").getTime(),
      }),
    );

    await open();
    await expect(page.getByTestId("clock-slot")).toContainText("00:00");
    // Past the grace, so the outbox drains rather than sitting in it.
    await page.clock.fastForward("00:20");

    await expect.poll(() => posted.length).toBe(1);
    expect(posted[0].body).toEqual({ taskId: "t1", minutes: 5, locale: "en" });
    // The session was never the broken half — assert it stayed intact.
    await expect
      .poll(async () => (await readBlob(page))?.day?.sessions?.length)
      .toBe(1);
  });

  /**
   * ADR 28 amendment: the minimum is inclusive. This is the owner's repro —
   * 5 minutes trimmed to one, run to 0:00 — and the smallest run GLU can make:
   * exactly 60 000 ms of attention against a 1-minute minimum. (The repro was
   * −2 twice until the row became ±1 on 2026-07-25; it is −1 four times now.)
   */
  test("a 1-minute run posts, because the minimum means at least", async ({
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
    await page.getByRole("button", { name: "5m", exact: true }).click();
    const minusOne = page.getByRole("button", { name: /Subtract 1 minute/ });
    for (let i = 0; i < 4; i++) await minusOne.click();
    await expect(page.getByTestId("clock-slot")).toContainText("01:00");

    await page.getByRole("button", { name: "Start" }).click();
    await page.clock.fastForward("01:00");
    await page.clock.fastForward("00:20");

    await expect.poll(() => posted.length).toBe(1);
    expect(posted[0].body).toEqual({ taskId: "t1", minutes: 1, locale: "en" });
  });

  /** ADR 28: the threshold is a setting, and this is it moving. */
  test("raising the minimum in Settings silences a run that used to post", async ({
    page,
    open,
    seedStorage,
  }) => {
    const posted: { body: unknown }[] = [];
    await page.clock.install();
    await stubProxy(page, posted);
    await seedStorage(withSource());
    await open();

    // Through the real surface: drawer → Settings → the ladder.
    await page.getByRole("button", { name: "Open header" }).click();
    await page.getByRole("dialog").getByText("Settings").click();
    const settings = page.getByRole("dialog").last();
    const ladder = settings.getByRole("radiogroup", {
      name: "Minimum time to log",
    });
    // `exact` throughout: "5 min" is a substring of "15 min".
    await expect(
      ladder.getByRole("radio", { name: "1 min", exact: true }),
    ).toBeChecked();
    // The tap lands on the rung's label, which is what a finger hits — the
    // radio itself is the transparent input underneath it.
    await ladder.getByText("5 min", { exact: true }).click();
    await expect(
      ladder.getByRole("radio", { name: "5 min", exact: true }),
    ).toBeChecked();
    await page.getByRole("button", { name: "Close settings" }).click();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toHaveCount(0);

    await page.getByRole("button", { name: /Focus “Ship ADR 14”/ }).click();

    // Four minutes: a comment under ADR 14's minute, nothing under this one.
    await page.getByRole("button", { name: "Start" }).click();
    await page.clock.fastForward("04:00");
    await page.getByRole("button", { name: "Stop" }).click();
    await page.clock.fastForward("00:20");
    await expect(page.getByTestId("undo-bar")).toHaveCount(0);
    expect(posted).toEqual([]);

    // Six minutes clears it, and posts exactly what it always did.
    await page.getByRole("button", { name: "Start" }).click();
    await page.clock.fastForward("06:00");
    await page.getByRole("button", { name: "Stop" }).click();
    await page.clock.fastForward("00:20");
    await expect.poll(() => posted.length).toBe(1);
    expect(posted[0].body).toEqual({ taskId: "t1", minutes: 6, locale: "en" });
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
    expect(posted[0].body).toEqual({ taskId: "t1", minutes: 5, locale: "en" });
    await dismissTakeover(page);

    // `n` restart: abandons the session count but still posts the attention.
    await page.getByRole("button", { name: "Start" }).click();
    await page.clock.fastForward("03:00");
    await page.keyboard.press("n");
    await page.clock.fastForward("00:20");
    await expect.poll(() => posted.length).toBe(2);
    expect(posted[1].body).toEqual({ taskId: "t1", minutes: 3, locale: "en" });

    // 61 seconds is the smallest qualifying run.
    await page.getByRole("button", { name: "Stop" }).click();
    await page.getByRole("button", { name: "Start" }).click();
    await page.clock.fastForward(61_000);
    await page.getByRole("button", { name: "Stop" }).click();
    await page.clock.fastForward("00:20");
    await expect.poll(() => posted.length).toBe(3);
    expect(posted[2].body).toEqual({ taskId: "t1", minutes: 1, locale: "en" });
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
    expect(posted[0].body).toEqual({ taskId: "t1", minutes: 4, locale: "en" });
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
    // depend on a race, and undo follows the gesture, not the queue: a comment
    // drained after a reload posts without offering a bar nobody asked for.
    await page.clock.fastForward("00:20");
    await expect.poll(() => posted.length).toBe(1);
    expect(posted[0].body).toEqual({ taskId: "t1", minutes: 6, locale: "en" });
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
    await expect(page.getByTestId("focused-pending")).toContainText(
      "1 comment pending",
    );

    // A reload between failure and retry must not duplicate it.
    await page.reload({ waitUntil: "load" });
    await page.clock.fastForward("00:15");

    await expect.poll(() => posted.length).toBe(1);
    expect(posted[0].body).toEqual({ taskId: "t1", minutes: 8, locale: "en" });
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
    for (const name of ["Start", "Stop"]) {
      const button = await page
        .getByRole("button", { name, exact: true })
        .boundingBox();
      expect(overlaps(bar!, button!), `${name} must stay clear`).toBe(false);
    }
    for (const chip of [
      "Music",
      "Podcast",
      "TV",
      "Silence",
      "Noisy",
      "Headphones",
    ]) {
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
            {
              id: "t1",
              title: "Ship ADR 20",
              description: "",
              uiPriority: 1,
              sectionId: null,
              order: 0,
            },
            {
              id: "t2",
              title: "Other task",
              description: "",
              uiPriority: 4,
              sectionId: null,
              order: 1,
            },
          ],
          truncated: false,
          cap: 200,
        },
      }),
    );
    await page.route("**/glu/api/todoist/task/*/time-total", (route) =>
      route.fulfill({
        json: { minutes: 0, counted: 0, ignored: 0, clamped: false },
      }),
    );
    await page.route("**/glu/api/todoist/comment", async (route) => {
      calls.comment.push(route.request().postDataJSON());
      await route.fulfill({ json: { posted: true } });
    });
    await page.route("**/glu/api/todoist/task/*/close", async (route) => {
      const id = new URL(route.request().url()).pathname.split("/").at(-2)!;
      calls.close.push(id);
      if (options.closeDelayMs) {
        await new Promise((resolve) =>
          setTimeout(resolve, options.closeDelayMs),
        );
      }
      if (options.closeStatus && options.closeStatus >= 400) {
        return route.fulfill({
          status: options.closeStatus,
          json: { error: "boom" },
        });
      }
      return route.fulfill({ json: { closed: true } });
    });
    await page.route("**/glu/api/todoist/task/*/reopen", async (route) => {
      calls.reopen.push(
        new URL(route.request().url()).pathname.split("/").at(-2)!,
      );
      return route.fulfill({ json: { reopened: true } });
    });
  };

  const withSource = () =>
    seed({ todoistSource: { type: "project", id: "p1", name: "GLU" } });
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

    await page
      .getByTestId("undo-bar")
      .getByRole("button", { name: "Undo" })
      .click();
    await expect(page.getByTestId("task-card")).toHaveCount(2);
    expect(calls.close).toEqual(["t1"]);
    expect(calls.reopen).toEqual(["t1"]);
  });

  test("letting the bar lapse fires no reopen", async ({
    page,
    open,
    seedStorage,
  }) => {
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
    await expect
      .poll(async () => (await readBlob(page))?.status)
      .toBe("running");
  });

  // ADR 35 supersedes ADR 20's lingering completed slot: the tap vacates it.
  test("completing the focused task vacates the slot instantly, and Undo restores it", async ({
    page,
    open,
    seedStorage,
  }) => {
    const calls = noCalls();
    // A slow close proves the slot empties before the network answers.
    await stubProxy(page, calls, { closeDelayMs: 800 });
    await seedStorage(withSource());
    await open();

    await page.getByRole("button", { name: /Focus “Ship ADR 20”/ }).click();
    await expect(page.getByTestId("focused-task")).toContainText("Ship ADR 20");

    await page
      .getByTestId("focused-task")
      .getByRole("button", { name: /Complete “Ship ADR 20”/ })
      .click();
    await expect(page.getByTestId("focused-task")).toHaveCount(0);
    // Unfocusing lifted the list exclusion, but the completing card must not
    // resurface there either.
    await expect(page.getByTestId("task-card")).toHaveCount(1);

    await expect(page.getByTestId("undo-bar")).toContainText("Ship ADR 20");
    await page
      .getByTestId("undo-bar")
      .getByRole("button", { name: "Undo" })
      .click();

    // Focus comes back exactly as it was, and the card stays hidden behind it.
    await expect(page.getByTestId("focused-task")).toContainText("Ship ADR 20");
    await expect(page.getByTestId("task-card")).toHaveCount(1);
    expect(calls.reopen).toEqual(["t1"]);
  });

  test("letting the focused completion lapse leaves the slot empty for good", async ({
    page,
    open,
    seedStorage,
  }) => {
    const calls = noCalls();
    await page.clock.install();
    await stubProxy(page, calls);
    await seedStorage(withSource());
    await open();

    await page.getByRole("button", { name: /Focus “Ship ADR 20”/ }).click();
    await page
      .getByTestId("focused-task")
      .getByRole("button", { name: /Complete “Ship ADR 20”/ })
      .click();
    await expect(page.getByTestId("focused-task")).toHaveCount(0);

    await page.clock.fastForward("00:15");
    await expect(page.getByTestId("undo-bar")).toHaveCount(0);
    await expect(page.getByTestId("focused-task")).toHaveCount(0);

    // A later unrelated undo must not resurrect the old focus.
    await page.getByRole("button", { name: /Complete “Other task”/ }).click();
    await page
      .getByTestId("undo-bar")
      .getByRole("button", { name: "Undo" })
      .click();
    await expect(page.getByTestId("focused-task")).toHaveCount(0);
    expect(calls.reopen).toEqual(["t2"]);
  });

  test("a failed close restores the focused slot with an error, and no undo bar", async ({
    page,
    open,
    seedStorage,
  }) => {
    await stubProxy(page, noCalls(), { closeStatus: 500 });
    await seedStorage(withSource());
    await open();

    await page.getByRole("button", { name: /Focus “Ship ADR 20”/ }).click();
    await page
      .getByTestId("focused-task")
      .getByRole("button", { name: /Complete “Ship ADR 20”/ })
      .click();

    await expect(page.getByTestId("focused-task")).toContainText("Ship ADR 20");
    await expect(page.getByTestId("focused-error")).toBeVisible();
    await expect(page.getByTestId("undo-bar")).toHaveCount(0);
    await expect(page.getByTestId("task-card")).toHaveCount(1);
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
    await expect(page.getByTestId("undo-bar")).toContainText(
      "Completed · Other task",
    );
    await expect.poll(() => calls.comment.length).toBe(1);
    expect(calls.comment[0]).toEqual({ taskId: "t1", minutes: 4, locale: "en" });
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
    const focus = await page
      .getByRole("button", { name: /Focus “Ship ADR 20”/ })
      .boundingBox();

    for (const [name, box] of [
      ["complete", complete],
      ["focus", focus],
    ] as const) {
      expect(
        Math.min(box!.width, box!.height),
        `${name} target`,
      ).toBeGreaterThanOrEqual(44);
    }
    expect(overlaps(complete!, focus!)).toBe(false);
  });
});

/* ------------------------------------------------------------------------- */
/* ADR 21 — final-countdown takeover                                          */
/* ------------------------------------------------------------------------- */

const takeoverOverlay = (page: import("@playwright/test").Page) =>
  page.getByTestId("takeover-overlay");

test.describe("final-countdown takeover (ADR 21)", () => {
  const overlay = takeoverOverlay;

  // ADR 21 amendment (2026-07-25): the takeover is a tablet-layout statement.
  // Below `sm` the clock already owns the whole first viewport (ADR 08), so
  // there is nothing beside it to flood — the contracts below are `sm`-and-up.
  test.beforeEach(({}, testInfo) => {
    test.skip(
      testInfo.project.name.includes("half-tablet"),
      "no takeover below `sm`",
    );
  });

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
        getComputedStyle(
          document.querySelector('[data-testid="takeover-overlay"]')!,
        ).zIndex,
      ),
      clockZ: Number(
        getComputedStyle(document.querySelector('[data-testid="clock-slot"]')!)
          .zIndex,
      ),
    }));
    expect(layers.clockZ).toBeGreaterThan(layers.overlayZ);
  });

  test("a tap where a control would be dismisses it instead of pressing it", async ({
    page,
    open,
  }) => {
    await page.clock.install();
    await open();

    await page.getByRole("button", { name: "5m", exact: true }).click();
    await page.getByRole("button", { name: "Start" }).click();
    await page.clock.fastForward("04:05");
    // Let the entrance sweep finish; only then is the overlay full-viewport.
    await page.clock.fastForward(1000);
    await expect(overlay(page)).toHaveAttribute("data-phase", "on");

    // Aim at the Stop button: the overlay takes the tap.
    const stop = (await page
      .getByRole("button", { name: "Stop" })
      .boundingBox())!;
    await page.mouse.click(stop.x + stop.width / 2, stop.y + stop.height / 2);

    await expect
      .poll(async () => (await readBlob(page))?.status)
      .toBe("running");
    await expect(overlay(page)).toHaveCount(0);

    // The chrome the tap asked for stays: the run keeps ticking under the
    // threshold and nothing covers the page again (ADR 21 amendment).
    await page.clock.fastForward("00:20");
    await expect(overlay(page)).toHaveCount(0);

    // …and the controls really work.
    await page.getByRole("button", { name: /Add 5 minutes/ }).click();
    await expect(page.getByTestId("clock-slot")).toContainText("05:3");
    await expect(overlay(page)).toHaveCount(0);
  });

  test("hotkeys work while covered, and pausing retracts it", async ({
    page,
    open,
  }) => {
    await page.clock.install();
    await open();

    await page.getByRole("button", { name: "5m", exact: true }).click();
    await page.getByRole("button", { name: "Start" }).click();
    await page.clock.fastForward("04:05");
    await page.clock.fastForward(1000);
    await expect(overlay(page)).toBeVisible();

    await page.keyboard.press("p");
    await expect
      .poll(async () => (await readBlob(page))?.status)
      .toBe("paused");
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

    // …and any tap dissolves it, permanently. The tap goes to the clock: it is
    // the only pressable surface below `sm`, and it works at every width.
    await tapClock(page);
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
            {
              id: "t1",
              title: "Ship it",
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
    await page.route("**/glu/api/todoist/task/*/time-total", (route) =>
      route.fulfill({
        json: { minutes: 0, counted: 0, ignored: 0, clamped: false },
      }),
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
        getComputedStyle(
          document.querySelector('[data-testid="takeover-overlay"]')!,
        ).zIndex,
      ),
      barZ: Number(
        getComputedStyle(document.querySelector('[data-testid="undo-bar"]')!)
          .zIndex,
      ),
    }));
    // Aesthetics never outrank an expiring choice.
    expect(layers.barZ).toBeGreaterThan(layers.overlayZ);

    await bar.getByRole("button", { name: "Undo" }).click();
    await expect(bar).toHaveCount(0);
  });

  /**
   * The clock rides *above* the overlay (that is what makes "everything except
   * the clock" literal), so the overlay never sees a tap that lands on it: the
   * clock has to honour that tap itself or the hero surface is the one place
   * the takeover ignores.
   */
  test("a tap on the clock itself dissolves the 00:00 takeover", async ({
    page,
    open,
  }) => {
    await page.clock.install();
    await open();

    await page.getByRole("button", { name: "5m", exact: true }).click();
    await page.getByRole("button", { name: "Start" }).click();
    await page.clock.fastForward("05:01");
    await expect(page.getByTestId("clock-slot")).toContainText("00:00");
    await expect(overlay(page)).toBeVisible();

    await tapClock(page);

    await expect(overlay(page)).toHaveCount(0);
    // The chrome the takeover was hiding is pressable again (ADR 10).
    await page.getByRole("button", { name: "Open header" }).click();
    await expect(page.getByRole("dialog")).toBeVisible();
  });

  /**
   * ADR 21 amendment (2026-07-25): the 00:00 cover persists *through* a
   * crossing, and a page load has none behind it — a reload restores the app,
   * not the endgame screen.
   */
  test("a reload at 00:00 comes back to the whole page", async ({
    page,
    open,
    seedStorage,
  }) => {
    await page.clock.install({ time: new Date("2026-07-24T09:00:00Z") });
    await seedStorage(
      seed({
        status: "finished",
        endAt: null,
        remaining: 0,
        total: 20 * MINUTE,
        runId: "finished-run",
        runningSince: null,
      }),
    );

    await open();
    await expect(page.getByTestId("clock-slot")).toContainText("00:00");
    await expect(overlay(page)).toHaveCount(0);

    // Header and transport are both there, no dismissal needed.
    await expect(
      page.getByRole("button", { name: "Open header" }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Start" }).click();
    await expect
      .poll(async () => (await readBlob(page))?.status)
      .toBe("running");
  });

  test("reduced motion crossfades instead of sweeping", async ({
    page,
    open,
  }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.clock.install();
    await open();

    await page.getByRole("button", { name: "5m", exact: true }).click();
    await page.getByRole("button", { name: "Start" }).click();
    await page.clock.fastForward("04:05");

    // Straight to `on`: no positional entrance phase at all.
    await expect(overlay(page)).toHaveAttribute("data-phase", "on");
    const transform = await overlay(page).evaluate(
      (el) => getComputedStyle(el).transform,
    );
    expect(["none", "matrix(1, 0, 0, 1, 0, 0)"]).toContain(transform);
  });
});

/**
 * ADR 21 amendment (2026-07-25): below `sm` there is no takeover at all. ADR 08
 * already gives the clock the entire first viewport there, so an overlay would
 * cover a screen that is nothing but clock — and take the page's scroll with
 * it. The half-tablet projects own this contract.
 */
test.describe("no takeover below `sm` (ADR 21)", () => {
  test.beforeEach(({}, testInfo) => {
    test.skip(
      !testInfo.project.name.includes("half-tablet"),
      "half-tablet contract",
    );
  });

  test("the final minute and 00:00 both leave the page whole", async ({
    page,
    open,
  }) => {
    await page.clock.install();
    await open();

    await page.getByRole("button", { name: "5m", exact: true }).click();
    await page.getByRole("button", { name: "Start" }).click();

    // Across the crossing, and well past it: nothing ever covers the page.
    await page.clock.fastForward("04:05");
    await expect(takeoverOverlay(page)).toHaveCount(0);
    await page.clock.fastForward("00:20");
    await expect(takeoverOverlay(page)).toHaveCount(0);

    // Not at 00:00 either, and the chrome below the fold is still scrollable to.
    await page.clock.fastForward("01:00");
    await expect(page.getByTestId("clock-slot")).toContainText("00:00");
    await expect(takeoverOverlay(page)).toHaveCount(0);

    await page.getByText("Music", { exact: true }).click();
    await expect
      .poll(async () => (await readBlob(page))?.environment)
      .toMatchObject({
        music: true,
      });
  });
});

/* ------------------------------------------------------------------------- */
/* ADR 26 — Privacy Policy and Terms of Service                               */
/* ------------------------------------------------------------------------- */

test.describe("legal pages (ADR 26)", () => {
  /**
   * The `open` fixture waits for `clock-slot`, which these routes deliberately
   * do not render — they are not the app shell. Relative path, never a leading
   * slash: that escapes the basePath (ADR 09's footgun).
   */
  const openDoc = async (
    page: import("@playwright/test").Page,
    path: "privacy" | "terms",
  ) => {
    await page.goto(path, { waitUntil: "load" });
  };

  test("the drawer links to both documents, in a new tab, under the basePath", async ({
    page,
    open,
  }) => {
    await open();
    await page.getByRole("button", { name: "Open header" }).click();

    const legal = page
      .getByRole("dialog")
      .getByRole("navigation", { name: "Legal" });
    for (const [name, path] of [
      ["Privacy Policy", "/glu/privacy"],
      ["Terms of Service", "/glu/terms"],
    ] as const) {
      const link = legal.getByRole("link", { name });
      // The whole point of `next/link`: a hand-written href would resolve to
      // ioan.dev/privacy — the sibling site's policy, which looks right.
      await expect(link).toHaveAttribute("href", path);
      await expect(link).toHaveAttribute("target", "_blank");
      await expect(link).toHaveAttribute("rel", "noopener noreferrer");
      const box = (await link.boundingBox())!;
      expect(box.height).toBeGreaterThanOrEqual(44);
    }
  });

  test("both routes render their document and cross-link to each other", async ({
    page,
  }) => {
    await openDoc(page, "privacy");
    await expect(
      page.getByRole("heading", { level: 1, name: "Privacy Policy" }),
    ).toBeVisible();
    await expect(page.getByText("Last updated:")).toBeVisible();
    await expect(page).toHaveTitle(/Privacy Policy/);
    // The claims the ADR holds the copy to.
    await expect(
      page.getByRole("heading", { name: /stored on your device/ }),
    ).toBeVisible();
    await expect(page.getByRole("heading", { name: /Todoist/ })).toBeVisible();

    await page
      .getByRole("navigation", { name: "Legal" })
      .getByRole("link", { name: "Terms of Service" })
      .click();

    await expect(
      page.getByRole("heading", { level: 1, name: "Terms of Service" }),
    ).toBeVisible();
    await expect(page).toHaveURL(/\/glu\/terms$/);
    await expect(page).toHaveTitle(/Terms of Service/);

    await page
      .getByRole("navigation", { name: "Legal" })
      .getByRole("link", { name: "Privacy Policy" })
      .click();
    await expect(page).toHaveURL(/\/glu\/privacy$/);
  });

  test("the documents scroll where the app deliberately does not", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1024, height: 768 });
    await openDoc(page, "terms");

    // The inverse of the ADR 02 layout contract: the shell's `overflow: hidden`
    // must not have leaked out of `.shell` and onto the document.
    const scrollable = await page.evaluate(
      () =>
        document.documentElement.scrollHeight >
        document.documentElement.clientHeight,
    );
    expect(scrollable).toBe(true);
  });

  test("back to GLU returns to the app under the basePath", async ({
    page,
    seedStorage,
  }) => {
    // The one test in this block that ends up *in the app*, so it is the one
    // that has to declare itself a returning visitor — `/glu` gates on that
    // now (ADR 31), and these routes bypass the `open` fixture that otherwise
    // says so.
    await seedStorage(seed());
    await openDoc(page, "privacy");
    await page.getByRole("link", { name: /Back to GLU/ }).click();
    await expect(page.getByTestId("clock-slot")).toBeVisible();
  });
});

/* ------------------------------------------------------------------------- */
/* ADR 29 — documentation: one page, opened as a modal from the drawer        */
/* ------------------------------------------------------------------------- */

test.describe("documentation (ADR 29)", () => {
  /**
   * Like the ADR 26 routes, `/glu/docs` is not the app shell, so the `open`
   * fixture's `clock-slot` wait does not apply. Relative path, never a leading
   * slash — that escapes the basePath (ADR 09's footgun).
   */
  const openDocsPage = (page: import("@playwright/test").Page) =>
    page.goto("docs", { waitUntil: "load" });

  const openDocsModal = async (page: import("@playwright/test").Page) => {
    await page.getByRole("button", { name: "Open header" }).click();
    await page.getByRole("dialog").getByText("Docs").click();
    await expect(page.getByTestId("docs-modal-body")).toBeVisible();
  };

  /** The whole point of the ADR: the drawer opens a modal, it does not navigate. */
  test("the Docs row opens a modal without leaving the app", async ({
    page,
    open,
  }) => {
    await open();
    const before = page.url();

    await openDocsModal(page);

    expect(page.url()).toBe(before);
    // The app is still mounted behind the overlay — a navigation would have
    // taken the clock with it, along with the wake lock and the primed audio
    // context that never survive a page teardown.
    await expect(page.getByTestId("clock-slot")).toBeAttached();
    await expect(
      page.getByRole("heading", { name: "The timer" }),
    ).toBeVisible();

    // One Escape closes the whole overlay stack — the modal *and* the drawer
    // behind it. Mantine's overlays both listen on the window, so the keydown
    // reaches both; verified identical for the Settings modal, and matching its
    // twin beats a bespoke escape hatch for one row (ADR 29 deviation).
    await page.keyboard.press("Escape");
    await expect(page.getByTestId("docs-modal-body")).toHaveCount(0);
    await expect(page.getByRole("dialog")).toHaveCount(0);
    // What matters: the app was never left, and is still there to go back to.
    await expect(page.getByTestId("clock-slot")).toBeVisible();
    expect(page.url()).toBe(before);
  });

  test("a running timer keeps counting behind the docs modal", async ({
    page,
    open,
  }) => {
    await page.clock.install();
    await open();
    await page.getByRole("button", { name: "Start" }).click();

    await openDocsModal(page);

    /**
     * Read the countdown rather than assert a fixed "19:00": the installed
     * clock still advances in real time, and opening this modal costs a chunk
     * fetch plus a long document's worth of DOM — enough drift to make an exact
     * readout a flake, not a failure.
     */
    const remainingSeconds = async () => {
      const text = (await page.getByTestId("clock-slot").textContent()) ?? "";
      const match = text.match(/(\d{1,2}):(\d{2})/);
      return match ? Number(match[1]) * 60 + Number(match[2]) : NaN;
    };

    const before = await remainingSeconds();
    await page.clock.fastForward("01:00");
    await expect.poll(remainingSeconds).toBeLessThanOrEqual(before - 60);
  });

  /**
   * The modal header is `position: sticky` above the longest scroll in the app,
   * which makes its background structural rather than decorative: while it was
   * `transparent`, the prose scrolled straight through "How GLU works" (owner
   * report 2026-07-25). Same header class serves the drawer and the Settings
   * modal, so this covers all three.
   */
  test("the sticky modal header keeps the scrolling prose behind it", async ({
    page,
    open,
  }) => {
    await page.setViewportSize({ width: 1024, height: 768 });
    await open();
    await openDocsModal(page);

    const header = await page.evaluate(() => {
      const body = document.querySelector('[data-testid="docs-modal-body"]')!;
      // The modal content is the scroller; the sticky header is inside it.
      const scroller = body.closest('[class*="Modal-content"]') as HTMLElement;
      // The header's own text is the title too, so take the *innermost* match —
      // preorder puts the header first and the title element last.
      const title = [...scroller.querySelectorAll<HTMLElement>("*")]
        .filter((el) => el.textContent?.trim() === "How GLU works")
        .at(-1)!;
      const titleParent = title.parentElement!;
      scroller.scrollTop = 400;
      const style = getComputedStyle(titleParent);
      return {
        scrolled: scroller.scrollTop,
        position: style.position,
        background: style.backgroundColor,
        top: titleParent.getBoundingClientRect().top,
        scrollerTop: scroller.getBoundingClientRect().top,
      };
    });

    expect(header.scrolled).toBeGreaterThan(0);
    expect(header.position).toBe("sticky");
    // Opaque, whatever the chrome direction: a computed colour serializes as
    // `rgba(…)` exactly when its alpha is below 1, and `transparent` as
    // `rgba(0, 0, 0, 0)` — the defect this test exists for.
    expect(header.background).toMatch(/^rgb\(/);
    // Still pinned to the top of the scroller after the scroll.
    expect(Math.abs(header.top - header.scrollerTop)).toBeLessThan(2);
  });

  test("the closing navigation offers both documents and the shareable page", async ({
    page,
    open,
  }) => {
    await open();
    await openDocsModal(page);

    const nav = page.getByRole("navigation", { name: "Docs navigation" });
    for (const [name, href] of [
      ["Privacy Policy", "/glu/privacy"],
      ["Terms of Service", "/glu/terms"],
      ["Open as a page", "/glu/docs"],
    ] as const) {
      const link = nav.getByRole("link", { name });
      // basePath applied — a hand-written `/privacy` would resolve to the
      // sibling site's policy (ADR 26's failure mode, unchanged here).
      await expect(link).toHaveAttribute("href", href);
      // New tab: the app behind this overlay must survive the click.
      await expect(link).toHaveAttribute("target", "_blank");
      await expect(link).toHaveAttribute("rel", "noopener noreferrer");
      const box = (await link.boundingBox())!;
      expect(box.height).toBeGreaterThanOrEqual(44);
    }
  });

  test("the route renders the same document and scrolls", async ({ page }) => {
    await page.setViewportSize({ width: 1024, height: 768 });
    await openDocsPage(page);

    await expect(
      page.getByRole("heading", { level: 1, name: "How GLU works" }),
    ).toBeVisible();
    await expect(page).toHaveTitle(/How GLU works/);
    await expect(page.getByText("Last updated:")).toBeVisible();

    // A sample of the claim list — a section vanishing is a defect, not a tweak.
    for (const heading of [
      "The timer",
      "Keyboard shortcuts",
      "Environment toggles",
      "Todoist (optional)",
      "Limits, honestly",
    ]) {
      await expect(page.getByRole("heading", { name: heading })).toBeVisible();
    }

    // The inverse of the ADR 02 layout contract, as for the legal routes.
    const scrollable = await page.evaluate(
      () =>
        document.documentElement.scrollHeight >
        document.documentElement.clientHeight,
    );
    expect(scrollable).toBe(true);
  });

  test("the three documents cross-link both ways", async ({ page }) => {
    await openDocsPage(page);

    await page
      .getByRole("navigation", { name: "Legal" })
      .getByRole("link", { name: "Privacy Policy" })
      .click();
    await expect(page).toHaveURL(/\/glu\/privacy$/);

    // ADR 29 gave the legal footers a way back — three documents that only
    // linked one way would be a chain, not a set.
    await page
      .getByRole("navigation", { name: "Legal" })
      .getByRole("link", { name: "Documentation" })
      .click();
    await expect(page).toHaveURL(/\/glu\/docs$/);
    await expect(
      page.getByRole("heading", { level: 1, name: "How GLU works" }),
    ).toBeVisible();
  });

  test("back to GLU returns to the app under the basePath", async ({
    page,
    seedStorage,
  }) => {
    // As in the ADR 26 block: this one lands in the app, so it seeds a
    // returning visitor past ADR 31's gate.
    await seedStorage(seed());
    await openDocsPage(page);
    await page.getByRole("link", { name: /Back to GLU/ }).click();
    await expect(page.getByTestId("clock-slot")).toBeVisible();
  });
});

/* ------------------------------------------------------------------------- */
/* ADR 39 — Limit the items in a section                                      */
/* ------------------------------------------------------------------------- */

test.describe("section item limit (ADR 39)", () => {
  type Page = import("@playwright/test").Page;

  /** Twelve tasks under one section header — one ceiling away from a long list. */
  const twelve = {
    items: Array.from({ length: 12 }, (_, i) => ({
      id: String(i + 1),
      title: `Task ${i + 1}`,
      description: "",
      uiPriority: 4,
      sectionId: "s1",
      order: i,
    })),
    truncated: false,
    cap: 200,
  };

  const stubTaskView = async (page: Page) => {
    await page.route("**/glu/api/auth/todoist/status", (route) =>
      route.fulfill({ json: { authenticated: true, name: "Ioan", id: "42" } }),
    );
    await page.route("**/glu/api/todoist/projects", (route) =>
      route.fulfill({ json: { items: [{ id: "p1", name: "GLU" }] } }),
    );
    await page.route("**/glu/api/todoist/labels", (route) =>
      route.fulfill({ json: { items: [] } }),
    );
    await page.route("**/glu/api/todoist/filters", (route) =>
      route.fulfill({ json: { items: [] } }),
    );
    await page.route("**/glu/api/todoist/sections**", (route) =>
      route.fulfill({
        json: { items: [{ id: "s1", name: "Today", order: 1 }] },
      }),
    );
    await page.route("**/glu/api/todoist/tasks**", (route) =>
      route.fulfill({ json: twelve }),
    );
  };

  test("the ladder caps a section, +N more lifts it, and a reload restores the ceiling", async ({
    page,
    open,
  }) => {
    await stubTaskView(page);
    await open();

    await page.getByRole("button", { name: "Choose task source" }).click();
    await page.getByPlaceholder("Choose a project").click();
    await page.getByRole("option", { name: "GLU" }).click();

    // Default is All: every task, exactly as before this ADR.
    await expect(page.getByTestId("task-card")).toHaveCount(12);

    // Through the real surface: drawer → Settings → the ladder.
    await page.getByRole("button", { name: "Open header" }).click();
    await page.getByRole("dialog").getByText("Settings").click();
    const settings = page.getByRole("dialog").last();
    const ladder = settings.getByRole("radiogroup", {
      name: "Limit the items in a section to",
    });
    await expect(
      ladder.getByRole("radio", { name: "All", exact: true }),
    ).toBeChecked();
    // `exact` throughout: "10" is a substring of "100".
    await ladder.getByText("10", { exact: true }).click();
    await expect(
      ladder.getByRole("radio", { name: "10", exact: true }),
    ).toBeChecked();
    await page.getByRole("button", { name: "Close settings" }).click();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toHaveCount(0);

    await expect(page.getByTestId("task-card")).toHaveCount(10);
    const more = page.getByRole("button", { name: "+2 more" });
    await expect(more).toBeVisible();

    // One tap gets the tail back…
    await more.click();
    await expect(page.getByTestId("task-card")).toHaveCount(12);
    await expect(page.getByRole("button", { name: /more$/ })).toHaveCount(0);

    // …for this visit only. The setting is the durable answer, not the tap.
    await page.reload({ waitUntil: "load" });
    await expect(page.getByTestId("task-card")).toHaveCount(10);
    await expect(page.getByRole("button", { name: "+2 more" })).toBeVisible();
  });
});
