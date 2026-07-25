import type { ReactNode } from "react";

/**
 * GLU's pitch (ADR 31) — **one document, rendered by two surfaces**: the
 * `/glu/welcome` route and the first-visit gate on `/glu`. Both import this
 * module, so the page a stranger is linked to and the page a first-time
 * visitor is shown are the same sentences.
 *
 * The same house rules as the manual (ADR 29): written for the person holding
 * the tablet, and ADR numbers never appear in the copy.
 *
 * One rule beyond those, and it is the reason this file stays short: **state no
 * number or default the manual does not also state.** "Eighteen clock designs"
 * and the six environment chips are safe because `DocsSections` says them too;
 * a preset list, a hotkey or an undo window here would be a second place to
 * forget when it changes. The pitch says what GLU *is*. The manual says how it
 * works, and the link at the bottom of this page is how you get there.
 */

export const WELCOME_EYEBROW = "Pomodoro and focus timer";

export const WELCOME_HEADLINE = "A focus timer for the tablet on your desk.";

export const WELCOME_SUB =
  "Pick a length, press start, and work until the clock runs out. GLU keeps the record on the device you focused on — no account, no sign-up, nothing to configure before it is useful.";

/** The label on the button that ends the visit to this page, in both frames. */
export const WELCOME_CTA = "Start focusing";

export interface WelcomeFeature {
  title: string;
  body: ReactNode;
}

export const welcomeFeatures: WelcomeFeature[] = [
  {
    title: "The clock is the page",
    body: (
      <>
        The timer takes the whole left half of a tablet, big enough to read from
        across a room. Swipe it and you flip through <b>eighteen clock designs</b>,
        each with its own palette — and the one you land on recolours everything
        around it, in dark and light.
      </>
    ),
  },
  {
    title: "It notices how you worked",
    body: (
      <>
        Six chips — <b>music, podcast, TV, silence, noise, headphones</b> — record
        the room you focused in. It takes one tap, and it turns a pile of
        identical sessions into something you can actually read back.
      </>
    ),
  },
  {
    title: "Your record stays yours",
    body: (
      <>
        Sessions are counted per day and kept in <b>this browser</b>. There is no
        account to make, no server holding a copy, and no analytics watching you
        work. Clearing your browser data is all it takes to erase GLU.
      </>
    ),
  },
  {
    title: "Todoist, only if you want it",
    body: (
      <>
        Connect Todoist and you can pin the task you are working on, then let GLU
        post the time to it as a comment when the run ends. Skip it and every
        other part of GLU works exactly the same.
      </>
    ),
  },
];

export const welcomeFootnote = (
  <>
    GLU is free and open source, and it installs to a home screen like an app. It
    is <b>not</b> an offline app, though — installed or not, it needs a connection
    to start.
  </>
);
