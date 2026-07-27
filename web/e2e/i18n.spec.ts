import { expect, seed, test } from "./fixtures";

/**
 * ADR 44. The rest of the suite is pinned to English by `open()`; this file is
 * the one that deliberately says otherwise.
 *
 * What is worth testing here is **the plumbing, not the translations.** That a
 * German string is spelled correctly is a review question. That the cookie
 * beats the header, that the choice survives a reload, that "Automatic" really
 * un-chooses, and that `<html lang>` follows all three — those are the things
 * that break silently and that nothing else can see.
 */

/** Overrides the English cookie `open()` plants. */
async function pinLocale(page: import("@playwright/test").Page, baseURL: string, value: string) {
  const { hostname } = new URL(baseURL);
  await page.context().addCookies([
    { name: "glu-locale", value, domain: hostname, path: "/" },
  ]);
}

test.describe("locale resolution (ADR 44)", () => {
  test("defaults to English with no cookie and no preference", async ({ page, open }) => {
    await open();
    await expect(page.locator("html")).toHaveAttribute("lang", "en");
  });

  test("a cookie decides the language", async ({ page, open, baseURL }) => {
    await open();
    await pinLocale(page, baseURL!, "de");
    await page.reload({ waitUntil: "load" });
    await expect(page.locator("html")).toHaveAttribute("lang", "de");
  });

  /*
   * The browser's own preference, with no cookie at all. This is the path a
   * genuine first visit takes, and it is the one `open()`'s pin hides from
   * every other test — so it gets its own context rather than the fixture's.
   */
  test("falls back to Accept-Language when nothing is stored", async ({ browser, baseURL }) => {
    const context = await browser.newContext({ locale: "fr-FR" });
    const page = await context.newPage();
    await page.addInitScript(() => {
      window.localStorage.setItem(
        "glu:v2",
        JSON.stringify({ state: { hasEnteredApp: true }, version: 2 }),
      );
    });
    await page.goto(baseURL!, { waitUntil: "load" });
    await expect(page.locator("html")).toHaveAttribute("lang", "fr");
    await context.close();
  });

  test("collapses Traditional Chinese onto the Simplified catalog", async ({
    browser,
    baseURL,
  }) => {
    const context = await browser.newContext({ locale: "zh-TW" });
    const page = await context.newPage();
    await page.addInitScript(() => {
      window.localStorage.setItem(
        "glu:v2",
        JSON.stringify({ state: { hasEnteredApp: true }, version: 2 }),
      );
    });
    await page.goto(baseURL!, { waitUntil: "load" });
    await expect(page.locator("html")).toHaveAttribute("lang", "zh-Hans");
    await context.close();
  });

  test("an unknown cookie value falls back rather than breaking the page", async ({
    page,
    open,
    baseURL,
  }) => {
    await open();
    await pinLocale(page, baseURL!, "klingon");
    await page.reload({ waitUntil: "load" });
    // Still renders, still a real locale — the cookie is user-writable and must
    // not be able to produce a language with no catalog.
    await expect(page.locator("html")).toHaveAttribute("lang", "en");
    await expect(page.getByTestId("clock-slot")).toBeVisible();
  });
});

test.describe("the Language row (ADR 44)", () => {
  /**
   * Drawer → Settings → the Language row's combobox. Mirrors
   * `features.spec.ts`'s `openSettings`, but the drawer entry is matched by
   * regex because this is the one spec where the chrome may not be in English.
   */
  async function openLanguageRow(page: import("@playwright/test").Page, settingsName: RegExp) {
    await page.getByRole("button", { name: /^(Open header|Kopfzeile öffnen)$/ }).click();
    await page.getByRole("dialog").getByText(settingsName).click();
    const row = page.getByTestId("setting-language");
    await row.waitFor();
    return row.getByRole("combobox");
  }

  test("switches the whole app, persists, and can be un-chosen", async ({ page, open }) => {
    await open();
    await expect(page.locator("html")).toHaveAttribute("lang", "en");

    const combo = await openLanguageRow(page, /^Settings$/);
    await expect(combo).toHaveValue("Automatic");

    await combo.click();
    await page.getByRole("option", { name: "Deutsch", exact: true }).click();

    // `router.refresh()` re-renders the server tree — no reload involved.
    await expect(page.locator("html")).toHaveAttribute("lang", "de");
    // The row itself is now German, which is the proof the catalog reached the
    // client and not just the `lang` attribute.
    await expect(page.getByTestId("setting-language")).toContainText("Sprache");

    // The mirror in the blob (ADR 44: a mirror, not the source).
    await expect
      .poll(async () =>
        page.evaluate(() => JSON.parse(localStorage.getItem("glu:v2")!).state.locale),
      )
      .toBe("de");

    // Survives a reload, which is the cookie doing the work.
    await page.reload({ waitUntil: "load" });
    await expect(page.locator("html")).toHaveAttribute("lang", "de");

    // And "Automatic" really un-chooses: the cookie goes away and the browser's
    // own preference (English, in this run) takes over again.
    const combo2 = await openLanguageRow(page, /^Einstellungen$/);
    await combo2.click();
    await page.getByRole("option", { name: "Automatisch", exact: true }).click();
    await expect(page.locator("html")).toHaveAttribute("lang", "en");
    await expect
      .poll(async () => page.evaluate(() => document.cookie.includes("glu-locale=")))
      .toBe(false);
  });

  test("offers Automatic plus every locale, named in its own language", async ({ page, open }) => {
    await open();
    const combo = await openLanguageRow(page, /^Settings$/);
    await combo.click();
    await expect(page.getByRole("option")).toHaveText([
      "Automatic",
      "English",
      "Español",
      "简体中文",
      "Français",
      "Português",
      "Deutsch",
    ]);
  });
});

test.describe("the prose documents (ADR 44)", () => {
  /*
   * The point of these is that the text is *in the HTML*. The manual and the
   * two legal documents are per-locale server modules precisely so `/glu/docs`
   * keeps serving its prose as markup rather than as a payload — a regression
   * to a client hook would still look right in a browser and would still pass
   * a naive assertion, so these check the server response body itself.
   */
  const documents = [
    { path: "docs", en: "How GLU works", de: "So funktioniert GLU", fr: "Comment fonctionne GLU" },
    { path: "privacy", en: "Privacy Policy", de: "Datenschutzerklärung", fr: "Politique de confidentialité" },
    { path: "terms", en: "Terms of Service", de: "Nutzungsbedingungen", fr: "Conditions d’utilisation" },
  ] as const;

  for (const doc of documents) {
    test(`/${doc.path} renders server-side in the cookie's language`, async ({
      request,
      baseURL,
    }) => {
      const url = `${baseURL}${doc.path}`;

      // The `<h1>` specifically, not "appears anywhere": the document title in
      // `<head>` is still English at every locale until page metadata is
      // localised, so a whole-body check would assert the wrong thing.
      const h1 = (html: string) => /<h1[^>]*>([^<]*)<\/h1>/.exec(html)?.[1] ?? "";

      const english = await (await request.get(url)).text();
      expect(english).toContain('<html lang="en"');
      expect(h1(english)).toBe(doc.en);

      const german = await (
        await request.get(url, { headers: { Cookie: "glu-locale=de" } })
      ).text();
      expect(german).toContain('<html lang="de"');
      expect(h1(german)).toBe(doc.de);
    });
  }

  test("a translated legal document says the English one governs", async ({
    page,
    baseURL,
  }) => {
    /*
     * Checked through the DOM, not the response body. The client provider
     * serialises the whole message catalog into the payload, so *every* page
     * contains the words "convenience translation" somewhere — the question is
     * only whether the notice is rendered.
     */
    const notice = page.locator('[data-testid="translation-notice"]');

    await pinLocale(page, baseURL!, "fr");
    await page.goto(`${baseURL}privacy`, { waitUntil: "load" });
    await expect(notice).toBeVisible();
    await expect(notice).toContainText("traduction de courtoisie");

    // The authoritative text does not claim to be a translation of itself.
    await pinLocale(page, baseURL!, "en");
    await page.goto(`${baseURL}privacy`, { waitUntil: "load" });
    await expect(notice).toHaveCount(0);
  });

  test("the welcome pitch follows the language too", async ({ page, baseURL }) => {
    await pinLocale(page, baseURL!, "es");
    await page.goto(`${baseURL}welcome`, { waitUntil: "load" });
    await expect(page.getByRole("link", { name: "Empezar a concentrarme" })).toBeVisible();
    // ADR 42/44: the roster size is interpolated, never written out — the pitch
    // said "eighteen" long after there were more than eighteen of them.
    await expect(page.locator("main")).not.toContainText(/dieciocho/i);
  });
});

test.describe("page metadata (ADR 30 × ADR 44)", () => {
  const meta = (html: string, property: string) =>
    new RegExp(`<meta [^>]*(?:property|name)="${property}"[^>]*content="([^"]*)"`).exec(html)?.[1];
  const title = (html: string) => /<title>([^<]*)<\/title>/.exec(html)?.[1];

  test("a cookieless request — every crawler — still gets English", async ({
    request,
    baseURL,
  }) => {
    // The price of having no locale in the URL: one canonical per page, indexed
    // in one language. Deliberate, and asserted so it cannot drift silently.
    const html = await (await request.get(`${baseURL}docs`)).text();
    expect(title(html)).toBe("How GLU works — GLU");
    expect(meta(html, "og:locale")).toBe("en_GB");
    expect(meta(html, "description")).toContain("The GLU manual");
  });

  test("a cookie-bearing request gets its own language, and its own og:locale", async ({
    request,
    baseURL,
  }) => {
    for (const [locale, expectedTitle, ogLocale] of [
      ["de", "So funktioniert GLU — GLU", "de_DE"],
      ["fr", "Comment fonctionne GLU — GLU", "fr_FR"],
      ["zh-Hans", "GLU 使用说明 — GLU", "zh_CN"],
    ] as const) {
      const html = await (
        await request.get(`${baseURL}docs`, { headers: { Cookie: `glu-locale=${locale}` } })
      ).text();
      // The brand half of `title.template` never translates; only `%s` does.
      expect(title(html)).toBe(expectedTitle);
      expect(meta(html, "og:locale")).toBe(ogLocale);
    }
  });

  test("every route restates og:site_name and the card type in every language", async ({
    request,
    baseURL,
  }) => {
    /*
     * ADR 30's replace-don't-merge trap, now multiplied by six: Next replaces
     * `openGraph` wholesale, so a route that forgets to spread the site facts
     * ships a card with neither — and only this assertion can see it.
     */
    for (const route of ["", "welcome", "privacy", "terms", "docs"]) {
      for (const locale of ["en", "es", "de"]) {
        const html = await (
          await request.get(`${baseURL}${route}`, {
            headers: { Cookie: `glu-locale=${locale}` },
          })
        ).text();
        const where = `/${route} @ ${locale}`;
        expect(meta(html, "og:site_name"), where).toBe("GLU");
        expect(meta(html, "og:type"), where).toBe("website");
        expect(meta(html, "twitter:card"), where).toBe("summary_large_image");
      }
    }
  });
});

test.describe("the clock faces (ADR 07 × ADR 44)", () => {
  /*
   * Every design draws a status word, and most word it their own way. The
   * risk here is not a bad translation — it is a design that kept its literal
   * and now shows one English word inside an otherwise German app, which no
   * type check can see because the literal is perfectly valid TypeScript.
   */
  test("the status word follows the language", async ({ page, open, baseURL }) => {
    await open();
    await expect(page.getByTestId("clock-slot")).toContainText("READY");

    await pinLocale(page, baseURL!, "de");
    await page.reload({ waitUntil: "load" });
    await expect(page.getByTestId("clock-slot")).toContainText("BEREIT");
  });

  test("a design's own running label is translated too, not just the shared states", async ({
    page,
    seedStorage,
    open,
    baseURL,
  }) => {
    // Comet says "Orbit" while running rather than "Focus"; those per-design
    // words are the bulk of the clock copy and the easiest to leave behind.
    // The pin has to come *after* `open()`, which plants the suite's English
    // cookie — otherwise it is simply overwritten.
    await seedStorage(seed({ activeClockId: "comet" }));
    await open();
    await pinLocale(page, baseURL!, "es");
    await page.reload({ waitUntil: "load" });
    // Comet draws its label without the uppercase treatment some designs use.
    await expect(page.getByTestId("clock-slot")).toContainText("Listo");
  });
});
