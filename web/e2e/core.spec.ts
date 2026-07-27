import { defaultState, expect, readBlob, seed, test } from "./fixtures";

/** ADR 09 core block — the ADR 01–03 surface. */
test.describe("app loads under /glu", () => {
  test("@smoke serves the app with no 404s and a clean console", async ({
    page,
    open,
    consoleErrors,
  }) => {
    // The E2E harness runs no Express process (ADR 09: the Playwright block
    // stubs `/status`), so the Todoist probe is answered here rather than left
    // to 404 against the Next server.
    await page.route("**/glu/api/auth/todoist/status", (route) =>
      route.fulfill({ json: { authenticated: false } }),
    );

    const failures: string[] = [];
    page.on("response", (response) => {
      if (response.status() >= 400) failures.push(`${response.status()} ${response.url()}`);
    });

    await open();

    // ADR 30 replaced the bare "GLU": two characters is a fine tab label and a
    // useless search result. The rest of the head is asserted in metadata.spec.
    await expect(page).toHaveTitle("GLU — pomodoro and focus timer");
    await expect(page.getByTestId("clock-slot")).toBeVisible();
    expect(failures, "no request may 404 during load").toEqual([]);
    expect(consoleErrors).toEqual([]);
  });

  test("every navigation stays under the basePath", async ({ page, open }) => {
    await open();
    expect(new URL(page.url()).pathname.startsWith("/glu")).toBe(true);
  });

  test("@smoke the health endpoint answers under the basePath", async ({ request, baseURL }) => {
    const response = await request.get(new URL("healthz", baseURL).toString());
    expect(response.status()).toBe(200);
    expect(await response.json()).toMatchObject({ ok: true });
  });
});

test.describe("timer lifecycle", () => {
  test.beforeEach(async ({ page }) => {
    // Must be installed before the first navigation or the app captures the
    // real clock (ADR 09).
    await page.clock.install();
  });

  test("@smoke start, pause, resume and stop", async ({ page, open }) => {
    await open();

    await page.getByRole("button", { name: "Start" }).click();
    await page.clock.fastForward("00:30");
    await expect(page.getByTestId("clock-slot")).toContainText("19:30");

    await page.getByRole("button", { name: "Pause" }).click();
    await page.clock.fastForward("01:00");
    await expect(page.getByTestId("clock-slot")).toContainText("19:30");

    await page.getByRole("button", { name: "Resume" }).click();
    await page.clock.fastForward("00:30");
    await expect(page.getByTestId("clock-slot")).toContainText("19:00");

    await page.getByRole("button", { name: "Stop" }).click();
    await expect(page.getByTestId("clock-slot")).toContainText("20:00");
  });

  test("the transport is two live buttons, and Stop never moves (ADR 37)", async ({
    page,
    open,
  }) => {
    await open();

    const stop = page.getByRole("button", { name: "Stop" });
    const anchor = (await stop.boundingBox())!.x;
    // The whole point of the toggle: no state has a dead target in it.
    const noneDisabled = async () =>
      await expect(page.locator("button:disabled")).toHaveCount(0);

    for (const [press, next] of [
      ["Start", "Pause"],
      ["Pause", "Resume"],
      ["Resume", "Pause"],
    ] as const) {
      await page.getByRole("button", { name: press, exact: true }).click();
      await expect(page.getByRole("button", { name: next, exact: true })).toBeVisible();
      await noneDisabled();
      // A relabelling button that changed width would shove Stop sideways.
      expect((await stop.boundingBox())!.x).toBe(anchor);
    }

    await stop.click();
    await expect(page.getByRole("button", { name: "Start", exact: true })).toBeVisible();
    await noneDisabled();
  });

  test("a whole 20-minute session completes without waiting for it", async ({ page, open }) => {
    await open();
    await page.getByRole("button", { name: "Start" }).click();
    await page.clock.fastForward("20:01");
    // Assert on the finished UI state, not elapsed wall time — the display tick is
    // display cadence, not the source of truth (ADR 09).
    await expect(page.getByTestId("clock-slot")).toContainText("00:00");
    expect((await readBlob(page))?.status).toBe("finished");
  });

  test("presets set the timer, running or not", async ({ page, open }) => {
    await open();
    await page.getByRole("button", { name: "5m", exact: true }).click();
    await expect(page.getByTestId("clock-slot")).toContainText("05:00");

    await page.getByRole("button", { name: "Start" }).click();
    await page.clock.fastForward("00:10");
    await page.getByRole("button", { name: "30m", exact: true }).click();
    await expect(page.getByTestId("clock-slot")).toContainText("30:00");
    expect((await readBlob(page))?.status).toBe("running");
  });

  test("± changes remaining by exactly that many minutes", async ({ page, open }) => {
    await open();
    await page.getByRole("button", { name: "10m", exact: true }).click();
    await page.getByRole("button", { name: /Add 5 minutes/ }).click();
    await expect(page.getByTestId("clock-slot")).toContainText("15:00");
    await page.getByRole("button", { name: /Subtract 1 minute/ }).click();
    await expect(page.getByTestId("clock-slot")).toContainText("14:00");
  });

  test("± at 00:00 sets the next run, and the row shows it (ADR 32)", async ({ page, open }) => {
    await open();
    await page.getByRole("button", { name: "5m", exact: true }).click();
    await page.getByRole("button", { name: "Start" }).click();
    await page.clock.fastForward("05:01");
    await expect(page.getByTestId("clock-slot")).toContainText("00:00");

    // The takeover owns the whole page at 00:00 above `sm` (ADR 21); one tap is
    // what a real user does to reach the controls under it.
    await page.getByTestId("clock-slot").click();

    const custom = page.getByRole("button", { name: "3m", exact: true });
    await expect(custom).toHaveCount(0);
    await page.getByRole("button", { name: /Subtract 1 minute/ }).click();
    await page.getByRole("button", { name: /Subtract 1 minute/ }).click();

    // The reported bug, end to end: the adjustment has to survive Start.
    await expect(custom).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByTestId("clock-slot")).toContainText("03:00");
    await page.getByRole("button", { name: "Start" }).click();
    await page.clock.fastForward("00:10");
    await expect(page.getByTestId("clock-slot")).toContainText("02:50");
    await expect(custom).toHaveAttribute("aria-pressed", "true");

    await page.getByRole("button", { name: "Stop" }).click();
    await expect(page.getByTestId("clock-slot")).toContainText("03:00");

    // Back on the ladder, the custom rung has nothing left to show.
    await page.getByRole("button", { name: "10m", exact: true }).click();
    await expect(custom).toHaveCount(0);
  });
});

test.describe("restore paths", () => {
  test("@smoke reload while running keeps counting from endAt", async ({
    page,
    open,
    seedStorage,
  }) => {
    await page.clock.install({ time: new Date("2026-07-24T09:00:00Z") });
    await seedStorage(
      seed({
        status: "running",
        endAt: new Date("2026-07-24T09:07:00Z").getTime(),
        remaining: 7 * 60_000,
        total: 20 * 60_000,
        runId: "seeded",
        runningSince: new Date("2026-07-24T08:47:00Z").getTime(),
      }),
    );

    await open();
    await expect(page.getByTestId("clock-slot")).toContainText("07:00");

    // Pause the fake clock so the reload itself cannot consume run time.
    await page.clock.pauseAt(new Date("2026-07-24T09:02:00Z"));
    await page.reload({ waitUntil: "load" });
    await expect(page.getByTestId("clock-slot")).toContainText("05:00");
    expect((await readBlob(page))?.status).toBe("running");
  });

  test("reload while paused restores the same remaining", async ({ page, open, seedStorage }) => {
    await seedStorage(
      seed({ status: "paused", remaining: 9 * 60_000, total: 20 * 60_000, runId: "seeded" }),
    );
    await open();
    await expect(page.getByTestId("clock-slot")).toContainText("09:00");
    await page.reload({ waitUntil: "load" });
    await expect(page.getByTestId("clock-slot")).toContainText("09:00");
  });

  test("@smoke reload after expiry loads straight into finished, silently", async ({
    page,
    open,
    seedStorage,
  }) => {
    await page.clock.install({ time: new Date("2026-07-24T09:00:00Z") });
    await seedStorage(
      seed({
        status: "running",
        endAt: new Date("2026-07-24T08:50:00Z").getTime(),
        remaining: 0,
        total: 10 * 60_000,
        runId: "expired",
        runningSince: new Date("2026-07-24T08:40:00Z").getTime(),
      }),
    );

    await open();
    await expect(page.getByTestId("clock-slot")).toContainText("00:00");
    expect((await readBlob(page))?.status).toBe("finished");
  });

  test("a corrupt blob loads clean defaults", async ({ page, open }) => {
    await page.addInitScript(() => {
      if (!window.localStorage.getItem("glu:v2")) {
        window.localStorage.setItem("glu:v2", "{not json");
      }
    });
    await open();
    await expect(page.getByTestId("clock-slot")).toContainText("20:00");
  });
});

test.describe("environment toggles", () => {
  test("Silence is exclusive and Headphones is orthogonal", async ({ page, open }) => {
    await open();
    await page.getByText("Music", { exact: true }).click();
    await page.getByText("Headphones", { exact: true }).click();
    await page.getByText("Silence", { exact: true }).click();

    await expect
      .poll(async () => (await readBlob(page))?.environment)
      .toMatchObject({ silence: true, music: false, headphones: true });

    await page.getByText("Podcast", { exact: true }).click();
    await expect
      .poll(async () => (await readBlob(page))?.environment)
      .toMatchObject({ silence: false, podcast: true, headphones: true });
  });

  test("toggles survive a reload", async ({ page, open }) => {
    await open();
    await page.getByText("Noisy", { exact: true }).click();
    await page.reload({ waitUntil: "load" });
    await expect.poll(async () => (await readBlob(page))?.environment.noisy).toBe(true);
  });
});

test.describe("theming", () => {
  test("the scheme choice survives a reload with no hydration warning", async ({
    page,
    open,
    consoleErrors,
  }) => {
    await open();
    const before = await page.locator("html").getAttribute("data-mantine-color-scheme");

    // The toggle lives in ADR 10's drawer now, not in the corner.
    await page.getByRole("button", { name: "Open header" }).click();
    await page.getByRole("dialog").getByText("Appearance").click();

    const after = await page.locator("html").getAttribute("data-mantine-color-scheme");
    expect(after).not.toBe(before);

    await page.reload({ waitUntil: "load" });
    await expect(page.locator("html")).toHaveAttribute("data-mantine-color-scheme", after!);
    expect(consoleErrors).toEqual([]);
  });
});

test.describe("the layout contract", () => {
  test("honours the two breakpoints", async ({ page, open }, testInfo) => {
    await open();
    const geometry = await page.evaluate(() => {
      const rect = (selector: string) => {
        const element = document.querySelector(selector);
        return element ? element.getBoundingClientRect().toJSON() : null;
      };
      return {
        timer: rect('[aria-label="Timer"]'),
        toggles: rect('[aria-label="Environment toggles"]'),
        reserved: rect('[aria-label="Todoist area"]'),
        viewportWidth: window.innerWidth,
        viewportHeight: window.innerHeight,
        scrollHeight: document.documentElement.scrollHeight,
        scrollWidth: document.documentElement.scrollWidth,
      };
    });

    // Never, at either breakpoint.
    expect(geometry.scrollWidth).toBeLessThanOrEqual(geometry.viewportWidth);

    if (testInfo.project.name.includes("half-tablet")) {
      // ADR 08: the clock owns the first viewport and the page scrolls.
      expect(geometry.timer!.width).toBeCloseTo(geometry.viewportWidth, 0);
      expect(geometry.reserved!.width).toBeCloseTo(geometry.viewportWidth, 0);
      expect(geometry.scrollHeight).toBeGreaterThan(geometry.viewportHeight);
    } else {
      // ADR 02: timer left half, toggles bottom-right, no page scroll.
      expect(Math.round(geometry.timer!.width)).toBe(Math.round(geometry.viewportWidth / 2));
      expect(geometry.toggles!.left).toBeGreaterThanOrEqual(geometry.timer!.right - 1);
      expect(geometry.reserved!.top).toBeLessThan(geometry.toggles!.top);
      expect(geometry.scrollHeight).toBeLessThanOrEqual(geometry.viewportHeight + 1);
    }
  });

  test("every interactive element clears the 44 px touch floor", async ({ page, open }) => {
    await open();
    const tooSmall = await page.evaluate(() => {
      // The measured target is the *hit* area: for the switch that is the whole
      // body (label + track), not the 24px visual pill.
      const targets = document.querySelectorAll<HTMLElement>(
        "button, [role='button'], a, .mantine-Chip-label, .mantine-Switch-body",
      );
      return [...targets]
        .filter((element) => element.offsetParent !== null)
        .map((element) => {
          const box = element.getBoundingClientRect();
          return { label: element.textContent?.slice(0, 20) ?? "", min: Math.min(box.width, box.height) };
        })
        .filter((entry) => entry.min < 44);
    });
    expect(tooSmall).toEqual([]);
  });
});

test.describe("the seeded-state helper", () => {
  test("defaults match the app's own first-run state", async ({ page, open }) => {
    await open();
    await page.getByText("Music", { exact: true }).click();
    const blob = await readBlob(page);
    expect(Object.keys(blob!).sort()).toEqual(Object.keys(defaultState).sort());
  });
});
