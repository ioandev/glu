import type { MetadataRoute } from "next";

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
    id: "/glu/",
    name: "GLU",
    short_name: "GLU",
    description: "Tablet-first pomodoro and focus tracker.",
    start_url: "/glu/",
    scope: "/glu/",
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
