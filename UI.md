# GLU — UI design brief

A brief for designing the GLU page: a tablet-first pomodoro / focus tracker
with Todoist integration, served at `ioan.dev/glu`. This document lists every
element on the page, how I want it structured, and what is fixed vs. open.
Functional truth lives in `docs/adr/` (referenced as ADR NN); if this brief
and an ADR disagree, the ADR wins and this file gets fixed.

## The two canvases

- **Tablet** (~1180 px landscape, breakpoint ≥ 48em): everything on one
  screen, **no page scroll**.
- **Half-tablet / phone** (~590 px, below 48em): the clock owns the **first
  full viewport** (100dvh); everything else stacks below it and the page
  scrolls. (ADR 08)

Both must work in **dark and light**, and on top of that the **active clock
design recolors the whole page** (background + text accents from its
palette — every clock × 2 schemes; the roster's size lives in `CLOCK_COUNT`
and nowhere else, ADR 42). Chrome sits on neutral
surface tokens so it stays legible on all of them. (ADRs 02, 07, 08)

Every interactive element: **≥ 44 px** touch target. This is used with
fingers, sometimes mid-focus, sometimes half-asleep.

## Tablet layout (≥ 48em)

```
┌────────────────────────────────┬─────────────────────────────────┐
│                                │  Todoist area          [▸ arrow]│
│   preset row: 5 10 15 20 30    │  ┌ account chip · tools icon ┐  │
│              45 60             │  ┌───────────────────────[42m]┐ │
│                                │  │ FOCUSED TASK card          │ │
│        ┌───────────┐           │  └────────────────────────────┘ │
│        │           │           │  ┌────────────────────────────┐ │
│        │   CLOCK   │           │  │ task card  ○ title…    [◎] │ │
│        │  (gallery │           │  │ task card  ○ title…    [◎] │ │
│        │  ‹ swipe ›)           │  │ …internal scroll…          │ │
│        │           │           │  └────────────────────────────┘ │
│        └───────────┘           │                                 │
│                                │                                 │
│      [ Start ] [ Stop ]        │                                 │
│      [+1] [+5] [−1] [−5]       │  environment toggles            │
│                                │  (Music)(Podcast)(TV)           │
│   session dots ●●●○ · New day  │  (Silence)(Noisy)(Headphones)   │
│   [show sessions ⇄]            │                                 │
└────────────────────────────────┴─────────────────────────────────┘
                    ░ undo bar slides up bottom-center ░
```

### Left half — the timer (ADRs 02, 05, 08)

1. **Preset row** (top): 5 / 10 / 15 / 20 / 30 / 45 / 60 minutes. Wrapping
   row of toggle-style buttons; selected one visibly active. Tapping sets
   the timer, even mid-run. **Plus an eighth, transient rung** (ADR 32): when
   ± has been used with no run in flight, the resulting length joins the row
   *in sorted position*, looking exactly like a preset, and stays selected
   until a preset is tapped. Anything assuming seven buttons is wrong.
2. **The clock** — the hero. One of a **fixed roster of clock designs**
   (ADR 07: Halo, Meridian, Broadside, Aurora, Mono, Stack, Orbit, Field,
   Eclipse, Grid, Terminal, Sunset, Pill, Tide, Split-flap, Radar, Bauhaus,
   Edge; ADR 42 adds Hourglass, Segment, Meter, Nixie, Nest, Lunar, Candle,
   Steps, LCD, Spiral, Soft, Glass, Comet, Barcode, Cell, Wedge, Words,
   Prism, Pixels, Tempo, Mercury, Ghost; ADR 45 adds a third sheet of
   forty-six more, drawn as stopwatches and re-pointed at a countdown).
   **How many there are is `CLOCK_COUNT`, derived from the registry — never
   write the number down.**
   **These designs are already specified — do not restyle them**
   (`docs/design/clocks/` is their spec). Design *around* them: the gallery
   affordance is horizontal swipe plus chevrons flanking the clock — and the
   chevrons are **tablet-only, resting at 10% opacity** (full on hover/focus);
   below 48em there are none and a one-time dismissible hint says "swipe the
   clock to switch designs" instead (ADR 08 amendment). Flips **slide in the
   direction of travel**, clipped to the clock slot (ADR 25). Default clock:
   Halo.
3. **Transport controls** (ADR 37): two buttons — a primary that reads
   **Start** when idle or finished, **Pause** while running and **Resume**
   when paused, plus **Stop**. The biggest touch targets on the page, and
   neither is ever disabled. Keyboard equivalents exist (ADR 06: s, p, n,
   Ctrl+C); Stop carries its shortcut in a tooltip, and the primary does too
   in running/paused.
4. **Adjust row**: +1 / +5 / −1 / −5 minutes.
5. **Session strip**: one dot per completed session today (cap 12, then
   "+N"), a count, and a **"New day"** button that asks for confirmation in
   a small popover before resetting to zero. Next to it, a small
   **"show sessions" switch** controlling whether the clock displays the
   session count. (ADRs 05, 07, 08)

Timer states to design: **idle, running, paused, finished** (00:00,
visually distinct, silent), plus the time text never jittering
(tabular numerals).

### Right half

**Top-right region — Todoist** (ADRs 11–14):

- **Logged out**: only a **"Log in with Todoist"** button — Todoist brand
  treatment (their red, official logo, per their brand rules). Nothing else
  in the region.
- **Logged in**, header row: compact **account chip** (name; tap → tiny menu
  with Log out) + a **refresh icon** (spins while the list revalidates;
  disabled until a source is picked) + a **tools icon** opening the **source
  picker**: segmented Filter | Label | Project + a searchable select. The
  picker is a **popover** at/above 48em and a **near-full-screen modal**
  below it (ADR 12 amendment) — see Overlays.
- **Focused task slot** (above the list): one pinned task card with a
  corner **time badge** (`[42m]`, or `[2h 5m]`, clamped display `[28d]`),
  an unfocus affordance, and a quiet pending-upload badge when a time
  comment is waiting. Same anatomy as a list card — priority circle, title,
  and the description clamped to **two** lines when the task has one (ADR 14
  amendment, f). Gone-state when the task vanished upstream.
- **Task list**: Todoist-look cards — **priority circle** left (P1 red,
  P2 orange, P3 blue, P4 neutral — Todoist's colors, fixed), plain-text
  title, one ellipsized description line only when present, and a small
  **focus button** per card. Project sources show **section headers** in
  order, no-section tasks first. List scrolls **internally**; shows
  "showing first 200" when truncated. Each section honours the **item
  ceiling** (ADR 39, Settings → Tasks; All by default) and shows a tappable
  `+N more` when it has one — muted list typography, never a card. Empty state: a one-line hint pointing
  at the tools icon.

**Bottom-right — environment toggles** (ADR 02): six chips — Music,
Podcast, TV, Silence, Noisy, Headphones. Silence untoggles Music/Podcast/
TV/Noisy (Headphones is independent). Big, thumb-friendly, state obvious at
a glance in both schemes.

**Extreme top-right corner** (ADR 10): a small **chevron arrow** — the only
permanently visible chrome. It opens the **header drawer**.

## Overlays

- **Header drawer** (ADR 10): slides in from the right; contains GitHub
  link (icon + label), dark/light toggle row, **Docs row** (ADR 29) and
  Settings row. Settings opens
  a **near-full-size modal** (full-screen below 48em) laid out as a
  **section list** (ADR 19): **Language** (ADR 44) — deliberately the **first**
  section, because it is the one setting a reader might need while unable to
  read the rest. A `Select` rather than a ladder, and the only settings row that
  is not a `SegmentedControl`: seven options (Automatic, then English, Español,
  简体中文, Français, Português, Deutsch) do not fit one row on a half-tablet, and
  a language is scanned for rather than compared. **Automatic** is the default
  and follows the browser; the endonyms are never translated. Choosing one
  re-renders the whole app — chrome, timer, Todoist, `<html lang>` and the
  `<title>` — without a reload — **Todoist** — account name + Log out, or the
  branded login when logged out — **Tasks** (ADR 39) — one **"Limit the items
  in a section to" ladder** (10 / 20 / 50 / 100 / All, **All** by default; a
  section past the ceiling shows a tappable `+N more`, which lifts it for that
  visit only) — **Screen** (ADR 17 amendment) — two
  switches, "Stay awake on the website" (off by default) and "Stay awake
  when the timer is running" (on) — **Alerts** (ADR 40) — a **nine-button sound
  grid** (Chime by default, then Bell, Wood, Rise, Settle, Pulse, Digital,
  Glass, Deep; two columns below 48em, three above) over a **"How long it
  plays" ladder** (Once by default, then 3 / 5 / 10 / 20 s); **every tap here
  previews the real thing** — selected sound, selected length — any tap cancels
  the previous preview, tapping the playing sound stops it, and closing
  Settings stops it too; the playing button carries an inset ring on the accent
  fill — and **Time comments** — a **"Minimum time
  to log" ladder** (ADR 28: 1 / 2 / 5 / 10 / 15 min, 1 min by default; a run
  shorter than the chosen rung posts no comment) above one
  switch, "Say how you worked" (on, ADR 27), itself above **two live previews** of the
  comment GLU will post, decorated and plain, composed from the current
  environment toggles; the active one carries the accent border and a
  `Now` marker, the other is quieter but never dimmed. With no toggles on,
  the decorated one **borrows a Music + Headphones sample** and is marked
  `Example` instead — a preview that shows nothing teaches nothing, but
  borrowed words are always labelled as borrowed. Sized for the sections
  still to come; a closing dimmed line names them. Below the four action rows, a
  **legal footer** (ADR 26): "Privacy Policy" and "Terms of Service", text
  weight rather than the row treatment — references, not actions — each
  ≥44 px and opening in a new tab.
- **Docs modal** (ADR 29): the Docs row opens the manual in **Settings' twin**
  — same near-full-size modal, full-screen below 48em — rather than navigating
  to `/glu/docs`. Documentation is looked up mid-session, and leaving the tab
  tears down the wake lock, the primed audio context and the notification
  gesture, while a same-tab navigation would also hide a running timer. The
  body is the same document the route renders (one section array, two frames),
  closing with a **"Docs navigation"** footer: "Privacy Policy", "Terms of
  Service", "Open as a page" — all three ≥44 px, all three opening in a new
  tab. One Escape closes the modal *and* the drawer behind it, exactly as
  Settings does.
- **Source picker** (ADR 12 amendment): the tools icon opens a **popover**
  (280 px, searchable select) at/above 48em; below it, a centred **modal
  ~90 % wide × 88 dvh tall** with the same segmented Filter | Label | Project
  over a **search field and an always-open list** of 48 px rows, scrolling
  internally, the current source marked. Picking closes it.
- **Task detail** (ADR 13): tapping a task card → **right-side drawer** on
  tablet (~420 px), **full-screen modal** below 48em. Contents: title,
  refresh button, description (plain text, line breaks kept), comments
  oldest-first with timestamps, **images inline in comments** (reserved
  space, lazy-loaded), "showing first 100" truncation, gone-task state.
  Read-only — no action buttons anywhere.
- **Undo bar** (ADR 14): slides up from bottom-center after a timer run
  ends with >1 minute on a focused task, and stays up for ~7 s across two
  phases — "[5m] comment will be added · **Undo**" for the first 2 s, then
  "[5m] comment added · **Undo**" for 5 s more once the post lands. One bar,
  one badge, one position: the text changes, the bar does not reappear.
  Compact: must not cover the environment toggles or transport controls even
  at 590 px.
- **New day confirmation** (ADR 05): small popover, confirm/cancel.

Overlays can stack (header drawer + task detail is legal). A running timer
is always visible/running behind them where the layout allows. Every
drawer/modal header is **sticky and opaque** — the panel's own surface token,
so the body scrolls *beneath* the title, never through it (ADR 29 amendment).

## Phone layout (below 48em)

Stacking order, top to bottom (ADRs 08, 11):

1. **Clock — full first viewport** (100dvh), **full-bleed**: edge to edge,
   no padding, no width cap, square corners, and **no chevrons** — the swipe
   is the only flip, taught once by a dismissible hint pinned to the top of
   the clock (= the top of the page). The corner arrow is still top-right,
   and takes a token surface here because it now sits on clock paint
   (ADR 08 amendment). A **down arrow rides the bottom edge** of that
   viewport — the fold's only tell that items 2–4 exist. It is inert (the
   slot is a swipe surface) and **retires on the first run**, permanently:
   you cannot have started a timer without having found the transport
   controls below (ADR 08 amendment).
2. Timer controls block (presets, transport, adjust, session strip).
3. Todoist block (login button / header row + focused slot + list, list
   height capped with internal scroll).
4. Environment toggles.

Task detail becomes a full-screen modal here, and the source picker a
near-full-screen one; the undo bar stays bottom-center.

## The first visit (ADR 31)

`/glu` is the app for everybody who has been here before, and a **welcome** for
everybody who has not: hero line, one sentence of what GLU is, four feature
cards, and a single accented **"Start focusing"** button — the largest touch
target on the page. Pressing it swaps the welcome for the shell in place, and
the choice is remembered, so it is seen **once per browser**. Nothing else on
the page competes with that button; there is exactly one thing to do.

Two things follow from it being a gate rather than a screen. It is **not the app
shell**, so it scrolls at every width like the documents below — the no-scroll
contract belongs to the shell. And it renders **nothing at all** until the
browser has answered "has this person been here", because the alternative is a
flash of a marketing page in front of the timer on every single load.

The same document is also a **route, `/glu/welcome`** — server-rendered, so it
can be linked, shared and unfurled with a card (ADR 30). Its copy lives once and
is rendered by both, so the two can never drift. Entering from there navigates;
entering from the gate does not.

## Document pages (ADRs 26, 29, 31)

`/glu/welcome`, `/glu/privacy`, `/glu/terms` and `/glu/docs` — the app's only
other screens. The legal pair is reached from the drawer's legal footer, always
in a new tab; the manual is reached from the drawer as a **modal** (see
Overlays), and its route exists so it can be linked and shared. The welcome is
reached from every document footer, which is what keeps it available to someone
who walked past it. None of them is the app shell, so all four **scroll** at
every width — the 100dvh no-scroll contract belongs to the shell, not to the
origin. Styling is chrome tokens only, so all four follow the active direction
and scheme like everything else, and each ends with a footer linking to its
siblings, back to GLU, and to the repository.

The three **prose** documents — privacy, terms, the manual — share one
treatment: a single centred column (max ~72ch), long-form text, surface cards
for the intro and the data list, `--glu-muted` for secondary text. Editing that
treatment restyles all three at once. The welcome is the exception and owns its
own sheet: a wider column (~60rem) carrying a centred hero and a card grid that
goes two-up at 48em, which is not a shape the prose column has.

The manual (ADR 29) is **one page** — no sub-routes, no sidebar, no search;
find-in-page is the search. Its copy lives once and is rendered by both the
route and the modal, so the two can never drift.

## The social card (ADR 30)

Every route has a 1200×630 Open Graph card, generated at build from one
renderer — the mark and a spaced "GLU" top-left, the page's heading and a
one-line blurb in a 620px column, `ioan.dev/glu` on an accent rule at the
bottom, and the Halo progress ring bleeding off the right edge.

It is the **only** GLU surface that cannot switch chrome or clock, because it
is a static PNG. So it is fixed to the identity that does not move: the default
chrome direction (Studio Quiet) in dark, mixed with the *neutral* palette
rather than any one of the clock palettes. Every colour still comes out of
ADR 15's `resolveScheme`, called at build — a literal here is the same review
defect it is anywhere else. It is set in `next/og`'s bundled face, not GLU's
three: satori cannot read the WOFF2 that `next/font` produces, so the card
carries hierarchy with size, tracking and colour instead of weight.

Card copy and the page description are the same claim at two widths, and they
live in one table (`web/src/lib/siteMetadata.ts`). A page whose description
changes without its blurb is the drift that table exists to prevent.

## Fixed constraints (not design-negotiable)

- The clock designs and their palettes (ADRs 07, 42) — design the chrome to
  survive them, not the other way around.
- Todoist brand button and priority colors — theirs, not ours.
- Dark/light parity everywhere; no flash on load; scheme toggle lives in
  the header drawer.
- ≥ 44 px touch targets; no horizontal page scroll ever; no page scroll at
  all on tablet.
- Fonts: Space Grotesk, IBM Plex Mono, Archivo Black (self-hosted — they
  come with the clock designs).
- Icons: Tabler set (plus the official Todoist mark).
- No sound, no notifications (deferred by ADR 04).

## Open canvas — RESOLVED (2026-07-24)

Claude Design answered this brief with three chrome directions —
**Studio Quiet** (safe: soft surfaces, hairlines, rounded), **Instrument**
(square, ruled, mono, zero elevation), **Poster** (2px ink, pills, offset
shadows, Archivo Black) — now governed by **ADR 15** and specced in
`docs/design/chrome/`. All three ship as switchable modules (default:
Studio Quiet); chrome personality, surface tokens, and overlay styling are
decided there. Still open for future design passes:

- Empty states (no source picked, empty project, logged out) — currently
  one-liners; make them feel intentional.
- Loading skeletons for task cards, detail view, and totals badge.
- The focused-task card treatment exists per-direction in the mockups;
  refinements go through ADR 15's token contract.

## Optional (nice-to-have, explicitly not required)

- Palette crossfade when flipping the gallery — the repaint is instant and
  leads the slide (ADR 25 ships the clock's directional slide; blending the
  ADR 15 token layer along with it is deliberately still open).
- Split-flap digit flip animation (ADR 07 ships static digits).
- A lightbox for comment images (ADR 13 ships inline only).
- A position indicator for the clock gallery (ADR 08 deliberately
  shipped none — bring evidence it's needed).
- Empty-state illustrations, micro-interactions on session dots, a nicer
  "+N" overflow treatment.
- A richer treatment for the settings section list — it carries four
  sections today (Todoist, Tasks, Screen, Time comments) and grows one row per ADR
  amendment; the skeleton is deliberately plain until it has enough rows to
  design against. ADR 27's preview pair is the first content in there worth
  designing around, and ADR 28's ladder is the first row that is not a
  switch — the pair of them is most of a design brief already.

If a design idea requires new behavior (new states, new data, new
gestures beyond what's here), it needs an ADR first — flag it rather than
designing it in.
