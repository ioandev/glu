import { PAGE_META, type SiteRoute, absoluteUrl } from "@/lib/siteMetadata";
import { expect, test } from "./fixtures";

/**
 * ADR 30 — the document head, for every route in the copy table.
 *
 * These assertions exist because none of this is visible from inside the app.
 * A social card can point at the wrong origin, lose the basePath, or drop
 * `og:site_name` entirely, and the app renders identically; the only place the
 * mistake shows up is a link preview, in someone else's chat window, after it
 * has shipped. Three of the four defects this block now guards were live in the
 * first implementation.
 *
 * Driven through `request` rather than `page`: the head is server-rendered and
 * has nothing to do with the viewport, so there is no reason to boot the app
 * four times per route.
 */

const routes = Object.keys(PAGE_META) as SiteRoute[];

const HOME_TITLE = "GLU — pomodoro and focus timer";

/** The `<title>`, after the root layout's `"%s — GLU"` template. */
const documentTitle = (route: SiteRoute) => {
  const { title } = PAGE_META[route];
  return title ? `${title} — GLU` : HOME_TITLE;
};

/**
 * `og:title`, which is **not** the document title.
 *
 * Next runs `title.template` over the `<title>` only; an explicit
 * `openGraph.title` is taken literally, and an absent one falls back to the
 * already-templated document title. That is the wanted shape here: an unfurler
 * renders `og:site_name` beside the title, so "Privacy Policy" under a "GLU"
 * label reads better than "Privacy Policy — GLU" under it.
 */
const cardTitle = (route: SiteRoute) => PAGE_META[route].title ?? HOME_TITLE;

/** `baseURL` ends in `/glu/`, so a route is fetched relative to it (ADR 09). */
const pathFor = (route: SiteRoute) => (route === "/" ? "." : route.slice(1));

const meta = (html: string, key: string) => {
  const match = html.match(
    new RegExp(`<meta (?:property|name)="${key}" content="([^"]*)"`, "i"),
  );
  return match?.[1] ?? null;
};

const canonicalOf = (html: string) =>
  html.match(/<link rel="canonical" href="([^"]*)"/i)?.[1] ?? null;

const titleOf = (html: string) => html.match(/<title>([^<]*)<\/title>/i)?.[1] ?? null;

/** Entity-decodes the handful of escapes Next emits inside attributes. */
const decode = (value: string) =>
  value.replace(/&#x27;/g, "'").replace(/&amp;/g, "&").replace(/&quot;/g, '"');

for (const route of routes) {
  const copy = PAGE_META[route];

  test.describe(`metadata for ${route}`, () => {
    test(`titles, description and canonical`, async ({ request }) => {
      const html = await (await request.get(pathFor(route))).text();

      expect(titleOf(html)).toBe(documentTitle(route));
      expect(decode(meta(html, "description") ?? "")).toBe(copy.description);

      // The canonical is the **production** URL even when the suite runs
      // against localhost — that is the point of a canonical, and it is also
      // where a missing basePath or a stray trailing slash would show up.
      expect(canonicalOf(html)).toBe(absoluteUrl(route));
    });

    test(`Open Graph and Twitter tags`, async ({ request }) => {
      const html = await (await request.get(pathFor(route))).text();

      expect(decode(meta(html, "og:title") ?? "")).toBe(cardTitle(route));
      expect(decode(meta(html, "og:description") ?? "")).toBe(copy.description);
      expect(meta(html, "og:type")).toBe("website");
      expect(meta(html, "og:site_name")).toBe("GLU");
      expect(meta(html, "og:locale")).toBe("en_GB");
      expect(meta(html, "og:url")).toBe(canonicalOf(html));

      // `summary`, the default, crops a 1200×630 card to a square thumbnail.
      expect(meta(html, "twitter:card")).toBe("summary_large_image");

      expect(meta(html, "og:image:width")).toBe("1200");
      expect(meta(html, "og:image:height")).toBe("630");
      expect(meta(html, "og:image:type")).toBe("image/png");
      expect(decode(meta(html, "og:image:alt") ?? "")).toBe(copy.imageAlt);
    });

    test(`serves a 1200×630 PNG card under the basePath`, async ({ request, baseURL }) => {
      const html = await (await request.get(pathFor(route))).text();
      const image = meta(html, "og:image");

      // The defect this catches: `metadataBase` without the basePath sends
      // every crawler to `ioan.dev/opengraph-image`, which is the sibling site.
      expect(image).toMatch(/^https?:\/\/[^/]+\/glu\//);
      expect(image).not.toMatch(/\/glu\/glu\//);
      expect(image).not.toMatch(/localhost/);
      // Next fills `twitter:image` from the same convention — there is no
      // second file, and there must not be a second URL either.
      expect(meta(html, "twitter:image")).toBe(image);

      const { pathname, search } = new URL(image!);
      const response = await request.get(new URL(pathname + search, baseURL).toString());
      expect(response.status()).toBe(200);
      expect(response.headers()["content-type"]).toContain("image/png");

      // PNG magic number, then the IHDR width/height as big-endian uint32s.
      const body = await response.body();
      expect(body.subarray(1, 4).toString("ascii")).toBe("PNG");
      expect(body.readUInt32BE(16)).toBe(1200);
      expect(body.readUInt32BE(20)).toBe(630);
    });
  });
}

test.describe("site-wide", () => {
  test("every route gets its own card, not the app's", async ({ request }) => {
    const bodies = await Promise.all(
      routes.map(async (route) => {
        const html = await (await request.get(pathFor(route))).text();
        return meta(html, "og:image");
      }),
    );

    expect(new Set(bodies).size).toBe(routes.length);
  });

  test("the sitemap lists every route, absolute and under the basePath", async ({ request }) => {
    const xml = await (await request.get("sitemap.xml")).text();
    const locations = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);

    expect(locations).toHaveLength(routes.length);
    for (const location of locations) {
      expect(location).toMatch(/^https:\/\/ioan\.dev\/glu/);
    }
  });
});
