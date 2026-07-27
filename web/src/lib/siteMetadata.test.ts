import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it, vi } from "vitest";
import en from "@/locales/en";

/*
 * `pageMetadata` reads the request's locale (ADR 44), which only exists inside
 * a real request. Stubbing the two server helpers keeps these assertions unit
 * tests — they are about the *shape* Next receives, not about the language.
 * `e2e/metadata.spec.ts` is what checks the language, against a real response.
 */
vi.mock("next-intl/server", () => ({
  getLocale: async () => "en",
  getTranslations: async () => (key: keyof typeof en.meta) => en.meta[key],
}));
import {
  BASE_PATH,
  METADATA_BASE,
  PAGE_META,
  SITE_ORIGIN,
  type SiteRoute,
  absoluteUrl,
  pageMetadata,
} from "./siteMetadata";

/**
 * ADR 30. Everything here is a claim that is invisible at runtime: a wrong
 * `og:image` origin, a missing `og:site_name`, a route in the copy table with
 * no card behind it — none of it renders, none of it throws, and the only
 * symptom is a link preview nobody in the loop ever looks at.
 */

const appDir = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "app");
const routes = Object.keys(PAGE_META) as SiteRoute[];

describe("URLs", () => {
  it("puts the basePath on every route", () => {
    expect(absoluteUrl("/")).toBe("https://ioan.dev/glu");
    expect(absoluteUrl("/privacy")).toBe("https://ioan.dev/glu/privacy");
    expect(absoluteUrl("/terms")).toBe("https://ioan.dev/glu/terms");
    expect(absoluteUrl("/docs")).toBe("https://ioan.dev/glu/docs");
  });

  it("never emits a trailing slash — the app does not run trailingSlash", () => {
    for (const route of routes) expect(absoluteUrl(route).endsWith("/")).toBe(false);
  });

  /**
   * The load-bearing one. `metadataBase` carries the basePath because the
   * `opengraph-image` convention emits a basePath-free URL and Next joins the
   * two; a bare origin here points every social card at `ioan.dev/…`, which is
   * the sibling site.
   */
  it("carries the basePath in metadataBase", () => {
    expect(METADATA_BASE.origin).toBe(SITE_ORIGIN);
    expect(METADATA_BASE.pathname).toBe(BASE_PATH);
  });
});

describe("copy", () => {
  it("gives every route a description a search result can render", () => {
    for (const route of routes) {
      const { description } = PAGE_META[route];
      expect(description.length).toBeGreaterThan(60);
      expect(description.length).toBeLessThanOrEqual(200);
    }
  });

  it("gives every route a card heading, blurb and image alt", () => {
    for (const route of routes) {
      const copy = PAGE_META[route];
      expect(copy.heading.length).toBeGreaterThan(0);
      expect(copy.blurb.length).toBeGreaterThan(0);
      expect(copy.imageAlt).toContain("GLU");
    }
  });

  it("leaves the home route titleless so the layout default is not templated", () => {
    expect(PAGE_META["/"].title).toBeUndefined();
    for (const route of routes.filter((r) => r !== "/")) {
      expect(PAGE_META[route].title).toBeTruthy();
    }
  });
});

/** Mirrors `META_KEYS` in the module under test. */
const DESCRIPTION_KEY = {
  "/": "homeDescription",
  "/welcome": "welcomeDescription",
  "/privacy": "privacyDescription",
  "/terms": "termsDescription",
  "/docs": "docsDescription",
} as const satisfies Record<SiteRoute, keyof typeof en.meta>;

describe("pageMetadata", () => {
  it("restates the site-wide Open Graph facts on every route", async () => {
    // Next merges Metadata shallowly: a page that exports `openGraph` replaces
    // its parent's object outright, so these cannot live only in the layout.
    for (const route of routes) {
      const meta = await pageMetadata(route);
      expect(meta.openGraph).toMatchObject({
        type: "website",
        siteName: "GLU",
        locale: "en_GB",
        url: absoluteUrl(route),
        description: en.meta[DESCRIPTION_KEY[route]],
      });
      expect(meta.twitter).toMatchObject({ card: "summary_large_image" });
    }
  });

  it("points the canonical at the route's own absolute URL", async () => {
    for (const route of routes) {
      expect((await pageMetadata(route)).alternates?.canonical).toBe(absoluteUrl(route));
    }
  });

  it("declares no images — the file convention owns og:image and twitter:image", async () => {
    for (const route of routes) {
      const meta = await pageMetadata(route);
      expect(meta.openGraph).not.toHaveProperty("images");
      expect(meta.twitter).not.toHaveProperty("images");
    }
  });
});

/**
 * The guard that catches the realistic mistake: adding a route to the copy
 * table and forgetting its card, which silently inherits the app's.
 */
describe("routes and cards line up", () => {
  it("has an opengraph-image and a page for every entry in the table", () => {
    for (const route of routes) {
      const dir = route === "/" ? appDir : path.join(appDir, route.slice(1));
      expect(existsSync(path.join(dir, "page.tsx")), `${route} page`).toBe(true);
      expect(existsSync(path.join(dir, "opengraph-image.tsx")), `${route} card`).toBe(true);
    }
  });
});
