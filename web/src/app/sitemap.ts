import type { MetadataRoute } from "next";
import { PAGE_META, type SiteRoute, absoluteUrl } from "@/lib/siteMetadata";

/**
 * `/glu/sitemap.xml` (ADR 30). Five routes, absolute, basePath included —
 * `absoluteUrl()` is the only thing here that knows about `/glu`, because a
 * hand-written metadata URL never gets it (ADR 01 / ADR 04).
 *
 * **There is deliberately no `app/robots.ts`.** The convention would emit it at
 * `/glu/robots.txt`, and `robots.txt` is only ever read at an origin root —
 * which belongs to the sibling personal site, not to GLU. A crawl policy under
 * the basePath is a file that looks like a policy and is read by nobody; if one
 * is ever wanted, it goes in the sibling site's root file and points here.
 *
 * No `lastModified`: the honest value is per-document ("25 July 2026", held as
 * a display string next to each document's copy), and a `new Date()` here would
 * just claim every page changed on every deploy.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  return (Object.keys(PAGE_META) as SiteRoute[]).map((route) => ({
    url: absoluteUrl(route),
    // The app is the destination; the documents support it. `/welcome` sits
    // between the two (ADR 31) — it is the link a stranger is actually given,
    // and the only page here that tries to explain GLU rather than govern it.
    priority: route === "/" ? 1 : route === "/welcome" ? 0.8 : 0.5,
  }));
}
