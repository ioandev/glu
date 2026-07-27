/**
 * GLU's notification-only service worker (ADR 33).
 *
 * The entire contract: this file exists so Android Chrome can show the
 * session-end notification (`registration.showNotification()` — page-context
 * construction throws there, ADR 18's recorded platform truth). It registers
 * **no `fetch` listener, ever** — that absence is ADR 04's surviving product
 * law (installable, not offline) and the e2e suite asserts it against this
 * file's source. Anything added here beyond notification handling is an ADR,
 * not a tweak.
 *
 * Scope is the default `/glu/`, which deliberately does not cover the page at
 * `/glu`: notifications need a registration handle, not a controlled page.
 * That is why `matchAll` below must pass `includeUncontrolled` — without it
 * the click handler finds nothing and opens a second tab.
 */

self.addEventListener("install", () => {
  // No cache to invalidate; new versions may activate immediately.
  self.skipWaiting();
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clients) => {
        const app = clients.find((client) => new URL(client.url).pathname.startsWith("/glu"));
        // A static asset gets no basePath machinery — the prefix is hand-written,
        // same rule as lib/api.ts.
        return app ? app.focus() : self.clients.openWindow("/glu");
      }),
  );
});
