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
palette — 18 clocks × 2 schemes = 36 combinations). Chrome sits on neutral
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
│   [ Start ] [ Pause ] [ Stop ] │                                 │
│      [+2] [+5] [−2] [−5]       │  environment toggles            │
│                                │  (Music)(Podcast)(TV)           │
│   session dots ●●●○ · New day  │  (Silence)(Noisy)(Headphones)   │
│   [show sessions ⇄]            │                                 │
└────────────────────────────────┴─────────────────────────────────┘
                    ░ undo bar slides up bottom-center ░
```

### Left half — the timer (ADRs 02, 05, 08)

1. **Preset row** (top): 5 / 10 / 15 / 20 / 30 / 45 / 60 minutes. Wrapping
   row of toggle-style buttons; selected one visibly active. Tapping sets
   the timer, even mid-run.
2. **The clock** — the hero. One of **18 fixed clock designs** (ADR 07:
   Halo, Meridian, Broadside, Aurora, Mono, Stack, Orbit, Field, Eclipse,
   Grid, Terminal, Sunset, Pill, Tide, Split-flap, Radar, Bauhaus, Edge).
   **These designs are already specified — do not restyle them**
   (`docs/design/clocks/` is their spec). Design *around* them: the gallery
   affordance is quiet chevrons flanking the clock + horizontal swipe,
   wrapping at the ends, and the flip **slides in the direction of travel**,
   clipped to the clock slot (ADR 25). Default clock: Halo.
3. **Transport controls**: Start / Pause / Stop — the biggest touch targets
   on the page. Keyboard equivalents exist (ADR 06: s, p, n, Ctrl+C);
   Stop and Pause buttons carry their shortcut in a tooltip.
4. **Adjust row**: +2 / +5 / −2 / −5 minutes.
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
  disabled until a source is picked) + a **tools icon** opening a popover:
  segmented Filter | Label | Project + a searchable select.
- **Focused task slot** (above the list): one pinned task card with a
  corner **time badge** (`[42m]`, or `[2h 5m]`, clamped display `[28d]`),
  an unfocus affordance, and a quiet pending-upload badge when a time
  comment is waiting. Gone-state when the task vanished upstream.
- **Task list**: Todoist-look cards — **priority circle** left (P1 red,
  P2 orange, P3 blue, P4 neutral — Todoist's colors, fixed), plain-text
  title, one ellipsized description line only when present, and a small
  **focus button** per card. Project sources show **section headers** in
  order, no-section tasks first. List scrolls **internally**; shows
  "showing first 200" when truncated. Empty state: a one-line hint pointing
  at the tools icon.

**Bottom-right — environment toggles** (ADR 02): six chips — Music,
Podcast, TV, Silence, Noisy, Headphones. Silence untoggles Music/Podcast/
TV/Noisy (Headphones is independent). Big, thumb-friendly, state obvious at
a glance in both schemes.

**Extreme top-right corner** (ADR 10): a small **chevron arrow** — the only
permanently visible chrome. It opens the **header drawer**.

## Overlays

- **Header drawer** (ADR 10): slides in from the right; contains GitHub
  link (icon + label), dark/light toggle row, Settings row. Settings opens
  a modal (placeholder content for now — design the empty shell).
- **Task detail** (ADR 13): tapping a task card → **right-side drawer** on
  tablet (~420 px), **full-screen modal** below 48em. Contents: title,
  refresh button, description (plain text, line breaks kept), comments
  oldest-first with timestamps, **images inline in comments** (reserved
  space, lazy-loaded), "showing first 100" truncation, gone-task state.
  Read-only — no action buttons anywhere.
- **Undo bar** (ADR 14): slides up from bottom-center after a timer run
  ends with >1 minute on a focused task — "[5m] comment will be added ·
  **Undo**" — visible ~10 s, then gone. Compact: must not cover the
  environment toggles or transport controls even at 590 px.
- **New day confirmation** (ADR 05): small popover, confirm/cancel.

Overlays can stack (header drawer + task detail is legal). A running timer
is always visible/running behind them where the layout allows.

## Phone layout (below 48em)

Stacking order, top to bottom (ADRs 08, 11):

1. **Clock — full first viewport** (100dvh), gallery swipe/chevrons intact,
   corner arrow still top-right.
2. Timer controls block (presets, transport, adjust, session strip).
3. Todoist block (login button / header row + focused slot + list, list
   height capped with internal scroll).
4. Environment toggles.

Task detail becomes a full-screen modal here; the undo bar stays
bottom-center.

## Fixed constraints (not design-negotiable)

- The 18 clock designs and their palettes (ADR 07) — design the chrome to
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
- A position indicator for the 18-clock gallery (ADR 08 deliberately
  shipped none — bring evidence it's needed).
- Empty-state illustrations, micro-interactions on session dots, a nicer
  "+N" overflow treatment.
- Anything for the future settings modal content — it's an empty shell
  today and will get its own brief.

If a design idea requires new behavior (new states, new data, new
gestures beyond what's here), it needs an ADR first — flag it rather than
designing it in.
