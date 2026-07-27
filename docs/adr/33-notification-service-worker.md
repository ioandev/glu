# ADR 33: Notification service worker — ADR 18's Android escalation, taken

- Status: Implemented
- Date: 2026-07-26

- Deviation (2026-07-26, implementation): none of substance. One addition the
  outline didn't spell out: `registerAlertWorker()` wraps the `register()`
  call in a sync try/catch as well — some engines expose
  `navigator.serviceWorker` in contexts where using it throws synchronously,
  and "best-effort and silent" has to cover that too.
- Note (2026-07-26, implementation): the e2e recorder tags each record with
  `via: "sw" | "page"` and the hidden-finish spec waits for worker activation
  first — which path fired is an assertion, not an inference.

## Context

ADR 18 shipped session-end alerts three degrade layers deep: OS notification →
chime → the visible finished state. It also recorded the platform truth that
makes the first layer a no-op exactly where it matters: **page-context
`new Notification()` throws `TypeError` on Android Chrome** (non-persistent
notifications require a service worker there) and does not exist in iPadOS
Safari page context. GLU is tablet-first; the primary device degrades to
chime-only by design, silently (`useSessionAlerts.ts` catches and says
nothing — an expected platform outcome, not an error).

The bug report has now arrived: notifications don't work. ADR 18 named this
escalation with its price tag — *"a minimal notification-only service worker
(no fetch handler — not offline machinery), which requires an ADR 04 amendment
because its 'no service worker anywhere' constraint is product law. Named, not
taken."* This ADR takes it. ADR 04 is amended in the same session; its product
law shrinks from "no service worker anywhere" to **"no fetch handler
anywhere"** — which is the clause that was actually protecting the product
decision (installable, not offline; no cache debugging, no update lifecycle for
app code, no stale-shell bugs).

**Prerequisites: ADRs 04 and 18 Implemented** (this is an amendment to one and
the recorded escalation of the other). Push API, closed-app alerting, and the
backend stay exactly where ADR 18 left them: out, permanently.

## Decision

- **We will ship one service worker whose entire job is notifications.**
  `web/public/sw.js`, a committed plain-JS file, no build step, no bundler, no
  dependency. It contains exactly three things: `install → skipWaiting()` (new
  versions activate promptly; there is no cache to invalidate), a
  `notificationclick` handler (focus the app window, else open `/glu`), and
  nothing else. **No `fetch` listener, ever** — with no fetch handler the
  browser routes zero requests through it: no offline behaviour, no caching, no
  stale-shell class of bugs. That absence is the new product law and it is
  machine-enforced (acceptance criteria).
- **The alert path becomes SW-first.** `notifyQuietly` tries
  `registration.showNotification()` (the call Android Chrome requires), and
  falls back to the existing page-context `new Notification()` (desktop
  browsers without the registration yet), then to chime-only. Order matters:
  page-first would throw on Android before the working path was ever tried.
  Everything else ADR 18 decided is untouched — live-finish only, hidden-only,
  one fixed tag so finishes replace rather than stack, permission asked once
  from the first Start, alerts are courtesy and never load-bearing.
- **Registration is lazy, guarded, and best-effort** — requested once from the
  alert hook's mount effect. A failed or missing registration means the
  page-context path, then the chime; nothing ever surfaces an error. The
  registration URL is hand-written `/glu/sw.js` under the `lib/api.ts` rule: a
  static asset is not a Next page, so nothing applies the basePath for us.
- **The scope is the default `/glu/`, and the page at `/glu` is deliberately
  outside it.** `showNotification` needs a registration *handle*, not a
  *controlled page*, so out-of-scope costs nothing — and widening the scope to
  `/glu` would need a `Service-Worker-Allowed` header on a static file for
  zero benefit. Two consequences are load-bearing enough to record as law:
  `navigator.serviceWorker.ready` matches the *current page* against the scope,
  so on `/glu` it **never resolves** — always `getRegistration("/glu/")`; and
  the SW's `clients.matchAll` must pass **`includeUncontrolled: true`** or the
  notification click can't find the app it exists to focus.
- **Close-on-return and click-to-focus follow the notification to the SW.**
  Click: the SW's `notificationclick` closes the notification and focuses an
  existing `/glu` client, else `openWindow`. Return-to-tab: the page's
  visibility listener closes via `registration.getNotifications({ tag })` —
  a SW-shown notification has no page-side `close()` handle.
- **iPadOS Safari stays chime-only in a browser tab and that is honest.** The
  Notification API on iPadOS is exposed to home-screen web apps, not Safari
  page context; the SW makes an *installed* GLU eligible but the in-tab
  experience does not change. The manual says so — it currently blames "iPad
  Safari and Android Chrome" in one breath, and after this ADR that sentence
  would be half a lie. `DocsSections.tsx` is updated in the same session
  (ADR 29's contract).

## Options considered

- **Do nothing — the chime is the alert on tablets** (ADR 18's v1 position) —
  the bug report is the counter-evidence: a backgrounded tab on the primary
  device gets no notification. Rejected by the product owner asking for this.
- **Push API + backend** — closed-app alerting; three systems, and the backend
  is permanently a stateless proxy (ADR 11). Rejected again, unchanged.
- **A bundler-managed SW (Serwist)** — machinery whose purpose is caching and
  update flows this SW is forbidden to have. The first-draft ADR 04 research
  stays filed under a future *offline* ADR. Rejected.
- **Widen the SW scope to `/glu` via `Service-Worker-Allowed`** — a custom
  header on a static asset to control a page that doesn't need controlling.
  Rejected; recorded above as the reason the default scope stands.
- **Register in the Start gesture next to `primeAudio()`** — registration
  needs no gesture and gains nothing from one; mount-time registration is
  ready long before any run can finish. Rejected.

## Scope

### In scope

- `web/public/sw.js` — install/skipWaiting + notificationclick, nothing else.
- SW-first `notifyQuietly` with page-context fallback; mount-time registration
  in `useSessionAlerts`; close-on-return for SW-shown notifications.
- Unit tests (SW double) + e2e updates: the ADR 04 zero-registrations tripwire
  flips to exactly-one-with-scope-`/glu/`; a new tripwire asserts `sw.js`
  serves 200 and contains no fetch listener; the ADR 18 hidden-finish spec
  records `ServiceWorkerRegistration.prototype.showNotification` (the path
  real Chromium now takes) plus a no-SW fallback variant.
- Amendments, same session: ADR 04 (no-SW law → no-fetch-handler law), ADR 18
  (escalation taken; superseded criterion annotated), CLAUDE.md (index row,
  build order, PWA constraint, reopening-conditions list), the manual's
  platform paragraph (`DOCS_UPDATED` refreshed).

### Out of scope

- **Any `fetch` handler, precaching, offline, update-flow machinery** → still
  the future **ADR: offline mode**, unchanged from ADR 04.
- **Push API / closed-app alerting / any backend involvement** → rejected
  again above; reopening this means reopening ADR 11's permanent scope, which
  is a product decision, not a brief.
- **The punctuality bound** — Chrome's intensive throttling can still deliver
  a long-backgrounded finish up to ~60 s late; the dedicated-worker tick stays
  ADR 18's named-not-taken escalation.
- **iPadOS home-screen notification verification** — real-device work; joins
  the existing HUMAN-TODO install checks rather than blocking this ADR.
- **Privacy Policy changes** — none needed: the SW stores nothing, handles no
  requests, and the Permissions section already describes notifications
  without naming a mechanism. Recorded so nobody "completes" this ADR by
  editing a legal document it doesn't touch.

## Implementation outline

1. **`web/public/sw.js`** — header comment stating the contract (notification
   clicks only, no fetch handler ever, ADR 33); `install` → `skipWaiting()`;
   `notificationclick` → `event.notification.close()`, then
   `clients.matchAll({ type: "window", includeUncontrolled: true })`, focus
   the first `/glu` client or `openWindow("/glu")` inside `event.waitUntil`.
   **Gotcha:** `includeUncontrolled` — the page is outside the scope on
   purpose; without it the handler finds nothing and silently opens a second
   tab.
2. **`useSessionAlerts.ts`** — module-level `registerAlertWorker()` (once
   -guarded like the chime's singleton; guarded again by feature detection;
   `.catch(() => {})` — registration is best-effort), called from a mount
   effect in the hook. **Gotcha:** the once-guard, not the effect, is what
   survives StrictMode's double-mount. `notifyQuietly` splits: try
   `getRegistration("/glu/")` → `registration.active` →
   `showNotification(title, { body, tag })` + visibility-listener close via
   `getNotifications({ tag })`; any miss or throw falls through to the
   existing page-constructor path untouched. **Gotcha:** never
   `navigator.serviceWorker.ready` (hangs on `/glu` forever, see Decision);
   never reorder page-first (Android throws before the working path runs).
3. **Unit tests** — a `navigator.serviceWorker` double (`getRegistration`
   returning an active-worker registration with recording
   `showNotification`/`getNotifications`): hidden finish prefers the SW and
   never calls the page constructor; no registration / no active worker /
   rejecting `showNotification` each fall back to the page constructor;
   everything ADR 18 asserts still passes with the double absent.
4. **E2E** — flip the ADR 04 assertion (exactly one registration, scope ends
   `/glu/`); new collateral test: `GET /glu/sw.js` is 200, JS content-type,
   and its source contains no `fetch` listener (the tripwire that makes the
   new law machine-checkable); extend the ADR 18 recorder to also patch
   `ServiceWorkerRegistration.prototype.showNotification` — in real Chromium
   the SW registers, so the hidden-finish notification now flows through it —
   and add a variant with `serviceWorker` deleted to pin the fallback.
5. **Amendments** — ADR 04, ADR 18, CLAUDE.md, `DocsSections.tsx` (rewrite
   the "iPad Safari and Android Chrome" paragraph; refresh `DOCS_UPDATED`).

Honest sizing: **half a day**. The SW itself is twenty lines; the real work is
the test seam for `navigator.serviceWorker` and flipping the e2e tripwires
without weakening what they guard.

## Acceptance criteria

- [x] `GET /glu/sw.js` returns 200 with a JavaScript content-type, and its source registers no `fetch` listener (e2e-asserted — the no-offline law, machine-checkable).
- [x] After app load, `navigator.serviceWorker.getRegistrations()` reports exactly one registration and its scope ends `/glu/` (the flipped ADR 04 assertion).
- [x] Hidden live finish in real Chromium routes the notification through `ServiceWorkerRegistration.showNotification` — one notification, tag `glu-session-end`, title "GLU — time's up" (e2e prototype recorder).
- [x] With `navigator.serviceWorker` absent, a hidden live finish falls back to the page-context constructor — same single tagged notification (e2e + unit).
- [x] With no registration, an inactive worker, or a rejecting `showNotification`, the chime still fires and nothing logs (unit).
- [x] Every ADR 18 behaviour is byte-identical: visible finish never notifies, Stop/`n`/restored-expired stay silent, permission asked once from first Start, denied means never again, chime unaffected throughout (existing suites still green).
- [x] The manual's platform paragraph no longer claims Android Chrome cannot notify; `DOCS_UPDATED` reflects the session (ADR 29's contract).
- [x] ADR 04 and ADR 18 carry same-session amendments; CLAUDE.md's index, build order, PWA constraint, and reopening-conditions list are updated.
- [x] `npm test`, `npm run build`, `npm run build-storybook`, and the e2e suite all green.
- [~] On-device: an Android Chrome tab in the background at finish shows the notification, tapping it focuses GLU. — **[deferred → HUMAN-TODO]** (joins ADR 04's real-device checklist; every machine-checkable proxy above is in CI)

## Consequences

- The primary device finally gets the first degrade layer: a backgrounded tab
  on an Android tablet notifies instead of relying on the chime carrying
  through whatever else the tablet is playing.
- The product law changes shape but not intent: "no service worker anywhere"
  was always a proxy for "no offline machinery, no stale-shell bugs"; the law
  is now stated as the thing it meant — **no fetch handler** — and enforced by
  a tripwire instead of a pane being empty.
- A service worker exists, so a sliver of its lifecycle exists: `sw.js` must
  stay boring (skipWaiting, no state, no cache) or the debugging surface
  ADR 04 declined creeps back. Any growth in that file is an ADR, not a tweak.
- ADR 18's escalation ledger shrinks to one named-not-taken item (the
  dedicated-worker tick for punctuality); this one converts from annoyance to
  brief exactly as designed.
- iPadOS in-browser remains chime-only — recorded honestly in the manual
  rather than papered over; the installed-app path becomes *possible* and
  waits on real hardware.
