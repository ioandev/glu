# ADR 13: Todoist task detail view (read-only)

- Status: Implemented (deviations noted)
- Date: 2026-07-23

- Deviation (2026-07-24, implementation): the empirical `file_url` answer is
  deferred (see the note above) — the proxy sends the bearer header regardless,
  which is correct in the auth-required world and harmless in the signed-URL
  world because the host allowlist already pins the destination.
- Deviation (2026-07-24, implementation): redirects are **refused**
  (`redirect: "error"`), not followed-within-the-allowlist. Refusing is the
  smaller, more obviously-correct rule; Todoist's storage URLs resolve directly.
- Deviation (2026-07-24, implementation): the SSRF allowlist rejects non-HTTPS
  and any host outside Todoist's storage domains, including loopback and the
  cloud metadata address — asserted by name in the supertest suite.

## Context

ADR 12 shipped the task list with deliberately inert cards and penciled this
ADR for the tap. Product brief (2026-07-23): tapping a card opens a **task
detail view** — **a modal on mobile, a Mantine view sliding from the right on
tablet/desktop** — containing a **refresh button, title, description,
comments, and images in the comments**. It must **not be able to change
anything**: view only. (ADR 12 is titled "task view" for the list; this is
the *detail* view — named accordingly to keep the index unambiguous.)

Endpoint shape verified against developer.todoist.com (unified v1) on
2026-07-23: a Get Comments endpoint exists; comments carry `content`,
`posted_at`, and an optional `attachment`
(`file_url`, `file_type`, `resource_type`, thumbnails). **The docs do not
state whether `file_url` is fetchable without authentication** — the design
below is correct in either case, and the implementation step verifies which
world we're in.

**Prerequisites: ADRs 02, 03, 11, and 12 Implemented.** Standing ratchets
apply (ADR 09 E2E block; ADR 08 palette rule for any new chrome; the ADR
10/12 overlay rules).

> **Todoist `file_url` auth semantics — recorded (2026-07-24):** *unverified
> tonight.* No Todoist app was registered during the implementation run, so no
> real attachment URL could be fetched. The proxy is written to work either way
> — it sends the bearer header **and** allowlists only Todoist's own storage
> hosts — so both worlds are covered; the empirical answer is a HUMAN-TODO item.

## Decision

### Container

- **Below `sm`: a full-screen Mantine `Modal`. At/above `sm`: a Mantine
  `Drawer`, `position="right"` (~420 px).** One `TaskDetail` content
  component rendered into whichever container `useMediaQuery` picks — the
  container is responsive furniture, the content is written once.
- **Open state is ephemeral** (ADR 10 precedent for chrome): reload = closed.
  The task id being viewed is component state, not blob state.
- **Coexistence with ADR 10's right drawer is legal but unmanaged** — both
  are portal overlays and Mantine stacks them; the header drawer is chrome,
  this is content. No z-index engineering; if real usage ever finds the
  double-drawer awkward, that's a UX amendment, not a launch blocker.
- **The timer never notices** — standing rule: overlays render beside the
  timer tree; the 50 ms tick and hotkeys (ADR 06) keep working with the
  detail open.

### Content

- **Header row**: plain-text title (ADR 12's stripping posture) + a
  **refresh button** that refetches task and comments together, with a
  spinner state; close affordance per container (Modal close / Drawer close,
  Escape, overlay).
- **Description**: plain text with preserved line breaks
  (`white-space: pre-wrap`). **No markdown engine in v1** — same posture and
  same recorded escape hatch as ADR 12: rendering markdown later requires an
  explicit sanitization decision in an amendment.
- **Comments**: listed oldest-first (conversation order), each with
  timestamp and content (same plain-text treatment). Cursor pagination
  followed to **100 comments**, then a visible "showing first 100" line
  (no-silent-caps rule).
- **Images come from structured attachment data, not from parsing text**:
  a comment whose `attachment.resource_type` is `image` renders the image
  inline (max-width 100%, thumbnail-sized request where thumbnails exist).
  This is why images-in-comments needs no markdown engine. **Non-image
  attachments render as a filename + type line, not a link** — the proxy
  (below) is image-only in v1; downloads are a future amendment if wanted.
  No lightbox in v1 — inline display is the brief's "view"; noted as a
  possible future nicety, not smuggled in.

### Data path & the image proxy

- **Two new allowlisted read-only proxy routes** (ADR 12 pattern):
  `GET /glu/api/todoist/task/:id` and
  `GET /glu/api/todoist/comments?task_id=`. Still zero write verbs on the
  server — **"can't change anything" is enforced structurally**, not by the
  absence of buttons.
- **Comment images load through a server-side image proxy**
  (`GET /glu/api/todoist/attachment?url=`), **regardless of whether Todoist
  file URLs turn out to need auth**: (a) if they need the bearer token, only
  the server has it (ADR 11 absolute rule); (b) if they're public signed
  URLs, they expire and hotlinking a third-party CDN is fragile; (c)
  same-origin images keep any future CSP one line long. Implementation
  verifies which case Todoist is and records it in this ADR.
- **The image proxy is SSRF-hardened by construction** — an arbitrary-URL
  fetcher on a server is a hole, so it isn't one: upstream **host allowlist**
  (Todoist file-storage domains only, exact hosts confirmed at
  implementation), **image content-types only**, **size cap (10 MB)**,
  request timeout, redirects only within the allowlist, `Cache-Control:
  private` with a short max-age. Rejections are 400s with distinct log
  lines.
- **Plain hooks continue; the TanStack Query trigger did not fire** — ADR 12
  set mutations as the trigger for the query-library conversation, and this
  ADR is read-only. Recorded so nobody "helpfully" adds it here.
- **Staleness between list and detail is expected and handled**: a task
  completed/deleted upstream between render and tap → the detail fetch 404s
  → a calm "task no longer exists" state with a close button (and the list's
  focus-revalidate catches up).

## Options considered

- **Same container everywhere (always modal / always drawer)** — a full
  drawer at phone width is a modal with extra steps; a modal on tablet
  wastes the split-screen ergonomics the brief explicitly differentiates.
  Rejected; responsive containers.
- **Render markdown in description/comments** — a markdown engine + a
  sanitization decision for third-party content, in a view whose images
  already arrive via structured data. Rejected for v1; escape hatch
  recorded.
- **`<img src>` pointing at Todoist URLs directly** — leaks nothing but
  breaks in the auth-required world, rots in the signed-URL world, and
  widens CSP forever. Rejected for the proxy in all worlds.
- **Generic URL proxy ("we'll reuse it later")** — SSRF-as-a-service.
  Rejected; host-allowlisted, image-only.
- **Lightbox/zoom viewer** — scope; inline images satisfy "view". Rejected,
  future note.
- **Persist the open task across reloads** — chrome state in the blob,
  contradicts ADR 10's ephemerality precedent for overlays. Rejected.

## Scope

### In scope

- Responsive container (full-screen Modal below `sm`, right Drawer at/above),
  wiring ADR 12's cards from inert to opening the detail.
- Detail content: title, refresh, description, comments (paginated to 100,
  truncation line), inline comment images via the hardened proxy; non-image
  attachments as inert filename lines.
- Two read-only proxy routes + the SSRF-hardened image proxy.
- States: loading skeletons, refresh spinner, 404-gone task, network retry,
  logged-out (detail closes to ADR 11's login state).
- Tests: supertest on the three routes **including SSRF rejections**
  (non-allowlisted host, non-image content-type, oversize), RTL for both
  containers (matchMedia-driven), stories (detail with fixture comments and
  data-URI images, long description, gone-task state, both schemes/both
  containers), ADR 09 E2E block via stubbed proxy.

### Out of scope

- Any write action — complete, edit, reschedule, comment → future
  **ADR: Todoist task actions** (the proxy's first write verbs land there,
  named one by one).
- Markdown rendering → future amendment with an explicit sanitization
  decision (standing ADR 12 escape hatch).
- Non-image attachment downloads, lightbox/zoom → future amendments if
  briefed.
- Real-time comment updates → the refresh button is the freshness story.
- Starting a pomodoro "for" a task — the obvious eventual crossover feature;
  it touches session schema (ADR 05) and deserves its own brief → future
  **ADR: task-linked sessions**.

## Implementation outline

1. **Proxy routes** — task + comments (cursor-follow to 100), then the
   attachment proxy: allowlist check on the *parsed* URL host (**gotcha:**
   parse-then-check, never substring-match — `evil.com/?x=todoist.com`
   passes a `includes()` check), content-type sniff from response headers,
   size cap enforced while streaming (abort mid-stream past 10 MB, don't
   buffer first), redirect policy pinned. **First task: verify empirically
   whether `file_url` requires the bearer header, and record the answer in
   this ADR.**
2. **`TaskDetail` component** — header/description/comments sections,
   `useMediaQuery(sm)` choosing Modal vs Drawer around the same child.
   **Gotcha:** crossing the breakpoint while open (tablet rotation) must not
   lose state — the child owns the fetch state; the containers are dumb.
3. **Card wiring** — ADR 12's cards get `onOpen(taskId)`; pressed state
   already exists.
4. **Images** — render thumbnails where the attachment provides them, full
   file otherwise, always via the proxy; `loading="lazy"`;
   fixed aspect-ratio boxes from attachment metadata where present
   (**gotcha:** without reserved space, late-loading images shove the
   comment thread around — reserve or accept jank, we reserve).
5. **States + tests/stories/E2E block** per scope. Fixture set includes: a
   comment with an image, one with a non-image file, one text-only, 101
   comments for truncation, and the 404-gone flow.

Honest sizing: **2–2.5 days.** The image proxy with real SSRF discipline and
streaming caps is a solid half day alone; the responsive container and state
matrix are the second day; the rest is fixtures and stories.

## Acceptance criteria

- [x] Tapping a card at ≥`sm` opens a right-side drawer; below `sm` a full-screen modal; same content in both (verify by resizing across the breakpoint while open — state survives).
- [x] The detail shows plain-text title, line-break-preserving description, and comments oldest-first with timestamps.
- [x] A fixture comment with an image attachment renders the image inline, loaded from `/glu/api/todoist/attachment?...` (network panel shows same-origin only — zero requests to Todoist hosts from the browser).
- [x] A non-image attachment shows filename + type with no link; a text-only comment renders without attachment chrome.
- [x] Refresh refetches task + comments (spinner visible; stubbed change appears after refresh).
- [x] 101-comment fixture shows 100 + "showing first 100"; images lazy-load without shoving the thread (reserved space verified visually).
- [x] A 404 task (stubbed) shows the "no longer exists" state with a working close; no error screen.
- [x] The proxy rejects: a non-allowlisted host (400), a non-image content-type (400), an oversize body (aborted) — all covered by supertest, host check proven parse-based (the `?x=todoist.com` trick fails).
- [x] The server still exposes zero non-GET Todoist verbs (allowlist test extended); nothing in the detail UI mutates anything. **Superseded in the same run by ADR 20**, which adds exactly one write action to the detail (the priority circle) and two shaped verbs to the proxy — the read-only guarantee held until it was deliberately, visibly relaxed.
- [x] A running timer keeps counting while the detail is open; Escape/overlay/close all dismiss it; reload reopens nothing.
- [x] Stories cover both containers, both schemes, image/no-image/gone states; a11y contrast passes; `npm test`, `npm run build`, `npm run build-storybook` green; the ADR 09 block is active and green.
- [~] This ADR is updated at implementation with the verified answer on Todoist `file_url` auth semantics (one line, per the outline). — **[deferred → HUMAN-TODO]**; the ADR now records "unverified tonight, proxy works either way" at the top of the Decision section.

## Consequences

- The Todoist trilogy closes cleanly: identity (11) → content (12) → detail
  (13), all read-only end to end; the first write verb anywhere will be
  conspicuous in review — exactly as intended.
- The image proxy is the app's first piece of genuinely security-sensitive
  server code; the allowlist/streaming-cap pattern set here is the template
  for any future external-content fetching.
- All external content renders same-origin, which keeps a future CSP ADR
  trivial (`img-src 'self'` still holds).
- Two overlay surfaces can now stack (header drawer + detail); accepted
  as-is, watched, amendable.
- The obvious next want — starting a pomodoro from a task — is already
  named (future ADR: task-linked sessions) so it arrives as a brief, not as
  scope creep in a review comment.
