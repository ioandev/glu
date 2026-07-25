import { ImageResponse } from "next/og";
import { resolveScheme } from "@/chrome/cssVariables";
import { studioQuiet } from "@/chrome/modules";
import { NEUTRAL_CLOCK_THEME } from "@/theme/palette";
import { PAGE_META, type SiteRoute } from "@/lib/siteMetadata";

/**
 * The one Open Graph card, rendered per route at build time (ADR 30).
 *
 * Next prerenders metadata image routes, so this runs during `next build` and
 * the runtime serves a static PNG. That matters here specifically: the CSP
 * amendment (ADR 16) already made every *page* a per-request render on a
 * 512 MB container, and satori + resvg is not a cost to add on top of it.
 */

/** The size every unfurler expects; anything else gets letterboxed or cropped. */
export const OG_SIZE = { width: 1200, height: 630 } as const;
export const OG_CONTENT_TYPE = "image/png";

/**
 * Colour comes out of ADR 15's mix function, called at build with the default
 * chrome direction and the neutral palette in dark — so the card is styled
 * through the same tokens as the app and not one literal is typed here.
 *
 * Neutral rather than the default clock's palette (`halo`) on purpose: the
 * clock palette is the user's pick out of eighteen and it repaints the whole
 * site, so putting one of them on the card would advertise an option as the
 * product. The chrome direction is what stays put when the gallery moves.
 */
const c = resolveScheme(studioQuiet, NEUTRAL_CLOCK_THEME.dark, "dark");

/** `img/favicon.svg`'s viewBox — the mark is drawn, not scaled from the PNG (ADR 04). */
const MARK_VIEWBOX = "0 0 508 523";

/** The decorative ring's circumference, so the arc is a real fraction of it. */
const RING_RADIUS = 110;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

/**
 * The mark, re-inked. `favicon.svg` hardcodes `#141D2A` because it is also a
 * favicon; here it takes the resolved accent so it belongs to the card.
 */
function Mark({ size, color }: { size: number; color: string }) {
  return (
    <svg width={size} height={(size * 523) / 508} viewBox={MARK_VIEWBOX} fill="none">
      <g stroke={color} strokeLinecap="round" strokeLinejoin="round">
        <path d="M 392.93 122.41 A 206.0 206.0 0 1 0 452.0 266.8" strokeWidth="53.9" />
        <path d="M 367 267.5 L 452 267" strokeWidth="53.6" />
        <path d="M 245.5 174 L 245.5 266.5 L 295.5 315.5" strokeWidth="25.8" />
      </g>
      <g fill={color}>
        <circle cx="245.5" cy="124.7" r="13.3" />
        <circle cx="103" cy="265.3" r="13.3" />
        <circle cx="245.9" cy="409.4" r="13.3" />
      </g>
    </svg>
  );
}

/**
 * The Halo motif (ADR 07's default clock), bled off the right edge at low
 * contrast — the shape the whole app is organised around, used as ground
 * rather than as a subject.
 *
 * `SWEEP_START` is why the arc is placed rather than left at the top: with the
 * ring bled, most of the circle is outside the frame, and the obvious
 * `rotate(-90)` draws the progress arc entirely off-canvas. −75° through +33°
 * is the run that crosses the card's empty top-right and misses the copy.
 */
const SWEEP_START = -75;
const SWEEP_FRACTION = 0.3;

function ProgressRing() {
  return (
    <svg width="760" height="760" viewBox="0 0 250 250" fill="none">
      <circle
        cx="125"
        cy="125"
        r={RING_RADIUS}
        stroke={c.muted}
        strokeOpacity="0.16"
        strokeWidth="7"
      />
      <circle
        cx="125"
        cy="125"
        r={RING_RADIUS}
        stroke={c.accentFill}
        strokeWidth="7"
        strokeLinecap="round"
        strokeDasharray={RING_CIRCUMFERENCE}
        strokeDashoffset={RING_CIRCUMFERENCE * (1 - SWEEP_FRACTION)}
        // A `<circle>` path starts at 3 o'clock, so the offset is −90.
        transform={`rotate(${SWEEP_START - 90} 125 125)`}
      />
    </svg>
  );
}

/**
 * Renders the card for a route.
 *
 * **No `fontFamily` is named anywhere below.** GLU's three faces are loaded by
 * `next/font`, which stores them as WOFF2, and satori cannot parse WOFF2 —
 * naming one would silently fall back mid-render. The card is set entirely in
 * `next/og`'s bundled face, so it leans on size, tracking and colour for
 * hierarchy rather than on weight (ADR 30).
 */
export function renderSocialCard(route: SiteRoute) {
  const { heading, blurb } = PAGE_META[route];

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          position: "relative",
          background: c.pageBg,
          padding: "76px 84px",
        }}
      >
        {/*
          Absolutely positioned so it cannot push the copy around. The offsets
          are chosen against `SWEEP_START`: the ring bleeds off the bottom and
          the right, but both ends of the accent arc stay inside the frame —
          a progress arc clipped at one end reads as a mistake.
        */}
        <div style={{ display: "flex", position: "absolute", top: -30, right: -180 }}>
          <ProgressRing />
        </div>

        <div style={{ display: "flex", alignItems: "center" }}>
          <Mark size={62} color={c.accentFill} />
          <div
            style={{
              display: "flex",
              marginLeft: 22,
              fontSize: 34,
              letterSpacing: "0.34em",
              color: c.pageFg,
            }}
          >
            GLU
          </div>
        </div>

        {/*
          620, not "as wide as it fits": the copy column and the ring have to
          be able to coexist, and the accent arc's near end comes down to
          x≈677. A wider column puts a bright stroke through the headline.
        */}
        <div style={{ display: "flex", flexDirection: "column", maxWidth: 620 }}>
          <div
            style={{
              display: "flex",
              fontSize: 74,
              lineHeight: 1.1,
              letterSpacing: "-0.015em",
              color: c.pageFg,
            }}
          >
            {heading}
          </div>
          <div
            style={{
              display: "flex",
              marginTop: 26,
              fontSize: 30,
              lineHeight: 1.45,
              color: c.muted,
            }}
          >
            {blurb}
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center" }}>
          <div style={{ display: "flex", width: 54, height: 4, background: c.accentFill }} />
          <div
            style={{
              display: "flex",
              marginLeft: 22,
              fontSize: 26,
              letterSpacing: "0.08em",
              color: c.accentText,
            }}
          >
            ioan.dev/glu
          </div>
        </div>
      </div>
    ),
    OG_SIZE,
  );
}
