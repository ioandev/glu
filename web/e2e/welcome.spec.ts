import { expect, readBlob, seed, test } from "./fixtures";

/**
 * ADR 31 — the welcome gate.
 *
 * Every test here drives `page.goto` directly rather than the `open` fixture.
 * That fixture exists to produce a *returning* user (it plants an entered blob
 * so the other ~330 tests reach the clock), which is precisely the state this
 * file needs to not be in. Relative paths, never a leading slash: that escapes
 * the basePath (ADR 09's footgun).
 */
test.describe("welcome gate (ADR 31)", () => {
  const HEADLINE = "A focus timer for the tablet on your desk.";

  test("a first visit to /glu shows the welcome and no clock", async ({ page }) => {
    await page.goto(".", { waitUntil: "load" });

    await expect(page.getByRole("heading", { level: 1, name: HEADLINE })).toBeVisible();
    await expect(page.getByTestId("enter-app")).toBeVisible();
    // The gate replaces the shell rather than covering it — no timer is
    // running behind this page.
    await expect(page.getByTestId("clock-slot")).toHaveCount(0);
  });

  test("the call to action reveals the app in place, and the choice sticks", async ({ page }) => {
    await page.goto(".", { waitUntil: "load" });
    await page.getByTestId("enter-app").click();

    // In place: no navigation, so the URL is untouched.
    await expect(page.getByTestId("clock-slot")).toBeVisible();
    expect(new URL(page.url()).pathname.replace(/\/$/, "")).toBe("/glu");
    expect(await readBlob(page)).toMatchObject({ hasEnteredApp: true });

    // And a reload goes straight to the app, with no frame of the welcome.
    await page.reload({ waitUntil: "load" });
    await expect(page.getByTestId("clock-slot")).toBeVisible();
    await expect(page.getByRole("heading", { level: 1, name: HEADLINE })).toHaveCount(0);
  });

  test("a blob written before the gate existed never sees it", async ({
    page,
    seedStorage,
    open,
  }) => {
    // The exact shape of an existing user's storage: a v2 blob with no opinion
    // on `hasEnteredApp`, because the field did not exist when it was written.
    const { hasEnteredApp, ...before } = seed({ activeClockId: "terminal" }).state;
    void hasEnteredApp;
    await seedStorage({ version: 2, state: before });

    await open();
    // Straight to the app, and the rest of the blob came with it.
    await expect(page.getByTestId("clock-slot")).toBeVisible();
    expect(await readBlob(page)).toMatchObject({ activeClockId: "terminal" });

    // The resolved value is in memory at this point but not yet on disk:
    // `persist` writes on `set`, and a rehydrate that did not migrate does not
    // write back. So provoke any write and check it lands — otherwise the flag
    // would be re-derived on every load rather than settled once.
    await page.getByRole("button", { name: "45m", exact: true }).click();
    await expect.poll(async () => (await readBlob(page))?.hasEnteredApp).toBe(true);
  });

  test("/glu/welcome is a real page, and its CTA lands on the app", async ({ page }) => {
    await page.goto("welcome", { waitUntil: "load" });

    await expect(page.getByRole("heading", { level: 1, name: HEADLINE })).toBeVisible();

    const cta = page.getByTestId("enter-app");
    // `next/link`, so the basePath is applied — a hand-written href would send
    // the reader to ioan.dev's root.
    await expect(cta).toHaveAttribute("href", "/glu");

    await cta.click();
    // The loop this guards against: entering without the flag bounces off the
    // gate and lands right back on the welcome.
    await expect(page.getByTestId("clock-slot")).toBeVisible();
    await expect(page.getByRole("heading", { level: 1, name: HEADLINE })).toHaveCount(0);
  });

  test("/glu/welcome stays readable for someone who has already entered", async ({
    page,
    seedStorage,
  }) => {
    await seedStorage(seed());
    await page.goto("welcome", { waitUntil: "load" });

    await expect(page.getByRole("heading", { level: 1, name: HEADLINE })).toBeVisible();
  });

  test("the welcome renders server-side, with prose a crawler can read", async ({ request }) => {
    // Not `page`: this is the no-JavaScript view, which is the whole reason
    // the route exists alongside the client gate.
    const html = await (await request.get("welcome")).text();

    expect(html).toContain(HEADLINE);
    // The roster size is interpolated from `CLOCK_COUNT`, never written out
    // (ADR 42/44) — this line used to assert "eighteen", which stopped being
    // true two clock sets ago and said so in the pitch until ADR 44 caught it.
    expect(html).toMatch(/\d+ clock designs/);
    expect(html).toContain('rel="canonical"');
    expect(html).toContain("https://ioan.dev/glu/welcome");
  });

  test("it fits its width, and everything tappable is thumb-sized", async ({ page }) => {
    await page.goto("welcome", { waitUntil: "load" });

    // No horizontal page scroll, ever — including at 590 px, where this test
    // also runs (UI.md's fixed constraints).
    const overflows = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    );
    expect(overflows).toBe(false);

    // The CTA plus the four footer links. 44 px is the floor for a page read
    // on a tablet, mid-focus, with a thumb.
    const targets = page.locator('[data-testid="enter-app"], nav[aria-label="About GLU"] a');
    const count = await targets.count();
    expect(count).toBe(5);
    for (let i = 0; i < count; i++) {
      const box = await targets.nth(i).boundingBox();
      expect(box!.height).toBeGreaterThanOrEqual(44);
    }
  });

  test("its links stay under the basePath", async ({ page }) => {
    await page.goto("welcome", { waitUntil: "load" });

    const nav = page.getByRole("navigation", { name: "About GLU" });
    for (const [name, path] of [
      ["How GLU works", "/glu/docs"],
      ["Privacy Policy", "/glu/privacy"],
      ["Terms of Service", "/glu/terms"],
    ] as const) {
      await expect(nav.getByRole("link", { name })).toHaveAttribute("href", path);
    }
  });
});
