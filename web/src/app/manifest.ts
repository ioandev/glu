import type { MetadataRoute } from "next";
import { PAGE_META, SITE_NAME } from "@/lib/siteMetadata";

/**
 * ADR 04: installable, explicitly **not** offline — no service worker anywhere.
 *
 * The manifest *link* gets the basePath from the file convention, but URLs
 * *inside* the manifest do not. Everything here is relative to the manifest's
 * own location, so it resolves under `/glu/` by spec instead of hardcoding the
 * prefix (ADR 04's gotcha).
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    // Identity, not a route — it stays `/glu/` even though `start_url` lost its
    // slash. Changing `id` makes already-installed copies a *different* app
    // instead of an update, so it is frozen for good.
    id: "/glu/",
    name: SITE_NAME,
    short_name: SITE_NAME,
    // Same claim as the page description and the social card, from the same
    // table — an install prompt and a link preview describing different apps
    // is exactly the drift ADR 30's copy table exists to stop.
    description: PAGE_META["/"].description,
    // **No trailing slash, deliberately.** Next serves the app at `/glu` and
    // 308-redirects `/glu/` onto it. A WebAPK whose `start_url` redirects out
    // of `scope` lands out of scope on launch, and Chrome answers that with the
    // in-app toolbar (title + origin, ✕, ⋮) — the exact "browser chrome in a
    // standalone app" ADR 04's deferred on-device criterion was there to catch.
    // Scope is a plain path *prefix*, so `/glu/` does not contain `/glu`;
    // `/glu` contains both it and every `/glu/...` route.
    start_url: "/glu",
    scope: "/glu",
    display: "standalone",
    // No orientation lock: half-tablet portrait is a first-class mode.
    theme_color: "#141d2a",
    background_color: "#ffffff",
    icons: [
      { src: "icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      {
        src: "icons/icon-512-maskable.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
